"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { worldPaths, indonesiaRegionPaths, MapPath } from "@/data/threat-map-geo";

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

// Convert real [lat, lng] to tactical 1000x500 canvas coordinates matching the geo dataset
function projectCoords(lat: number, lng: number, mode: 'world' | 'indonesia'): [number, number] {
  if (mode === 'indonesia') {
    // Indonesian Archipelago Coordinate Bounding Box (matches threat-map-geo.ts)
    const minLng = 94;
    const maxLng = 142;
    const minLat = -12;
    const maxLat = 7;

    const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));

    const x = ((clampedLng - minLng) / (maxLng - minLng)) * 1000;
    const y = ((maxLat - clampedLat) / (maxLat - minLat)) * 500;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
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

  const [region, setRegion] = useState<'indonesia' | 'world'>('indonesia');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [attacks, setAttacks] = useState<AttackEvent[]>([]);
  const [lasers, setLasers] = useState<ActiveLaser[]>([]);
  const [impacts, setImpacts] = useState<ImpactRipple[]>([]);
  const [recentLiveAlert, setRecentLiveAlert] = useState<AttackEvent | null>(null);

  const [stats, setStats] = useState({
    attacksPerSecond: 16,
    blockedIn24h: 854120,
    activeOutbreaks: 142,
    realIncidentsCount: 0,
    threatPosture: "SECURE / PROTECTED",
    edgeStatus: "100% OPERATIONAL",
  });
  const [topThreats, setTopThreats] = useState<any[]>([]);
  const [targetedIndustries, setTargetedIndustries] = useState<any[]>([]);

  // Sequential counters to guarantee 100% unique React keys
  const impactSeqRef = useRef(0);
  const laserSeqRef = useRef(0);
  const seenEventIdsRef = useRef<Set<string>>(new Set());

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

  // Fire laser projectile helper (FortiGuard parabolic trajectory)
  const spawnLaser = (atk: AttackEvent) => {
    const [x1, y1] = projectCoords(atk.sourceCoords[0], atk.sourceCoords[1], region);
    const [x2, y2] = projectCoords(atk.targetCoords[0], atk.targetCoords[1], region);

    // Parabolic arc height
    const dx = Math.abs(x2 - x1);
    const arcHeight = region === 'indonesia' ? Math.max(40, dx * 0.22) : Math.max(65, dx * 0.18);
    const midX = (x1 + x2) / 2;
    const midY = Math.min(y1, y2) - arcHeight;

    const color = atk.isReal
      ? '#ef4444' // Vivid crimson red for verified live attacks
      : atk.severity === 'Critical'
      ? '#f43f5e'
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
      attackName: atk.attackName,
      isReal: atk.isReal,
      sourceIp: atk.sourceIp,
    };

    setLasers(prev => [...prev.slice(-18), newLaser]);

    if (atk.isReal) {
      setRecentLiveAlert(atk);
      setTimeout(() => setRecentLiveAlert(null), 4000);
    }
  };

  // Initial fetch from /api/threats
  useEffect(() => {
    fetch('/api/threats?count=25')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          const fetchedEvents: AttackEvent[] = data.events || [];
          setAttacks(fetchedEvents);
          setStats(data.stats);
          setTopThreats(data.topThreats || []);
          setTargetedIndustries(data.targetedIndustries || []);

          fetchedEvents.forEach(e => seenEventIdsRef.current.add(e.id));

          // Spawn lasers for initial real attacks so user immediately sees them!
          const realOnes = fetchedEvents.filter(e => e.isReal);
          if (realOnes.length > 0) {
            realOnes.slice(0, 3).forEach((atk, idx) => {
              setTimeout(() => spawnLaser(atk), idx * 600);
            });
          } else if (fetchedEvents.length > 0) {
            fetchedEvents.slice(0, 3).forEach((atk, idx) => {
              setTimeout(() => spawnLaser(atk), idx * 500);
            });
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
          const step = laser.isReal ? 0.038 : 0.032;
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
                opacity: 1,
              },
            ];

            if (laser.isReal) {
              newImpacts.push({
                id: `impact-ring-${seq}-${Date.now()}`,
                x: laser.x2,
                y: laser.y2,
                color: '#f59e0b',
                radius: 4,
                opacity: 0.9,
              });
            }

            setImpacts(prev => [...prev.slice(-16), ...newImpacts]);
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
            radius: imp.radius + 1.6,
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
      fetch('/api/threats?count=15')
        .then(res => res.json())
        .then(data => {
          if (data.events && data.events.length > 0) {
            const incoming: AttackEvent[] = data.events;

            // Check if any brand-new real events arrived from DB
            const newEvents = incoming.filter(e => !seenEventIdsRef.current.has(e.id));
            if (newEvents.length > 0) {
              newEvents.forEach(e => seenEventIdsRef.current.add(e.id));
              setAttacks(prev => [...newEvents, ...prev.slice(0, 40)]);

              // Immediately spawn laser for the brand new event
              spawnLaser(newEvents[0]);
            } else {
              // Continuously cycle through events
              const randomPick = incoming[Math.floor(Math.random() * incoming.length)];
              spawnLaser(randomPick);
            }

            if (data.stats) {
              setStats(prev => ({
                ...prev,
                attacksPerSecond: data.stats.attacksPerSecond || Math.floor(Math.random() * 8) + 12,
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

  // Filtered attacks list
  const filteredAttacks = useMemo(() => {
    if (filterSeverity === 'all') return attacks;
    if (filterSeverity === 'real') return attacks.filter(a => a.isReal);
    return attacks.filter(a => a.severity.toLowerCase() === filterSeverity.toLowerCase());
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

        {/* ── 0. HERO (Identik Patokan Looking Glass, SLA, Terms, Privacy & design.md) ── */}
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

              {/* Headline H1 (Ukuran sama persis Looking Glass, Home Page, SLA, Privacy) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Cyber Threat <br />
                Intelligence &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Attack Radar.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Looking Glass) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Visualizing incoming exploit vectors, DDoS floods, and credential brute-force attacks mitigated in real-time across Masdika Sidoarjo Edge Datacenter and global upstream networks.
              </p>

              {/* Action Buttons (size="lg" sama persis Looking Glass) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#radar-cockpit"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
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

                {/* Region Switcher Buttons */}
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
                    <Compass className="w-3.5 h-3.5" />
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
              
              {/* Map Canvas Visualizer (8 Cols) */}
              <div className="lg:col-span-8 p-4 sm:p-6 lg:border-r border-b lg:border-b-0 border-[var(--border-subtle)] flex flex-col justify-between min-h-[500px] sm:min-h-[590px] relative">
                
                {/* HUD Overlay Badges */}
                <div className="absolute top-5 left-5 z-20 flex flex-wrap items-center gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-md",
                    isDark
                      ? "bg-[#08172c]/90 border-cyan-500/40 text-cyan-300"
                      : "bg-white/95 border-cyan-200 text-cyan-700"
                  )}>
                    <Radio className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                    <span>DEFENSE RADAR ONLINE</span>
                  </div>

                  <div className={cn(
                    "px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-md",
                    isDark
                      ? "bg-[#08172c]/90 border-cyan-500/40 text-cyan-300"
                      : "bg-white/95 border-cyan-200 text-cyan-700"
                  )}>
                    <Crosshair className="w-3.5 h-3.5 text-cyan-500" />
                    <span>TARGET: MASDIKA SIDOARJO EDGE</span>
                  </div>

                  {stats.realIncidentsCount > 0 && (
                    <div className="px-3 py-1 rounded-full border border-rose-500/50 bg-rose-500/15 text-rose-500 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm shadow-rose-500/20 backdrop-blur-md animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      <span>{stats.realIncidentsCount} VERIFIED REAL INCIDENTS</span>
                    </div>
                  )}
                </div>

                {/* Instant HUD Alert Banner for Verified Real Attacks */}
                <AnimatePresence>
                  {recentLiveAlert && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="absolute top-16 left-5 z-30 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-rose-600 text-white font-mono text-xs font-bold shadow-lg shadow-rose-600/40 border border-white/20"
                    >
                      <ShieldAlert className="w-4 h-4 text-white animate-bounce" />
                      <span>LIVE INCIDENT: {recentLiveAlert.sourceCity} [{recentLiveAlert.sourceCode}] &rarr; SIDOARJO DATACENTER</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SVG Tactical Vector Map with Real GIS Coastlines */}
                <div className="w-full h-full flex items-center justify-center relative py-6">
                  <svg
                    viewBox="0 0 1000 500"
                    className="w-full h-auto max-h-[520px] select-none"
                  >
                    <defs>
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

                    {/* Radar Coordinate Grid & Concentric Scanning Rings */}
                    <circle cx="500" cy="250" r="140" fill="none" stroke={isDark ? "#06b6d4" : "#0284c7"} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.22" />
                    <circle cx="500" cy="250" r="260" fill="none" stroke={isDark ? "#06b6d4" : "#0284c7"} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.16" />
                    <circle cx="500" cy="250" r="380" fill="none" stroke={isDark ? "#06b6d4" : "#0284c7"} strokeWidth="0.5" strokeDasharray="5,5" opacity="0.1" />

                    {/* Map Coordinate Parallels & Meridians */}
                    <line x1="40" y1="250" x2="960" y2="250" stroke={isDark ? "#0ea5e9" : "#0284c7"} strokeWidth="0.5" strokeDasharray="2,4" opacity="0.2" />
                    <line x1="500" y1="20" x2="500" y2="480" stroke={isDark ? "#0ea5e9" : "#0284c7"} strokeWidth="0.5" strokeDasharray="2,4" opacity="0.2" />

                    {/* Real Geographic Vector Map Outlines */}
                    {region === 'indonesia' ? (
                      /* Indonesia Region: High-Fidelity GIS Archipelago + Neighbors */
                      <g className="transition-all duration-700 ease-in-out">
                        {indonesiaRegionPaths.map((poly) => {
                          const isID = poly.isIndonesia;
                          return (
                            <path
                              key={poly.id}
                              d={poly.d}
                              fill={
                                isID
                                  ? isDark ? "#102a4e" : "#cbd5e1"
                                  : isDark ? "#071628" : "#f1f5f9"
                              }
                              stroke={
                                isID
                                  ? isDark ? "#00f0ff" : "#0284c7"
                                  : isDark ? "#1b3860" : "#94a3b8"
                              }
                              strokeWidth={isID ? "1.8" : "0.8"}
                              opacity={isID ? 0.95 : 0.45}
                              className="transition-colors duration-300"
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
                          
                          {/* Staggered Leader Label below node to avoid overlaps */}
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
                      /* World View: Real Natural Earth GIS Countries */
                      <g className="transition-all duration-700 ease-in-out">
                        {worldPaths.map((country) => {
                          const isID = country.id === 'IDN';
                          return (
                            <path
                              key={country.id}
                              d={country.d}
                              fill={
                                isID
                                  ? isDark ? "#00f0ff30" : "#0284c730"
                                  : isDark ? "#0c233f" : "#cbd5e1"
                              }
                              stroke={
                                isID
                                  ? isDark ? "#00f0ff" : "#0284c7"
                                  : isDark ? "#0ea5e9" : "#0284c7"
                              }
                              strokeWidth={isID ? "1.8" : "0.7"}
                              opacity={isID ? 1 : 0.8}
                              className="transition-colors duration-300"
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

                    {/* Animated FortiGuard Parabolic Laser Arcs */}
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
                            strokeWidth={laser.isReal ? "3.2" : "1.4"}
                            strokeDasharray={laser.isReal ? "8,4" : "5,4"}
                            opacity={laser.isReal ? "0.95" : "0.45"}
                          />

                          {/* Source Origin Beacon */}
                          <circle cx={laser.x1} cy={laser.y1} r={laser.isReal ? "5.5" : "3.5"} fill={laser.color} opacity="0.95" />
                          {laser.isReal && (
                            <circle cx={laser.x1} cy={laser.y1} r="10" fill="none" stroke={laser.color} strokeWidth="1" className="animate-ping" />
                          )}

                          {/* Missile / Laser Head Projectile */}
                          <circle cx={currentX} cy={currentY} r={laser.isReal ? "6.5" : "4.5"} fill="#ffffff" stroke={laser.color} strokeWidth={laser.isReal ? "3.5" : "2"} />
                          <circle cx={currentX} cy={currentY} r={laser.isReal ? "16" : "9"} fill={laser.color} opacity={laser.isReal ? "0.6" : "0.35"} />

                          {/* Real Attack HUD Callout */}
                          {laser.isReal && (
                            <g transform={`translate(${currentX}, ${currentY - 22})`}>
                              <rect x="-95" y="-12" width="190" height="22" rx="4" fill="#ef4444" opacity="0.95" stroke="#ffffff" strokeWidth="1" />
                              <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                LIVE ATTACK: {laser.sourceCity} [{laser.sourceCode}]
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Impact Shockwaves on Target Hit (Guaranteed Unique Keys) */}
                    {impacts.map(impact => (
                      <circle
                        key={impact.id}
                        cx={impact.x}
                        cy={impact.y}
                        r={impact.radius}
                        fill="none"
                        stroke={impact.color}
                        strokeWidth="2.5"
                        opacity={impact.opacity}
                      />
                    ))}
                  </svg>
                </div>

                {/* Legend Bar Bottom */}
                <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 text-rose-500 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
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

                  <div className="text-[var(--text-secondary)]">
                    Direct SOC Telemetry: Sidoarjo Edge Datacenter (AS63859)
                  </div>
                </div>

              </div>

              {/* Right Sidebars: Top Threats & Targeted Sectors (4 Cols) */}
              <div className={cn(
                "lg:col-span-4 p-4 sm:p-6 space-y-6 transition-colors duration-200",
                isDark ? "bg-[#061222]/95" : "bg-white"
              )}>
                
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
                    {topThreats.map((threat, idx) => (
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
                                ? "bg-gradient-to-r from-rose-500 to-amber-400"
                                : "bg-gradient-to-r from-cyan-500 to-cyan-300"
                            )}
                            style={{ width: `${threat.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Targeted Industries */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-[var(--border-subtle)] pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      Top Targeted Sectors
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">Telemetry</span>
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
                            className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                            style={{ width: `${ind.percent}%` }}
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
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
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
                    { key: 'real', label: `Verified Live Attacks (${stats.realIncidentsCount})` },
                    { key: 'critical', label: 'Critical' },
                    { key: 'high', label: 'High' },
                    { key: 'medium', label: 'Medium' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterSeverity(tab.key)}
                      className={cn(
                        "px-2.5 py-1 rounded-md uppercase font-bold text-[10px] transition-all",
                        filterSeverity === tab.key
                          ? tab.key === 'real'
                            ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
                            : "bg-cyan-500 text-slate-950 shadow-sm"
                          : "border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)]"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Streaming Table */}
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
                      {filteredAttacks.slice(0, 12).map((atk) => (
                        <motion.tr
                          key={atk.id}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "transition-colors",
                            atk.isReal
                              ? "bg-rose-500/10 hover:bg-rose-500/15 border-l-2 border-rose-500"
                              : "hover:bg-[var(--surface-secondary)]"
                          )}
                        >
                          <td className="py-2.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                            {atk.timestamp}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-[var(--text-primary)] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {atk.isReal && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-500/40 flex items-center gap-1">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  VERIFIED ATTACK
                                </span>
                              )}
                              <span>{atk.attackName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1.5 font-bold">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                                  {atk.sourceCode}
                                </span>
                                <span className={atk.isReal ? "text-rose-600 dark:text-rose-300 font-bold" : "text-[var(--text-primary)]"}>
                                  {atk.sourceCity}
                                </span>
                              </span>
                              {atk.sourceIp && (
                                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                                  IP: {atk.sourceIp}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-300">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                                {atk.targetCode}
                              </span>
                              <span>{atk.targetCity}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                atk.severity === 'Critical'
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                  : atk.severity === 'High'
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30"
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

      </main>
    </div>
  );
}
