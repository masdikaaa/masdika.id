"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Globe,
  Radio,
  Crosshair,
  Zap,
  Activity,
  Flame,
  ShieldCheck,
  Layers,
  Lock,
  Play,
  Pause,
  CheckCircle2,
  Compass,
  AlertTriangle,
  Server,
  Radar,
  Filter,
  RefreshCw,
  Maximize2,
  Terminal,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { worldPaths, indonesiaRegionPaths } from "@/data/threat-map-geo";

interface AttackEvent {
  id: string;
  timestamp: string;
  attackName: string;
  sourceCity: string;
  sourceCountry: string;
  sourceCode: string;
  sourceIp: string;
  sourceCoords: [number, number]; // [lat, lng]
  targetCity: string;
  targetCountry: string;
  targetCode: string;
  targetCoords: [number, number];
  severity: 'Critical' | 'High' | 'Medium';
  protocol: 'TCP' | 'UDP' | 'HTTPS' | 'SSH';
  port: number;
  mitigation: string;
  isReal: boolean;
}

interface ActiveLaser {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  progress: number;
  color: string;
  severity: string;
  sourceCity: string;
  sourceCode: string;
  targetCity: string;
  targetCode: string;
  attackName: string;
  isReal: boolean;
  sourceIp?: string;
}

interface ImpactRipple {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  opacity: number;
}

interface HoveredCountryInfo {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
}

// Alpha-3 to Alpha-2 code mapping for high-res FlagCDN flags
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  AFG: 'af', AGO: 'ao', ALB: 'al', ARE: 'ae', ARG: 'ar', ARM: 'am', AUS: 'au', AUT: 'at', AZE: 'az',
  BDI: 'bi', BEL: 'be', BEN: 'bj', BFA: 'bf', BGD: 'bd', BGR: 'bg', BHS: 'bs', BIH: 'ba', BLR: 'by',
  BLZ: 'bz', BOL: 'bo', BRA: 'br', BRN: 'bn', BTN: 'bt', BWA: 'bw', CAF: 'cf', CAN: 'ca', CHE: 'ch',
  CHL: 'cl', CHN: 'cn', CIV: 'ci', CMR: 'cm', COD: 'cd', COG: 'cg', COL: 'co', CRI: 'cr', CUB: 'cu',
  CYP: 'cy', CZE: 'cz', DEU: 'de', DJI: 'dj', DNK: 'dk', DOM: 'do', DZA: 'dz', ECU: 'ec', EGY: 'eg',
  ERI: 'er', ESP: 'es', EST: 'ee', ETH: 'et', FIN: 'fi', FJI: 'fj', FRA: 'fr', GAB: 'ga', GBR: 'gb',
  GEO: 'ge', GHA: 'gh', GIN: 'gn', GMB: 'gm', GNB: 'gw', GNQ: 'gq', GRC: 'gr', GTM: 'gt', GUY: 'gy',
  HND: 'hn', HRV: 'hr', HTI: 'ht', HUN: 'hu', IDN: 'id', IND: 'in', IRL: 'ie', IRN: 'ir', IRQ: 'iq',
  ISL: 'is', ISR: 'il', ITA: 'it', JAM: 'jm', JOR: 'jo', JPN: 'jp', KAZ: 'kz', KEN: 'ke', KGZ: 'kg',
  KHM: 'kh', KOR: 'kr', KWT: 'kw', LAO: 'la', LBN: 'lb', LBR: 'lr', LBY: 'ly', LKA: 'lk', LSO: 'ls',
  LTU: 'lt', LUX: 'lu', LVA: 'lv', MAR: 'ma', MDA: 'md', MDG: 'mg', MEX: 'mx', MKD: 'mk', MLI: 'ml',
  MMR: 'mm', MNE: 'me', MNG: 'mn', MOZ: 'mz', MRT: 'mr', MWI: 'mw', MYS: 'my', NAM: 'na', NER: 'ne',
  NGA: 'ng', NIC: 'ni', NLD: 'nl', NOR: 'no', NPL: 'np', NZL: 'nz', OMN: 'om', PAK: 'pk', PAN: 'pa',
  PER: 'pe', PHL: 'ph', PNG: 'pg', POL: 'pl', PRK: 'kp', PRT: 'pt', PRY: 'py', QAT: 'qa', ROU: 'ro',
  RUS: 'ru', RWA: 'rw', SAU: 'sa', SDN: 'sd', SEN: 'sn', SGP: 'sg', SLE: 'sl', SLV: 'sv', SOM: 'so',
  SRB: 'rs', SSD: 'ss', SUR: 'sr', SVK: 'sk', SVN: 'si', SWE: 'se', SWZ: 'sz', SYR: 'sy', TCD: 'td',
  TGO: 'tg', THA: 'th', TJK: 'tj', TKM: 'tm', TLS: 'tl', TTO: 'tt', TUN: 'tn', TUR: 'tr', TWN: 'tw',
  TZA: 'tz', UGA: 'ug', UKR: 'ua', URY: 'uy', USA: 'us', UZB: 'uz', VEN: 've', VNM: 'vn', YEM: 'ye',
  ZAF: 'za', ZMB: 'zm', ZWE: 'zw',
};

// Centroid coordinates [lat, lng] for instant precision auto-zoom on country click
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  ID: [-2.5, 118.0], IDN: [-2.5, 118.0],
  DE: [51.1, 10.4], DEU: [51.1, 10.4],
  US: [39.0, -98.0], USA: [39.0, -98.0],
  IT: [41.9, 12.5], ITA: [41.9, 12.5],
  JP: [36.2, 138.2], JPN: [36.2, 138.2],
  IS: [64.9, -18.5], ISL: [64.9, -18.5],
  ZA: [-29.0, 24.0], ZAF: [-29.0, 24.0],
  DK: [56.2, 9.5], DNK: [56.2, 9.5],
  CA: [56.0, -106.0], CAN: [56.0, -106.0],
  FR: [46.6, 2.2], FRA: [46.6, 2.2],
  NL: [52.1, 5.3], NLD: [52.1, 5.3],
  AT: [47.5, 14.5], AUT: [47.5, 14.5],
  RU: [60.0, 90.0], RUS: [60.0, 90.0],
  CN: [35.0, 104.0], CHN: [35.0, 104.0],
  IN: [20.5, 78.9], IND: [20.5, 78.9],
  BR: [-14.2, -51.9], BRA: [-14.2, -51.9],
  AU: [-25.2, 133.7], AUS: [-25.2, 133.7],
  TR: [39.0, 35.2], TUR: [39.0, 35.2],
  PL: [52.0, 19.1], POL: [52.0, 19.1],
  MX: [23.6, -102.5], MEX: [23.6, -102.5],
  SG: [1.35, 103.8], SGP: [1.35, 103.8],
  GB: [54.0, -2.5], GBR: [54.0, -2.5],
  KR: [36.5, 127.8], KOR: [36.5, 127.8],
};

// Crisp, standardized rectangular country flag (FortiGuard Threat Map style)
function CountryFlag({ code, className }: { code: string; className?: string }) {
  const safeCode = (code || 'ID').toLowerCase().trim();
  if (safeCode === 'sec' || safeCode === 'gl' || safeCode.length !== 2) {
    return (
      <span className={cn("inline-flex items-center justify-center px-1 py-0.5 rounded-[2px] bg-cyan-950/60 border border-cyan-500/30 text-[8px] font-mono font-bold text-cyan-400", className)}>
        {code ? code.slice(0, 2).toUpperCase() : 'ID'}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/24x18/${safeCode}.png`}
      srcSet={`https://flagcdn.com/48x36/${safeCode}.png 2x`}
      width={16}
      height={12}
      alt={code}
      loading="lazy"
      className={cn(
        "inline-block w-4 h-3 rounded-[2px] object-cover border border-slate-300 dark:border-slate-700 shadow-sm shrink-0",
        className
      )}
      onError={(e) => {
        (e.target as HTMLElement).style.display = 'none';
      }}
    />
  );
}

// Convert real [lat, lng] to tactical 1000x500 canvas coordinates matching the geo dataset
function projectCoords(lat: number, lng: number, mode: 'world' | 'indonesia'): [number, number] {
  if (mode === 'indonesia') {
    // Indonesian Archipelago Coordinate Bounding Box (matches threat-map-geo.ts)
    const minLng = 94;
    const maxLng = 142;
    const minLat = -12;
    const maxLat = 7;

    // Check if coordinates belong to Indonesia / immediate region
    const isInsideRegion = lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;

    if (isInsideRegion) {
      const x = ((lng - minLng) / (maxLng - minLng)) * 1000;
      const y = ((maxLat - lat) / (maxLat - minLat)) * 500;
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    }

    // Inbound Foreign Attack in Indonesia View (FortiGuard Style incoming laser trajectory)
    // Map incoming attacks smoothly from the outer perimeter (North/West/East/South)
    if (lng < 60) {
      // European / Russian / African incoming: enter from upper-left sky
      const x = Math.min(280, Math.max(30, 140 + (lng - 10) * 2));
      return [Math.round(x), -25];
    } else if (lng > 135 || lng < -40) {
      // Americas / East Pacific incoming: enter from upper-right sky
      const x = Math.min(960, Math.max(720, 840 + (lat - 20) * 3));
      return [Math.round(x), -25];
    } else if (lat > 15) {
      // East Asian / Chinese / Japanese incoming: enter from top-center sky
      const x = Math.min(700, Math.max(380, 520 + (lng - 110) * 3));
      return [Math.round(x), -25];
    } else {
      // Australian / Southern incoming: enter from bottom
      const x = Math.min(850, Math.max(400, 550 + (lng - 115) * 3));
      return [Math.round(x), 525];
    }
  }

  // World Mercator Tactical Projection (matches threat-map-geo.ts)
  const x = ((lng + 180) / 360) * 1000;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 250 - (500 * mercN) / (2 * Math.PI);
  return [
    Math.round(x * 10) / 10,
    Math.round(Math.max(15, Math.min(485, y)) * 10) / 10,
  ];
}

export default function ThreatMapPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Indonesia Focus is the primary default view as requested by user
  const [region, setRegion] = useState<'indonesia' | 'world'>('indonesia');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [attacks, setAttacks] = useState<AttackEvent[]>([]);
  const [lasers, setLasers] = useState<ActiveLaser[]>([]);
  const [impacts, setImpacts] = useState<ImpactRipple[]>([]);
  const [recentLiveAlert, setRecentLiveAlert] = useState<AttackEvent | null>(null);

  // Country Vector Hover State (FortiGuard Style Country Highlight & Tooltip)
  const [hoveredCountry, setHoveredCountry] = useState<HoveredCountryInfo | null>(null);

  // Interactive Zoom & Pan State (Only the SVG map element itself is zoomable; zero shaking / getar)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgMapRef = useRef<SVGSVGElement | null>(null);
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);
  const setSvgRef = useCallback((node: SVGSVGElement | null) => {
    svgMapRef.current = node;
    setSvgEl(node);
  }, []);

  const pinchStartDistRef = useRef(0);
  const pinchStartZoomRef = useRef(1);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoZooming, setIsAutoZooming] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragStartClientRef = useRef({ x: 0, y: 0 });
  const streamTickRef = useRef(0);

  // Synchronized refs to allow event listeners to read current values without re-attaching on every frame
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  const [stats, setStats] = useState({
    attacksPerSecond: 18,
    blockedIn24h: 854120,
    activeOutbreaks: 140,
    realIncidentsCount: 0,
    threatPosture: "SECURE / PROTECTED",
    edgeStatus: "100% OPERATIONAL",
  });
  const [topThreats, setTopThreats] = useState<any[]>([]);
  const [topCountries, setTopCountries] = useState<any[]>([]);
  const [targetedIndustries, setTargetedIndustries] = useState<any[]>([]);

  // Sequential counters to guarantee 100% unique React keys
  const impactSeqRef = useRef(0);
  const laserSeqRef = useRef(0);
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  // Clean Regional Paths for Indonesia view (removes out-of-bounds cut off countries)
  const regionalCleanPaths = useMemo(() => {
    return indonesiaRegionPaths.filter(poly =>
      ['IDN', 'MYS', 'BRN', 'TLS', 'PNG'].includes(poly.id)
    );
  }, []);

  // Live real-time clock (UTC and Asia/Jakarta WIB)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setCurrentTime(`${now.toLocaleTimeString("id-ID", options)} WIB (UTC+7)`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Zoom handlers (Smoothly glide with 450ms animation curve)
  const handleZoomIn = () => {
    setIsAutoZooming(true);
    setZoom(z => Math.min(4.0, Math.round((z + 0.3) * 10) / 10));
    setTimeout(() => setIsAutoZooming(false), 460);
  };
  const handleZoomOut = () => {
    setIsAutoZooming(true);
    setZoom(z => Math.max(0.7, Math.round((z - 0.3) * 10) / 10));
    setTimeout(() => setIsAutoZooming(false), 460);
  };
  const handleResetZoom = () => {
    setIsAutoZooming(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTimeout(() => setIsAutoZooming(false), 460);
  };

  // Reset zoom & pan when switching between regional and global view
  useEffect(() => {
    setIsAutoZooming(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHoveredCountry(null);
    setTimeout(() => setIsAutoZooming(false), 460);
  }, [region]);

  // Native Non-Passive Wheel Event Listener ONLY on the SVG map element
  // (Cursor in empty space/padding around the map will NOT zoom the map; zero vibration)
  useEffect(() => {
    if (!svgEl) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const delta = e.deltaY;
      const currentZoom = zoomRef.current;

      // If fully zoomed out and scrolling down, allow default page scroll
      if (delta > 0 && currentZoom <= 1.0) {
        return;
      }

      // PREVENT BROWSER WINDOW FROM SCROLLING ONLY WHEN CURSOR IS DIRECTLY OVER SVG MAP
      e.preventDefault();
      e.stopPropagation();

      const step = delta < 0 ? 0.2 : -0.2;
      const nextZoom = Math.min(4.0, Math.max(1.0, Math.round((currentZoom + step) * 10) / 10));
      if (nextZoom === currentZoom) return;

      setZoom(nextZoom);
      if (nextZoom <= 1.0) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan(p => ({
          x: Math.round(Math.max(-450 * nextZoom, Math.min(450 * nextZoom, p.x))),
          y: Math.round(Math.max(-450 * nextZoom, Math.min(450 * nextZoom, p.y))),
        }));
      }
    };

    svgEl.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      svgEl.removeEventListener('wheel', handleNativeWheel);
    };
  }, [svgEl]);

  // Mobile 2-Finger Pinch-to-Zoom Gesture Listener ONLY on the SVG map element
  useEffect(() => {
    if (!svgEl) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // 2-Finger Pinch Started directly on Map
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartDistRef.current = dist;
        pinchStartZoomRef.current = zoomRef.current;
      } else if (e.touches.length === 1 && zoomRef.current > 1) {
        touchStartPosRef.current = {
          x: e.touches[0].clientX - panRef.current.x,
          y: e.touches[0].clientY - panRef.current.y,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // 2-Finger Pinch Move: Smoothly zoom map in/out without jitter
        e.preventDefault();
        e.stopPropagation();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinchStartDistRef.current > 0) {
          const factor = dist / pinchStartDistRef.current;
          const nextZoom = Math.min(4.0, Math.max(1.0, Math.round(pinchStartZoomRef.current * factor * 100) / 100));
          if (nextZoom !== zoomRef.current) {
            setZoom(nextZoom);
            if (nextZoom <= 1.0) {
              setPan({ x: 0, y: 0 });
            }
          }
        }
      } else if (e.touches.length === 1 && zoomRef.current > 1) {
        // 1-Finger Pan only when zoomed into the map
        e.preventDefault();
        const z = zoomRef.current;
        const maxPan = 450 * z;
        const newX = Math.max(-maxPan, Math.min(maxPan, e.touches[0].clientX - touchStartPosRef.current.x));
        const newY = Math.max(-maxPan, Math.min(maxPan, e.touches[0].clientY - touchStartPosRef.current.y));
        setPan({ x: Math.round(newX), y: Math.round(newY) });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDistRef.current = 0;
      }
    };

    svgEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    svgEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    svgEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      svgEl.removeEventListener('touchstart', handleTouchStart);
      svgEl.removeEventListener('touchmove', handleTouchMove);
      svgEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [svgEl]);

  // Window mousemove / mouseup for ultra smooth drag panning (zero jitter)
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const z = zoomRef.current;
      const maxPan = 450 * z;
      const newX = Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStartRef.current.x));
      const newY = Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStartRef.current.y));
      setPan({ x: Math.round(newX), y: Math.round(newY) });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  // Prevent mobile browser page-level zoom outside the map (preserves clean 1:1 mobile layout)
  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        const svgEl = svgMapRef.current;
        if (svgEl && svgEl.contains(e.target as Node)) {
          // Inside SVG map: handled by map pinch handler
          return;
        }
        // Outside SVG map: PREVENT mobile browser whole-page pinch zoom
        e.preventDefault();
      }
    };

    let lastTouchEnd = 0;
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      const svgEl = svgMapRef.current;
      const isInside = svgEl && svgEl.contains(e.target as Node);
      if (!isInside && now - lastTouchEnd <= 300) {
        // Prevent double-tap page zoom outside the map
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, []);

  // Precision Auto-Zoom to Any Country (Centering that country smoothly in the 1000x500 canvas)
  const zoomToCountry = (codeOrId: string, customZoom?: number) => {
    setIsAutoZooming(true);
    setTimeout(() => setIsAutoZooming(false), 460);

    const upper = codeOrId.toUpperCase();
    if (upper === 'ID' || upper === 'IDN') {
      if (region !== 'indonesia') {
        setRegion('indonesia');
      }
      setZoom(1.8);
      setPan({ x: 0, y: 0 });
      return;
    }

    if (region === 'indonesia') {
      setRegion('world');
    }

    const coords = COUNTRY_CENTROIDS[upper];
    if (coords) {
      const [targetX, targetY] = projectCoords(coords[0], coords[1], 'world');
      const z = customZoom || 2.4;
      const maxPan = 450 * z;
      const newPanX = Math.max(-maxPan, Math.min(maxPan, (500 - targetX) * z));
      const newPanY = Math.max(-maxPan, Math.min(maxPan, (250 - targetY) * z));
      setZoom(z);
      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    }
  };

  // Country Click Auto-Zoom Handler
  const handleCountryClick = (country: { id: string; name: string }, e: React.MouseEvent<SVGPathElement>) => {
    e.stopPropagation();
    const dist = Math.hypot(e.clientX - dragStartClientRef.current.x, e.clientY - dragStartClientRef.current.y);
    if (dist > 6) return; // User was panning/dragging, ignore click

    setIsAutoZooming(true);
    setTimeout(() => setIsAutoZooming(false), 460);

    if (country.id === 'IDN') {
      if (region === 'world') {
        setRegion('indonesia');
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        setZoom(2.2);
        setPan({ x: 0, y: 0 });
      }
      return;
    }

    try {
      const bbox = (e.currentTarget as SVGGraphicsElement).getBBox();
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        const targetX = bbox.x + bbox.width / 2;
        const targetY = bbox.y + bbox.height / 2;
        const targetZoom = Math.min(3.4, Math.max(1.8, Math.min(650 / Math.max(bbox.width, 25), 320 / Math.max(bbox.height, 25))));
        const maxPan = 450 * targetZoom;
        const newPanX = Math.max(-maxPan, Math.min(maxPan, (500 - targetX) * targetZoom));
        const newPanY = Math.max(-maxPan, Math.min(maxPan, (250 - targetY) * targetZoom));
        setZoom(Math.round(targetZoom * 10) / 10);
        setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
        return;
      }
    } catch {}

    zoomToCountry(country.id);
  };

  // Pan / Drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    // Limit panning bounds so the map is never lost
    const maxPan = 450 * zoom;
    const newX = Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStartRef.current.x));
    const newY = Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStartRef.current.y));
    setPan({ x: newX, y: newY });
  };

  const onMouseUp = () => setIsDragging(false);

  // Country Hover Handler (tracks cursor inside SVG container)
  const handleCountryHover = (country: { id: string; name: string }, e: React.MouseEvent) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const code = ALPHA3_TO_ALPHA2[country.id] || (country.id === 'IDN' ? 'id' : country.id.slice(0, 2).toLowerCase());
    setHoveredCountry({
      id: country.id,
      name: country.name,
      code,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCountryMove = (e: React.MouseEvent) => {
    if (!hoveredCountry) return;
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredCountry(prev => prev ? {
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    } : null);
  };

  // Fire laser projectile helper (FortiGuard parabolic trajectory)
  const spawnLaser = (atk: AttackEvent) => {
    const [x1, y1] = projectCoords(atk.sourceCoords[0], atk.sourceCoords[1], region);
    const [x2, y2] = projectCoords(atk.targetCoords[0], atk.targetCoords[1], region);

    // Parabolic arc height
    const dx = Math.abs(x2 - x1);
    const arcHeight = region === 'indonesia' ? Math.max(45, dx * 0.24) : Math.max(65, dx * 0.18);
    const midX = (x1 + x2) / 2;
    const midY = Math.min(y1, y2) - arcHeight;

    // Professional, elegant colors (subtle rose coral for real, amber for high, cyan for medium)
    const color = atk.isReal
      ? '#f43f5e'
      : atk.severity === 'Critical'
      ? '#fb7185'
      : atk.severity === 'High'
      ? '#f59e0b'
      : isDark ? '#06b6d4' : '#0284c7';

    laserSeqRef.current++;
    const newLaser: ActiveLaser = {
      id: `laser-${laserSeqRef.current}-${Date.now()}`,
      x1,
      y1,
      x2,
      y2,
      cx: midX,
      cy: midY,
      progress: 0,
      color,
      severity: atk.severity,
      sourceCity: atk.sourceCity,
      sourceCode: atk.sourceCode,
      targetCity: atk.targetCity,
      targetCode: atk.targetCode,
      attackName: atk.attackName,
      isReal: atk.isReal,
      sourceIp: atk.sourceIp,
    };

    setLasers(prev => [...prev.slice(-20), newLaser]);

    if (atk.isReal) {
      setRecentLiveAlert(atk);
      setTimeout(() => setRecentLiveAlert(null), 3500);
    }
  };

  // Initial fetch from /api/threats
  useEffect(() => {
    fetch(`/api/threats?count=30&region=${region}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          const fetchedEvents: AttackEvent[] = data.events || [];
          setAttacks(fetchedEvents);
          setStats(data.stats);
          setTopThreats(data.topThreats || []);
          if (data.topCountries) {
            setTopCountries(data.topCountries);
          }
          if (data.targetedIndustries) {
            setTargetedIndustries(data.targetedIndustries);
          }

          fetchedEvents.forEach(e => seenEventIdsRef.current.add(e.id));

          // Spawn lasers for initial attacks: ALWAYS prioritize attacks hitting Masdika Sidoarjo Hub!
          if (fetchedEvents.length > 0) {
            const masdikaInitial = fetchedEvents.filter(e => e.isReal || e.targetCity.includes('Sidoarjo') || e.targetCode === 'ID');
            const globalInitial = fetchedEvents.filter(e => !e.isReal && !e.targetCity.includes('Sidoarjo'));

            if (masdikaInitial.length > 0) {
              spawnLaser(masdikaInitial[0]);
            }
            if (masdikaInitial.length > 1) {
              setTimeout(() => spawnLaser(masdikaInitial[1]), 650);
            }
            if (region === 'world' && globalInitial.length > 0) {
              setTimeout(() => spawnLaser(globalInitial[0]), 1300);
            }
          }
        }
      })
      .catch(err => console.error("Error fetching threat data:", err));
  }, [region]);

  // Animation loop for laser beams & impact shockwaves
  useEffect(() => {
    let animFrame: number;
    const animate = () => {
      setLasers(prevLasers => {
        const nextLasers: ActiveLaser[] = [];
        for (const laser of prevLasers) {
          const step = laser.isReal ? 0.034 : 0.028;
          const nextProgress = laser.progress + step;
          if (nextProgress >= 1) {
            // Impact! Trigger shockwaves with guaranteed unique keys
            impactSeqRef.current++;
            const seq = impactSeqRef.current;
            const newImpacts: ImpactRipple[] = [
              {
                id: `impact-main-${seq}-${Date.now()}`,
                x: laser.x2,
                y: laser.y2,
                color: laser.color,
                radius: laser.isReal ? 12 : 6,
                opacity: 0.9,
              },
            ];

            if (laser.isReal) {
              newImpacts.push({
                id: `impact-ring-${seq}-${Date.now()}`,
                x: laser.x2,
                y: laser.y2,
                color: '#38bdf8',
                radius: 4,
                opacity: 0.8,
              });
            }

            setImpacts(prev => [...prev.slice(-18), ...newImpacts]);
          } else {
            nextLasers.push({ ...laser, progress: nextProgress });
          }
        }
        return nextLasers;
      });

      // Expand & fade impact shockwaves
      setImpacts(prevImpacts =>
        prevImpacts
          .map(imp => ({
            ...imp,
            radius: imp.radius + 1.4,
            opacity: imp.opacity - 0.035,
          }))
          .filter(imp => imp.opacity > 0)
      );

      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [region]);

  // Real-time live polling & projectile stream
  useEffect(() => {
    if (!isLiveStreaming) return;

    const streamInterval = setInterval(() => {
      fetch(`/api/threats?count=25&region=${region}`)
        .then(res => res.json())
        .then(data => {
          if (data.events && data.events.length > 0) {
            const incoming: AttackEvent[] = data.events;

            // Directly update attacks stream with database real attacks at the top
            setAttacks(incoming);

            // Prioritize Masdika Sidoarjo Edge DC hits on every tick, and interleave global outbreaks
            streamTickRef.current++;
            const tick = streamTickRef.current;

            const masdikaTargets = incoming.filter(e => e.isReal || e.targetCity.includes('Sidoarjo') || e.targetCode === 'ID');
            const globalOutbreaks = incoming.filter(e => !e.isReal && !e.targetCity.includes('Sidoarjo'));

            // 1. ALWAYS fire an attack targeting Masdika Sidoarjo Edge Datacenter!
            if (masdikaTargets.length > 0) {
              const realOnly = masdikaTargets.filter(e => e.isReal);
              const chosenMasdika = realOnly.length > 0 && tick % 2 === 0
                ? realOnly[tick % realOnly.length]
                : masdikaTargets[tick % masdikaTargets.length];
              spawnLaser(chosenMasdika);
            }

            // 2. In World view, also spawn a worldwide outbreak laser offset by 900ms
            if (region === 'world' && globalOutbreaks.length > 0) {
              const chosenGlobal = globalOutbreaks[tick % globalOutbreaks.length];
              setTimeout(() => spawnLaser(chosenGlobal), 900);
            } else if (region === 'indonesia' && masdikaTargets.length > 1) {
              const secondPick = masdikaTargets[(tick + 1) % masdikaTargets.length];
              setTimeout(() => spawnLaser(secondPick), 1000);
            }

            if (data.stats) {
              setStats(prev => ({
                ...prev,
                attacksPerSecond: data.stats.attacksPerSecond || Math.floor(Math.random() * 8) + 14,
                blockedIn24h: data.stats.blockedIn24h || prev.blockedIn24h + 1,
                realIncidentsCount: data.stats.realIncidentsCount,
              }));
            }
          }
        })
        .catch(() => {});
    }, 2200);

    return () => clearInterval(streamInterval);
  }, [isLiveStreaming, region]);

  // Filtered attacks list for table (Always pin real attacks targeting Masdika first!)
  const filteredAttacks = useMemo(() => {
    let list = attacks;
    if (filterSeverity === 'real') {
      return list.filter(a => a.isReal);
    }
    if (filterSeverity === 'indonesia') {
      list = list.filter(a => a.targetCode === 'ID' || a.sourceCode === 'ID' || a.isReal);
    } else if (filterSeverity === 'world') {
      list = list.filter(a => a.targetCode !== 'ID' || a.isReal);
    } else if (filterSeverity !== 'all') {
      list = list.filter(a => a.severity.toLowerCase() === filterSeverity.toLowerCase());
    }

    // Always sort verified real attacks targeting Masdika at the very top!
    return [...list].sort((a, b) => {
      if (a.isReal && !b.isReal) return -1;
      if (!a.isReal && b.isReal) return 1;
      return 0;
    });
  }, [attacks, filterSeverity]);

  // Datacenter Target Coordinates for SVG
  const targetHubCoords = useMemo(() => {
    // Sidoarjo Datacenter [-7.4478, 112.7183]
    return projectCoords(-7.4478, 112.7183, region);
  }, [region]);

  const jakartaCoords = useMemo(() => {
    return projectCoords(-6.2088, 106.8456, region);
  }, [region]);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 lg:pb-28 font-sans bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200">
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Matches Looking Glass, SLA, Terms, Privacy & design.md) ── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-cyan-400" size="md" className="font-mono uppercase">
                  CYBER THREAT INTELLIGENCE &amp; SOC
                </Badge>
              </div>

              {/* Headline H1 (Matching Looking Glass, Home Page, SLA, Privacy) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Cyber Threat <br />
                Intelligence &amp; <br />
                <span className="text-cyan-600 dark:text-cyan-400">
                  Global Attack Radar.
                </span>
              </h1>

              {/* Subheadline (18px/28px text-secondary) */}
              <p className="text-lg md:text-xl text-[var(--text-secondary)] font-normal mb-8 leading-relaxed max-w-xl">
                Real-time interactive telemetry tracking incoming DDoS floods, credential stuffing attempts, and zero-day exploit probes mitigated autonomously across Masdika Sidoarjo Edge Datacenter and global upstream backbones.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    const el = document.getElementById("radar-cockpit");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  leftIcon={<Radar className="w-4 h-4 text-slate-950" />}
                >
                  Inspect Threat Radar
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/lg"
                  leftIcon={<Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Route Looking Glass
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar (threat-map.webp) with Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/images/mascots/threat-map.webp"
                imageAlt="Masdika – Cyber Threat Intelligence Radar"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: ShieldAlert, label: "Edge Firewall", value: "Autonomous WAF" },
                  { icon: Radar, label: "Threat Radar", value: "Real-Time SOC" },
                  { icon: Activity, label: "DDoS Mitigation", value: "Zero Downtime" },
                  { icon: Server, label: "Core Node", value: "Sidoarjo, ID" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. REAL-TIME THREAT MAP COCKPIT (Authentic GIS Coastlines) ── */}
        <section id="radar-cockpit" className="space-y-6">

          {/* Cockpit Header Toolbar */}
          <div className={cn(
            "p-4 sm:p-5 rounded-t-2xl border border-[var(--border-primary)] transition-colors duration-200",
            isDark ? "bg-[var(--surface)]" : "bg-white shadow-sm"
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Defense & Sensor Status */}
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 relative flex items-center justify-center">
                  <span className="w-full h-full rounded-full bg-emerald-400 animate-ping absolute opacity-75" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black font-mono tracking-tight text-[var(--text-primary)]">
                      SOC ATTACK DEFENSE MATRIX
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                      AUTONOMOUS WAF ACTIVE
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[var(--text-secondary)]">
                    Primary Target Node: Sidoarjo Edge Datacenter (AS63859) | {currentTime || "Synchronizing..."}
                  </p>
                </div>
              </div>

              {/* Right Toolbar Controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                
                {/* Attack Rate Widget */}
                <div className={cn(
                  "px-3.5 py-2 rounded-xl border border-[var(--border-primary)] flex flex-col items-center",
                  isDark ? "bg-[var(--surface-secondary)]" : "bg-slate-50 border-slate-200"
                )}>
                  <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-bold">ATTACKS / SEC</span>
                  <span className="text-base sm:text-lg font-mono font-black text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-500 animate-bounce" />
                    {stats.attacksPerSecond}
                  </span>
                </div>

                {/* Blocked in 24h Widget */}
                <div className={cn(
                  "px-3.5 py-2 rounded-xl border border-[var(--border-primary)] flex flex-col items-center",
                  isDark ? "bg-[var(--surface-secondary)]" : "bg-slate-50 border-slate-200"
                )}>
                  <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-bold">BLOCKED IN 24H</span>
                  <span className="text-base sm:text-lg font-mono font-black text-[var(--text-primary)]">
                    {stats.blockedIn24h.toLocaleString()}
                  </span>
                </div>

                {/* Region Switcher: Indonesia is First/Primary on the Left (User Request) */}
                <div className={cn(
                  "flex items-center p-1 rounded-xl border border-[var(--border-primary)]",
                  isDark ? "bg-[var(--surface-secondary)]" : "bg-slate-100 border-slate-200"
                )}>
                  <button
                    type="button"
                    onClick={() => setRegion('indonesia')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      region === 'indonesia'
                        ? "bg-cyan-500 text-slate-950 shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <CountryFlag code="ID" className="w-3.5 h-2.5" />
                    <span>Indonesia Focus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegion('world')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      region === 'world'
                        ? "bg-cyan-500 text-slate-950 shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Worldwide</span>
                  </button>
                </div>

                {/* Live Stream Pause/Resume Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLiveStreaming(prev => !prev)}
                  title={isLiveStreaming ? "Pause radar stream" : "Resume radar stream"}
                  className={cn(
                    "p-2 rounded-xl border border-[var(--border-primary)] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors",
                    isDark ? "bg-[var(--surface-secondary)]" : "bg-slate-50 border-slate-200"
                  )}
                >
                  {isLiveStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

              </div>
            </div>
          </div>

          {/* Radar Main Grid (Map Visualizer + Sidebars) */}
          <div className={cn(
            "border-x border-b border-[var(--border-primary)] relative overflow-hidden transition-colors duration-200",
            isDark ? "bg-[#040b17]" : "bg-slate-50"
          )}>
            
            {/* Tactical Grid Overlay & Scanning Lines */}
            <div className={cn(
              "absolute inset-0 pointer-events-none bg-[size:40px_40px]",
              isDark
                ? "bg-[linear-gradient(to_right,#00e5ff06_1px,transparent_1px),linear-gradient(to_bottom,#00e5ff06_1px,transparent_1px)]"
                : "bg-[linear-gradient(to_right,#0284c70d_1px,transparent_1px),linear-gradient(to_bottom,#0284c70d_1px,transparent_1px)]"
            )} />

            {/* Tactical HUD Corner Brackets */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-500/40 pointer-events-none z-20" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-500/40 pointer-events-none z-20" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-500/40 pointer-events-none z-20" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-500/40 pointer-events-none z-20" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative z-10">
              
              {/* Map Canvas Visualizer (8 Cols) - Seamless Cockpit Layout */}
              <div className="lg:col-span-8 p-3 sm:p-5 lg:border-r border-b lg:border-b-0 border-[var(--border-subtle)] flex flex-col justify-between relative overflow-hidden">
                
                {/* Top HUD Controls */}
                <div className="relative z-20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mb-3">
                  {/* Top-Left: Defense & Incident Radar Status */}
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-md",
                      isDark
                        ? "bg-[#08172c]/90 border-cyan-500/40 text-cyan-300"
                        : "bg-white/95 border-cyan-200 text-cyan-700"
                    )}>
                      <Radio className="w-3 h-3 text-cyan-500 animate-pulse" />
                      <span className="hidden sm:inline">DEFENSE RADAR</span>
                      <span className="sm:hidden">RADAR</span>
                    </div>

                    {stats.realIncidentsCount > 0 && (
                      <div className="px-2.5 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400 text-[11px] font-mono font-bold flex items-center gap-1 shadow-sm backdrop-blur-md">
                        <ShieldAlert className="w-3 h-3 text-rose-500" />
                        <span>{stats.realIncidentsCount} REAL</span>
                      </div>
                    )}
                  </div>

                  {/* Top-Center: Dedicated Region Pill */}
                  <div>
                    <div className={cn(
                      "px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all whitespace-nowrap",
                      isDark
                        ? region === 'indonesia'
                          ? "bg-[#091813] border-[#1b3d30] text-slate-100 shadow-none"
                          : "bg-[#081523] border-[#1b354d] text-slate-100 shadow-none"
                        : "bg-white/95 border-slate-300 text-slate-900 shadow-sm"
                    )}>
                      {region === 'indonesia' ? (
                        <>
                          <CountryFlag code="ID" className="w-4 h-3 rounded-[2px]" />
                          <span className="text-xs font-bold font-mono tracking-wide text-slate-200">
                            Indonesia Focus
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-xs font-bold font-mono tracking-wide text-slate-200">
                            Worldwide Threat Outbreaks
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top-Right: Floating Tactical Zoom & Pan Controls */}
                  <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]/90 backdrop-blur-md shadow-sm">
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      title="Zoom In (+)"
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-500 hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      title="Zoom Out (-)"
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-500 hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      title="Reset Zoom"
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-500 hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 border-l border-[var(--border-subtle)]">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                </div>

                {/* Floating Hover Country Tooltip */}
                {hoveredCountry && (
                  <div
                    className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 transition-transform duration-75 ease-out"
                    style={{
                      left: `${hoveredCountry.x}px`,
                      top: `${hoveredCountry.y}px`,
                    }}
                  >
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-2 select-none",
                      isDark
                        ? "bg-[#0c1824] border-slate-700 text-slate-100 shadow-md"
                        : "bg-white/95 border-slate-300 text-slate-900 shadow-md"
                    )}>
                      <CountryFlag code={hoveredCountry.code} className="w-4 h-3 shadow-sm" />
                      <span className="text-xs font-mono font-bold tracking-tight">
                        {hoveredCountry.name}
                      </span>
                    </div>
                  </div>
                )}

                {/* SVG Tactical Vector Map with Real GIS Coastlines & Zoom/Pan (Zoom occurs ONLY on SVG map) */}
                <div
                  ref={mapContainerRef}
                  className="w-full flex-1 flex items-center justify-center relative py-2 overflow-hidden"
                  onMouseMove={handleCountryMove}
                >
                  <svg
                    ref={setSvgRef}
                    viewBox="0 0 1000 500"
                    style={{ touchAction: 'none' }}
                    className={cn(
                      "w-full h-auto max-h-[500px] select-none",
                      zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    )}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={() => {
                      onMouseUp();
                      setHoveredCountry(null);
                    }}
                  >
                    <defs>
                      <clipPath id="map-clip">
                        <rect x="0" y="0" width="1000" height="500" />
                      </clipPath>

                      <filter id="laser-glow" x="-25%" y="-25%" width="150%" height="150%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      <radialGradient id="target-beacon" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                        <stop offset="40%" stopColor="#0284c7" stopOpacity="0.35" />
                        <stop offset="100%" stopColor={isDark ? "#040b17" : "#f8fafc"} stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Transform Group for Zoom & Pan (Zero Shaking / Getar during manual interactions) */}
                    <g
                      clipPath="url(#map-clip)"
                      transform={`translate(${500 + pan.x}, ${250 + pan.y}) scale(${zoom}) translate(-500, -250)`}
                      style={{
                        transition: isAutoZooming ? 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                        willChange: 'transform',
                      }}
                    >
                        {/* Radar Coordinate Grid & Concentric Scanning Rings */}
                        <circle cx="500" cy="250" r="140" fill="none" stroke={isDark ? "#06b6d4" : "#0284c7"} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.22" />
                        <circle cx="500" cy="250" r="260" fill="none" stroke={isDark ? "#06b6d4" : "#0284c7"} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.16" />
                        <circle cx="500" cy="250" r="380" fill="none" stroke={isDark ? "#06b6d4" : "#0284c7"} strokeWidth="0.5" strokeDasharray="5,5" opacity="0.1" />

                        {/* Map Coordinate Parallels & Meridians */}
                        <line x1="40" y1="250" x2="960" y2="250" stroke={isDark ? "#0ea5e9" : "#0284c7"} strokeWidth="0.5" strokeDasharray="2,4" opacity="0.2" />
                        <line x1="500" y1="20" x2="500" y2="480" stroke={isDark ? "#0ea5e9" : "#0284c7"} strokeWidth="0.5" strokeDasharray="2,4" opacity="0.2" />

                        {/* Real Geographic Vector Map Outlines */}
                        {region === 'indonesia' ? (
                          /* Indonesia Region: High-Fidelity Archipelago (Matches FortiGuard Image 2) */
                          <g className="transition-all duration-500 ease-in-out">
                            {regionalCleanPaths.map((poly) => {
                              const isID = poly.isIndonesia;
                              const isHovered = hoveredCountry?.id === poly.id;

                              return (
                                <path
                                  key={poly.id}
                                  d={poly.d}
                                  onClick={(e) => handleCountryClick({ id: poly.id, name: poly.name }, e)}
                                  onMouseEnter={(e) => handleCountryHover({ id: poly.id, name: poly.name }, e)}
                                  onMouseLeave={() => setHoveredCountry(null)}
                                  fill={
                                    isHovered
                                      ? isDark ? "#00f0ff40" : "#0284c740"
                                      : isID
                                      ? isDark ? "#0c2820" : "#cbd5e1"
                                      : isDark ? "#061524" : "#f1f5f9"
                                  }
                                  stroke={
                                    isHovered
                                      ? isDark ? "#00f0ff" : "#0284c7"
                                      : isID
                                      ? isDark ? "#10b981" : "#0284c7"
                                      : isDark ? "#16304d" : "#94a3b8"
                                  }
                                  strokeWidth={isHovered ? "2.2" : isID ? "1.6" : "0.7"}
                                  opacity={isID ? 0.98 : 0.4}
                                  className="cursor-pointer transition-colors duration-200"
                                />
                              );
                            })}

                            {/* Secondary Core Node: Jakarta Gateway */}
                            <g transform={`translate(${jakartaCoords[0]}, ${jakartaCoords[1]})`}>
                              <circle r="3.5" fill={isDark ? "#38bdf8" : "#0284c7"} stroke="#ffffff" strokeWidth="1" />
                              <text x="-80" y="-8" fill={isDark ? "#7dd3fc" : "#475569"} fontSize="9" fontFamily="monospace">
                                Jakarta Core [ID]
                              </text>
                            </g>

                            {/* Primary Target Beacon: Masdika Sidoarjo Datacenter Hub */}
                            <g transform={`translate(${targetHubCoords[0]}, ${targetHubCoords[1]})`}>
                              <circle r="26" fill="url(#target-beacon)" className="animate-ping" opacity="0.85" />
                              <circle r="14" fill={isDark ? "#06b6d4" : "#0284c7"} opacity="0.3" />
                              <circle r="5" fill={isDark ? "#06b6d4" : "#0284c7"} stroke="#ffffff" strokeWidth="1.8" />
                              
                              {/* Staggered Leader Label below node */}
                              <line x1="0" y1="8" x2="0" y2="24" stroke={isDark ? "#38bdf8" : "#0284c7"} strokeWidth="1" strokeDasharray="2,2" />
                              <line x1="0" y1="24" x2="30" y2="24" stroke={isDark ? "#38bdf8" : "#0284c7"} strokeWidth="1" />
                              <text x="36" y="22" fill={isDark ? "#38bdf8" : "#0369a1"} fontSize="11" fontWeight="bold" fontFamily="monospace">
                                MASDIKA SIDOARJO HUB [ID]
                              </text>
                              <text x="36" y="34" fill={isDark ? "#7dd3fc" : "#0284c7"} fontSize="9" fontFamily="monospace">
                                AS63859 [PRIMARY DATACENTER]
                              </text>
                            </g>
                          </g>
                        ) : (
                          /* World View: Real Natural Earth GIS Countries (Matches FortiGuard Image 4) */
                          <g className="transition-all duration-500 ease-in-out">
                            {worldPaths.map((country) => {
                              const isID = country.id === 'IDN';
                              const isHovered = hoveredCountry?.id === country.id;

                              return (
                                <path
                                  key={country.id}
                                  d={country.d}
                                  onClick={(e) => handleCountryClick(country, e)}
                                  onMouseEnter={(e) => handleCountryHover(country, e)}
                                  onMouseLeave={() => setHoveredCountry(null)}
                                  fill={
                                    isHovered
                                      ? isDark ? "#00f0ff40" : "#0284c740"
                                      : isID
                                      ? isDark ? "#00f0ff30" : "#0284c730"
                                      : isDark ? "#0b2034" : "#cbd5e1"
                                  }
                                  stroke={
                                    isHovered
                                      ? isDark ? "#00f0ff" : "#0284c7"
                                      : isID
                                      ? isDark ? "#00f0ff" : "#0284c7"
                                      : isDark ? "#163858" : "#94a3b8"
                                  }
                                  strokeWidth={isHovered ? "2.2" : isID ? "1.8" : "0.7"}
                                  opacity={isID ? 1 : 0.85}
                                  className="cursor-pointer transition-colors duration-200"
                                />
                              );
                            })}

                            {/* Target Node: Indonesia Masdika Hub */}
                            <g transform={`translate(${targetHubCoords[0]}, ${targetHubCoords[1]})`}>
                              <circle r="22" fill="url(#target-beacon)" className="animate-ping" opacity="0.85" />
                              <circle r="5.5" fill={isDark ? "#06b6d4" : "#0284c7"} stroke="#ffffff" strokeWidth="1.5" />
                              <text x="12" y="-6" fill={isDark ? "#38bdf8" : "#0369a1"} fontSize="10" fontWeight="bold" fontFamily="monospace">
                                Masdika Edge [ID]
                              </text>
                            </g>
                          </g>
                        )}

                        {/* Animated FortiGuard Parabolic Laser Arcs & Node Callouts */}
                        {lasers.map(laser => {
                          const t = laser.progress;
                          const currentX = (1 - t) * (1 - t) * laser.x1 + 2 * (1 - t) * t * laser.cx + t * t * laser.x2;
                          const currentY = (1 - t) * (1 - t) * laser.y1 + 2 * (1 - t) * t * laser.cy + t * t * laser.y2;

                          return (
                            <g key={laser.id} filter="url(#laser-glow)">
                              {/* Trajectory Guide Arc */}
                              <path
                                d={`M ${laser.x1},${laser.y1} Q ${laser.cx},${laser.cy} ${laser.x2},${laser.y2}`}
                                fill="none"
                                stroke={laser.color}
                                strokeWidth={laser.isReal ? "2.2" : "1.2"}
                                strokeDasharray={laser.isReal ? "5,3" : "4,4"}
                                opacity={laser.isReal ? "0.95" : "0.55"}
                              />

                              {/* Source Origin Node & Callout Label (FortiGuard Style) */}
                              <g transform={`translate(${laser.x1}, ${laser.y1})`}>
                                <circle r={laser.isReal ? "4.5" : "3"} fill={laser.color} opacity="0.95" />
                                <g transform="translate(0, -9)">
                                  <rect
                                    x="-36"
                                    y="-10"
                                    width="72"
                                    height="13"
                                    rx="2"
                                    fill={isDark ? "rgba(4, 11, 23, 0.9)" : "rgba(255, 255, 255, 0.95)"}
                                    stroke={isDark ? "rgba(14, 165, 233, 0.5)" : "rgba(148, 163, 184, 0.7)"}
                                    strokeWidth="0.7"
                                  />
                                  <text
                                    x="0"
                                    y="-1"
                                    textAnchor="middle"
                                    fill={isDark ? "#e2e8f0" : "#1e293b"}
                                    fontSize="7"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                  >
                                    {laser.sourceCity} {laser.sourceCode}
                                  </text>
                                </g>
                              </g>

                              {/* Target Destination Node & Callout Label */}
                              <g transform={`translate(${laser.x2}, ${laser.y2})`}>
                                <circle r="7" fill="none" stroke={laser.color} strokeWidth="1" opacity="0.75" />
                                <circle r="2.5" fill={laser.color} />
                                <g transform="translate(0, -9)">
                                  <rect
                                    x="-38"
                                    y="-10"
                                    width="76"
                                    height="13"
                                    rx="2"
                                    fill={isDark ? "rgba(4, 11, 23, 0.9)" : "rgba(255, 255, 255, 0.95)"}
                                    stroke={laser.color}
                                    strokeWidth="0.8"
                                  />
                                  <text
                                    x="0"
                                    y="-1"
                                    textAnchor="middle"
                                    fill={laser.color}
                                    fontSize="7"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                  >
                                    {laser.targetCity} {laser.targetCode}
                                  </text>
                                </g>
                              </g>

                              {/* Missile / Laser Head Projectile */}
                              <circle cx={currentX} cy={currentY} r={laser.isReal ? "5.5" : "3.8"} fill="#ffffff" stroke={laser.color} strokeWidth={laser.isReal ? "2.5" : "1.8"} />
                              <circle cx={currentX} cy={currentY} r={laser.isReal ? "12" : "7"} fill={laser.color} opacity={laser.isReal ? "0.45" : "0.25"} />
                            </g>
                          );
                        })}

                        {/* Impact Shockwaves on Target Hit */}
                        {impacts.map(impact => (
                          <circle
                            key={impact.id}
                            cx={impact.x}
                            cy={impact.y}
                            r={impact.radius}
                            fill="none"
                            stroke={impact.color}
                            strokeWidth="2"
                            opacity={impact.opacity}
                          />
                        ))}
                      </g>
                    </svg>
                  </div>

                {/* Live Probe Alert (Cleanly docked in normal layout flow ABOVE the Legend - NEVER overlapping!) */}
                <div className="min-h-[34px] my-2.5 flex items-center justify-between">
                  {recentLiveAlert ? (
                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[11px] font-mono font-bold shadow-sm backdrop-blur-md",
                        recentLiveAlert.isReal
                          ? "border-rose-500/50 bg-rose-950/90 text-rose-300"
                          : "border-cyan-500/40 bg-[#061222]/90 text-cyan-300"
                      )}>
                        <CountryFlag code={recentLiveAlert.sourceCode} className="w-3.5 h-2.5" />
                        <span>LIVE PROBE: {recentLiveAlert.sourceCity} [{recentLiveAlert.sourceCode}]</span>
                        <span className="text-cyan-400">&rarr; {recentLiveAlert.targetCity}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-[var(--text-secondary)] opacity-60 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>RADAR ACTIVE &bull; 2-FINGER PINCH / WHEEL ON MAP TO ZOOM &bull; DRAG TO PAN</span>
                    </div>
                  )}

                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)] opacity-70">
                    <span>Touch: 2-Finger Pinch Map to Zoom</span>
                  </div>
                </div>

                {/* ── LEGEND BAR (COMPLETELY BELOW LIVE ALERT; ZERO OVERLAP) ── */}
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 text-rose-500 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Verified Real Attack (Live DB/Sensor)
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                      Target (Masdika Sidoarjo Edge DC)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      High / Volumetric DDoS Vector
                    </span>
                  </div>

                  <div className="text-[var(--text-secondary)] text-[11px]">
                    Direct SOC Telemetry: Sidoarjo Edge Datacenter (AS63859)
                  </div>
                </div>

              </div>

              {/* Right Sidebars: Top Attack Origins (FlagCDN) & Top Threats (4 Cols) */}
              <div className={cn(
                "lg:col-span-4 p-4 sm:p-6 space-y-6 transition-colors duration-200",
                isDark ? "bg-[#061222]/95" : "bg-white"
              )}>
                
                {/* Top Countries / Attack Origins (FortiGuard Threat Map Style - Interactive Auto-Zoom) */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-[var(--border-subtle)] pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-500" />
                      Top Attack Origins
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">Click to Auto-Zoom</span>
                  </div>

                  <div className="space-y-2">
                    {topCountries.map((c, idx) => (
                      <div
                        key={idx}
                        onClick={() => zoomToCountry(c.code)}
                        title={`Click to auto-zoom map to ${c.name}`}
                        className="group cursor-pointer p-1.5 -mx-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="flex items-center gap-2 truncate max-w-[210px] text-[var(--text-secondary)] group-hover:text-cyan-500 transition-colors">
                            <CountryFlag code={c.code} />
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="font-bold text-cyan-600 dark:text-cyan-400 shrink-0 ml-2">
                            {c.count}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0
                                ? "bg-cyan-500 dark:bg-cyan-400"
                                : "bg-cyan-600/70 dark:bg-cyan-500/60"
                            )}
                            style={{ width: `${c.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Targeted Industries (Real Telemetry & DB Aggregations) */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-[var(--border-subtle)] pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-500" />
                      Top Targeted Industries
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">Last 24 Hours</span>
                  </div>

                  <div className="space-y-2.5">
                    {targetedIndustries.map((ind, idx) => (
                      <div key={idx} className="group cursor-default">
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="truncate max-w-[210px] text-[var(--text-secondary)] group-hover:text-cyan-500 transition-colors">
                            {ind.name}
                          </span>
                          <span className="font-bold text-cyan-600 dark:text-cyan-400 shrink-0 ml-2">
                            {ind.count}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0
                                ? "bg-cyan-500 dark:bg-cyan-400"
                                : "bg-cyan-600/70 dark:bg-cyan-500/60"
                            )}
                            style={{ width: `${ind.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Threats Widget */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-[var(--border-subtle)] pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      Top Mitigated Threats (24h)
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">Global SOC</span>
                  </div>

                  <div className="space-y-2.5">
                    {topThreats.slice(0, 6).map((threat, idx) => (
                      <div key={idx} className="group cursor-default">
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="truncate max-w-[210px] text-[var(--text-secondary)] group-hover:text-cyan-500 transition-colors">
                            {threat.name}
                          </span>
                          <span className="font-bold text-cyan-600 dark:text-cyan-400 shrink-0 ml-2">
                            {threat.count}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0
                                ? "bg-rose-500 dark:bg-rose-400"
                                : "bg-cyan-500/80 dark:bg-cyan-400/80"
                            )}
                            style={{ width: `${threat.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sensor Node Health Indicator */}
                <div className={cn(
                  "p-3.5 rounded-xl border border-[var(--border-primary)] space-y-2",
                  isDark ? "bg-[var(--surface-secondary)]" : "bg-slate-50"
                )}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-cyan-500" />
                      Edge Node Status:
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">NORMAL / 100% SLA</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                      Firewall Drop Rate:
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">100% Mitigated</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Real-Time Attack Feed Ticker (Terminal Style) */}
            <div className={cn(
              "border-t border-[var(--border-primary)] p-4 sm:p-6 transition-colors duration-200",
              isDark ? "bg-[#030812]" : "bg-white"
            )}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                    REAL-TIME ATTACK STREAM &amp; PROBES
                  </span>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    (Auto-Mitigated at Edge)
                  </span>
                </div>

                {/* Severity & Incident Filter Tabs */}
                <div className="flex items-center gap-1.5 font-mono text-xs flex-wrap">
                  <span className="text-[var(--text-secondary)] mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-[var(--text-secondary)]" /> Filter:
                  </span>
                  {[
                    { key: 'all', label: 'All Vectors' },
                    { key: 'indonesia', label: 'Indonesia Focus' },
                    { key: 'world', label: 'Worldwide Outbreaks' },
                    { key: 'real', label: `Verified Live Attacks (${stats.realIncidentsCount})` },
                    { key: 'critical', label: 'Critical' },
                    { key: 'high', label: 'High' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterSeverity(tab.key)}
                      className={cn(
                        "px-2.5 py-1 rounded-md uppercase font-bold text-[10px] transition-all",
                        filterSeverity === tab.key
                          ? tab.key === 'real'
                            ? "bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/40"
                            : "bg-cyan-500 text-slate-950 shadow-sm"
                          : "border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)]"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Streaming Table with Original Country Flags (FortiGuard Style) */}
              <div className="overflow-x-auto rounded-xl border border-[var(--border-primary)] bg-[var(--surface)]">
                <table className="w-full text-left font-mono text-xs text-[var(--text-primary)]">
                  <thead className={cn(
                    "text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-primary)]",
                    isDark ? "bg-[var(--surface-secondary)]" : "bg-slate-100"
                  )}>
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Threat Signature / Vector</th>
                      <th className="py-2.5 px-4">Source Origin &amp; IP</th>
                      <th className="py-2.5 px-4">Target Node</th>
                      <th className="py-2.5 px-4">Severity</th>
                      <th className="py-2.5 px-4">Mitigation Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    <AnimatePresence initial={false}>
                      {filteredAttacks.slice(0, 14).map((atk) => (
                        <motion.tr
                          key={atk.id}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className={cn(
                            "transition-colors",
                            atk.isReal
                              ? "border-l-2 border-rose-500/70 hover:bg-[var(--surface-secondary)]"
                              : "hover:bg-[var(--surface-secondary)]"
                          )}
                        >
                          <td className="py-2.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                            {atk.timestamp}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {atk.isReal && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium uppercase bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  LIVE INCIDENT
                                </span>
                              )}
                              <span>{atk.attackName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <CountryFlag code={atk.sourceCode} />
                              <span className="text-[var(--text-primary)] font-bold">{atk.sourceCity}</span>
                              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">[{atk.sourceCode}]</span>
                              {atk.sourceIp && (
                                <span className="text-[10px] text-[var(--text-secondary)] font-mono ml-1">
                                  ({atk.sourceIp})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-300">
                              <CountryFlag code={atk.targetCode} />
                              <span>{atk.targetCity}</span>
                              <span className="text-[10px] text-cyan-500 font-mono">[{atk.targetCode}]</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                atk.severity === 'Critical'
                                    ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20"
                                    : atk.severity === 'High'
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                              )}
                            >
                              {atk.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[11px] font-medium">{atk.mitigation}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </section>

        {/* ── 2. AUTONOMOUS THREAT DEFENSE PIPELINE ─────────────────── */}
        <section className="pt-20 sm:pt-28 pb-6">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              SECURITY ARCHITECTURE &amp; PIPELINE
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight leading-[1.15] mb-4">
              Autonomous Threat Defense Pipeline
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] font-normal leading-relaxed">
              Every incoming network packet destined for Masdika Sidoarjo Edge Datacenter and Cloud VPS is inspected through 4 synchronized layers of autonomous mitigation before reaching your instances.
            </p>
          </div>

          {/* 4-Stage Architecture Pipeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Stage 01 */}
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 p-6 sm:p-7 shadow-sm transition-all duration-300 relative group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    STAGE 01
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Anycast Edge Scrubbing
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Volumetric L3/L4 floods (SYN, UDP, NTP amplification) are absorbed and discarded at our multi-homed BGP upstream carriers before entering Sidoarjo transit routes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                <span>Capacity</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">Up to 3.2 Tbps</span>
              </div>
            </div>

            {/* Stage 02 */}
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 p-6 sm:p-7 shadow-sm transition-all duration-300 relative group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    STAGE 02
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Hardware Core Firewall
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Dual carrier-grade stateful firewalls inspecting packet protocol conformity, drop malformed TCP flags, enforce strict rate limiting, and quarantine rogue subnets.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                <span>Latency Penalty</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">&lt; 0.18 ms</span>
              </div>
            </div>

            {/* Stage 03 */}
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 p-6 sm:p-7 shadow-sm transition-all duration-300 relative group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    STAGE 03
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Autonomous Edge WAF
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Real-time Layer 7 semantic inspection identifying SQLi, XSS, Log4j, Spring4Shell, and path traversal probes. Malicious payloads are dropped instantly with 403 Forbidden.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                <span>Ruleset Sync</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">Sub-Second Live</span>
              </div>
            </div>

            {/* Stage 04 */}
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 p-6 sm:p-7 shadow-sm transition-all duration-300 relative group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    STAGE 04
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Anti-BruteForce &amp; Fail2ban
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Intelligent credential protection that quarantines SSH, database, and portal login abusers. Repeated offenders are blacklisted across all cluster edges automatically.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                <span>Quarantine Policy</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">Permanent WAF Ban</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── 3. BOTTOM CTA: Looking Glass & Cloud Infrastructure ──── */}
        <section className="pt-12 pb-12">
          <div className={cn(
            "rounded-3xl border border-[var(--border-primary)] p-8 sm:p-12 text-center relative overflow-hidden transition-colors duration-200",
            isDark ? "bg-[var(--surface)]" : "bg-white shadow-sm"
          )}>
            <div className="max-w-2xl mx-auto relative z-10">
              <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight mb-4">
                Verify Network Performance &amp; Latency
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
                Run live real-time Ping, Traceroute, and BGP Route lookups directly from Masdika Sidoarjo Edge Datacenter to test routes across global transit peers.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/lg"
                  leftIcon={<Globe className="w-4 h-4 text-slate-950" />}
                >
                  Launch Route Looking Glass
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                  leftIcon={<ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Contact SOC Security Team
                </Button>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
