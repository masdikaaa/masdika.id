"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Cpu,
  Database,
  Filter,
  Gauge,
  GitBranch,
  Globe,
  KeyRound,
  Laptop,
  Layers,
  Lock,
  MemoryStick,
  Network,
  Pause,
  Play,
  Radio,
  Route,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Wifi,
  Zap,
} from "lucide-react";
import type { IconType } from "react-icons";
import { SiApple, SiLinux, SiMikrotik } from "react-icons/si";
import { FaWindows } from "react-icons/fa";
import type { DnsHistoryRange, DnsHistoryResponse, DnsStatsSnapshot } from "@/lib/powerdns";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FaqSection } from "@/components/ui/FaqSection";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { GlowCtaCard } from "@/components/ui/GlowCtaCard";
import { FadeIn } from "@/components/animations/FadeIn";

export interface DnsPublicInfo {
  enabled: boolean;
  configured: boolean;
  nameservers: string[];
  resolver: string;
  publicIp: string;
}

interface QpsSample {
  time: string;
  resolverQps: number;
  authQps: number;
}

type SetupTabId = "linux" | "macos" | "windows" | "mikrotik" | "doh";
type ChartRange = "live" | DnsHistoryRange;

function formatCompactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatUptime(sec: number): string {
  if (!sec || sec <= 0) return "0m";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatLatencyUs(us: number): string {
  if (!us || us <= 0) return "< 1 ms";
  if (us < 1000) return `${Math.round(us)} µs`;
  return `${(us / 1000).toFixed(2)} ms`;
}

type LookupRecordType = "A" | "AAAA" | "MX" | "TXT" | "NS" | "CNAME" | "SOA";

interface DnsLookupResult {
  domain: string;
  type: LookupRecordType;
  server: string;
  latencyMs: number;
  status: string;
  filtered: boolean;
  records: { value: string; ttl?: number }[];
  message?: string;
}

const DNS_LOOKUP_TYPES: LookupRecordType[] = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"];

const DNS_FAQS: { q: string; a: string }[] = [
  {
    q: "What is the difference between SafeDNS Resolver and DNS Pointing?",
    a: "SafeDNS Resolver (103.247.10.61) is a public recursive DNS endpoint you configure on servers, MikroTik routers, Windows, or browsers (via DoH) to resolve the open internet while filtering ads, phishing, and malware domains at zero cost. DNS Pointing (ns1.masdika.id & ns2.masdika.id) is authoritative zone hosting where you manage your own domain's A, AAAA, CNAME, MX, TXT, and SRV records.",
  },
  {
    q: "Do I need a Masdika Cloud account to use SafeDNS (103.247.10.61)?",
    a: "No account or registration is required for SafeDNS Resolver or DNS-over-HTTPS (https://dns.masdika.id/dns-query). Any device, VPS, or office router can point to 103.247.10.61 immediately. Authoritative DNS zones in the DNS Console are included free for Masdika accounts.",
  },
  {
    q: "How fast do DNS record edits go live on ns1.masdika.id and ns2.masdika.id?",
    a: "Updates committed through the Masdika DNS Console write straight into PowerDNS LMDB shards with an automatic SOA serial increment, activating in 0 seconds on ns1 and ns2. New records default to a 60-second TTL so external resolvers pick up changes rapidly.",
  },
  {
    q: "How does SafeDNS handle blocked domains and false positives?",
    a: "When a queried hostname matches our daily-synced 637K+ threat and tracker blocklist, dnsdist and PowerDNS Recursor sinkhole the lookup to 0.0.0.0 (IPv4) or :: (IPv6) right at the resolver layer without injecting forged web pages or touching TLS traffic.",
  },
  {
    q: "Does Masdika DNS support DNSSEC and DNS-over-HTTPS (DoH)?",
    a: "Yes. Every authoritative zone hosted on ns1/ns2 supports 1-click ECDSA P-256 (ECDSAP256SHA256) DNSSEC key generation and DS record export. On the resolver side, SafeDNS serves encrypted RFC 8484 DNS-over-HTTPS at https://dns.masdika.id/dns-query.",
  },
];

export default function DnsPublicClient({
  publicInfo,
  initialStats,
}: {
  publicInfo: DnsPublicInfo;
  initialStats: DnsStatsSnapshot;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SetupTabId>("linux");
  const [flowMode, setFlowMode] = useState<"recursive" | "authoritative">("recursive");
  const [stats, setStats] = useState<DnsStatsSnapshot>(initialStats);
  const [livePolling, setLivePolling] = useState(true);
  const [streamConnected, setStreamConnected] = useState<boolean>(Boolean(initialStats.available));
  const [chartRange, setChartRange] = useState<ChartRange>("live");
  const [historyData, setHistoryData] = useState<DnsHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const [lookupDomain, setLookupDomain] = useState("masdika.id");
  const [lookupType, setLookupType] = useState<LookupRecordType>("A");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<DnsLookupResult | null>(null);

  const runDnsLookup = useCallback(async (targetDomain: string, targetType: LookupRecordType) => {
    const clean = targetDomain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    if (!clean) {
      setLookupError("Enter a domain name to query (for example: masdika.id).");
      return;
    }
    setLookupDomain(clean);
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(
        `/api/public/dns/lookup?domain=${encodeURIComponent(clean)}&type=${encodeURIComponent(targetType)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data?.error || "DNS lookup failed");
        setLookupResult(null);
      } else {
        setLookupResult(data as DnsLookupResult);
      }
    } catch {
      setLookupError("Unable to reach the DNS lookup probe right now.");
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  }, []);

  const [qpsHistory, setQpsHistory] = useState<QpsSample[]>(() =>
    initialStats.available && initialStats.timestamp
      ? [
          {
            time: new Date(initialStats.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            resolverQps: 0,
            authQps: 0,
          },
        ]
      : []
  );

  const prevSampleRef = useRef<{
    rdQueries: number;
    authQueries: number;
    timestamp: number;
  } | null>(
    initialStats.available && initialStats.timestamp
      ? {
          rdQueries: initialStats.rdQueries ?? 0,
          authQueries: initialStats.authQueries ?? 0,
          timestamp: initialStats.timestamp,
        }
      : null
  );

  const applyStatsUpdate = useCallback((next: DnsStatsSnapshot) => {
    setStats(next);
    if (next.available) {
      setStreamConnected(true);
    }

    if (next.available && next.timestamp) {
      const prev = prevSampleRef.current;
      const nowRd = next.rdQueries ?? 0;
      const nowAuth = next.authQueries ?? 0;
      let resolverQps = 0;
      let authQps = 0;

      if (prev && next.timestamp > prev.timestamp) {
        const dtSec = Math.max(0.5, (next.timestamp - prev.timestamp) / 1000);
        resolverQps = Number((Math.max(0, nowRd - prev.rdQueries) / dtSec).toFixed(2));
        authQps = Number((Math.max(0, nowAuth - prev.authQueries) / dtSec).toFixed(2));
      }

      prevSampleRef.current = {
        rdQueries: nowRd,
        authQueries: nowAuth,
        timestamp: next.timestamp,
      };

      const timeLabel = new Date(next.timestamp).toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setQpsHistory((cur) => [...cur.slice(-29), { time: timeLabel, resolverQps, authQps }]);
    }
  }, []);

  useEffect(() => {
    if (!livePolling) {
      setStreamConnected(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const r = await fetch(`/api/public/dns/stats?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!cancelled && r.ok) {
          const data: DnsStatsSnapshot = await r.json();
          applyStatsUpdate(data);
        }
      } catch {
        if (!cancelled) setStreamConnected(false);
      } finally {
        inFlight = false;
      }
    };

    tick();
    const timer = setInterval(tick, 1000);

    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [livePolling, applyStatsUpdate]);

  useEffect(() => {
    if (chartRange === "live") return;
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/public/dns/history?range=${chartRange}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DnsHistoryResponse | null) => {
        if (!cancelled && data) setHistoryData(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chartRange]);

  const latestSample = qpsHistory.length > 0 ? qpsHistory[qpsHistory.length - 1] : { resolverQps: 0, authQps: 0 };
  const latestTotalQps = Number((latestSample.resolverQps + latestSample.authQps).toFixed(2));

  const activeSeries = useMemo(() => {
    if (chartRange === "live") {
      return qpsHistory.map((s) => ({
        label: s.time,
        resolverVal: s.resolverQps,
        authVal: s.authQps,
      }));
    }
    return (historyData?.points ?? []).map((p) => ({
      label: p.label,
      resolverVal: p.resolverQueries,
      authVal: p.authQueries,
    }));
  }, [chartRange, qpsHistory, historyData]);

  const maxChartVal = useMemo(() => {
    const peak = Math.max(...activeSeries.map((s) => Math.max(s.resolverVal, s.authVal)), 0);
    if (chartRange === "live") {
      if (peak <= 0) return 1;
      if (peak < 1) return Number(Math.max(0.5, peak * 1.25).toFixed(2));
      return Math.ceil(peak * 1.2);
    }
    return Math.max(10, Math.ceil(peak * 1.2));
  }, [activeSeries, chartRange]);

  const chartGeometry = useMemo(() => {
    const W = 560;
    const H = 180;
    const padX = 10;
    const padY = 16;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const bottomY = padY + innerH;

    const toSmoothLine = (coords: { x: number; y: number }[]) => {
      if (coords.length === 0) return "";
      if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
      let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i === 0 ? 0 : i - 1];
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const p3 = coords[i + 2 < coords.length ? i + 2 : coords.length - 1];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = Math.min(bottomY, Math.max(padY, p1.y + (p2.y - p0.y) / 6));
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = Math.min(bottomY, Math.max(padY, p2.y - (p3.y - p1.y) / 6));
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    };

    if (activeSeries.length === 0) {
      return {
        W,
        H,
        padX,
        padY,
        bottomY,
        resolverLine: "",
        resolverArea: "",
        authLine: "",
        authArea: "",
        points: [] as { x: number; y: number; ay: number }[],
      };
    }

    const pts = activeSeries.map((s, idx) => {
      const x =
        activeSeries.length === 1
          ? padX + innerW
          : padX + (idx / (activeSeries.length - 1)) * innerW;
      const y = padY + innerH - Math.min(1, s.resolverVal / maxChartVal) * innerH;
      const ay = padY + innerH - Math.min(1, s.authVal / maxChartVal) * innerH;
      return { x, y, ay };
    });

    const resolverLine = toSmoothLine(pts.map((p) => ({ x: p.x, y: p.y })));
    const authLine = toSmoothLine(pts.map((p) => ({ x: p.x, y: p.ay })));
    const firstX = pts[0].x.toFixed(1);
    const lastX = pts[pts.length - 1].x.toFixed(1);
    const resolverArea = `${resolverLine} L ${lastX} ${bottomY.toFixed(1)} L ${firstX} ${bottomY.toFixed(1)} Z`;
    const authArea = `${authLine} L ${lastX} ${bottomY.toFixed(1)} L ${firstX} ${bottomY.toFixed(1)} Z`;

    return { W, H, padX, padY, bottomY, resolverLine, resolverArea, authLine, authArea, points: pts };
  }, [activeSeries, maxChartVal]);

  const resolverIp = publicInfo.publicIp || "103.247.10.61";
  const resolverHost =
    publicInfo.resolver && /[a-zA-Z]/.test(publicInfo.resolver)
      ? publicInfo.resolver
      : "dns1.masdika.id";
  const dohUrl = `https://${resolverHost}/dns-query`;
  const nameservers =
    publicInfo.nameservers.length > 0
      ? publicInfo.nameservers
      : ["ns1.masdika.id", "ns2.masdika.id"];

  const isOperational = publicInfo.enabled && publicInfo.configured;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
  };

  const setupTabs: { id: SetupTabId; label: string; hint: string; command: string }[] = [
    {
      id: "linux",
      label: "Linux",
      hint: "Configure systemd-resolved on Ubuntu, Debian, or AlmaLinux.",
      command: `sudo mkdir -p /etc/systemd/resolved.conf.d\ncat << 'EOF' | sudo tee /etc/systemd/resolved.conf.d/masdika-dns.conf\n[Resolve]\nDNS=${resolverIp}\nFallbackDNS=1.1.1.1\nEOF\nsudo systemctl restart systemd-resolved`,
    },
    {
      id: "macos",
      label: "macOS",
      hint: "Apply Masdika SafeDNS to your Wi-Fi interface on macOS.",
      command: `networksetup -setdnsservers Wi-Fi ${resolverIp} 1.1.1.1\nsudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`,
    },
    {
      id: "windows",
      label: "Windows",
      hint: "Run in an elevated PowerShell window to switch your active adapter.",
      command: `Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {\n  Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ("${resolverIp}", "1.1.1.1")\n}\nClear-DnsClientCache`,
    },
    {
      id: "mikrotik",
      label: "MikroTik",
      hint: "Apply SafeDNS or encrypted DoH directly on RouterOS.",
      command: `# Standard UDP/TCP DNS\n/ip dns set servers=${resolverIp} allow-remote-requests=yes cache-size=8192KiB\n\n# Encrypted DNS-over-HTTPS (DoH)\n/ip dns set use-doh-server=${dohUrl} verify-doh-cert=yes`,
    },
    {
      id: "doh",
      label: "Browser / DoH",
      hint: "Paste this RFC 8484 endpoint into Chrome, Firefox, or iOS/Android.",
      command: `# DNS-over-HTTPS Endpoint\n${dohUrl}\n\n# Test via curl\ncurl -sH "accept: application/dns-message" "${dohUrl}?dns=AAABAAABAAAAAAAAA21hc2Rpa2ECaWQAAAEAAQ" | wc -c`,
    },
  ];

  const activeSetup = setupTabs.find((t) => t.id === activeTab) ?? setupTabs[0];

  return (
    <div className="flex flex-col min-h-screen pt-28 sm:pt-36 md:pt-40 pb-12 sm:pb-16 overflow-x-hidden text-[var(--text-primary)] transition-colors duration-300 relative">

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative pt-0 pb-8 sm:pb-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start w-full">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl relative z-30 lg:pt-20"
            >
              <div className="mb-8">
                <Badge
                  variant="brand"
                  dot
                  dotColor={isOperational ? "bg-emerald-400" : "bg-amber-400"}
                  size="md"
                  className="font-mono uppercase text-[10px] sm:text-xs"
                >
                  {isOperational
                    ? `DNS NETWORK ONLINE · ${resolverHost.toUpperCase()}`
                    : `SAFEDNS & AUTHORITATIVE · ${resolverHost.toUpperCase()}`}
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                SafeDNS &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Cloud DNS.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Protect every device with a fast, filtered public resolver - or point your domains to nameservers that
                update the moment you hit save.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/dns"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Manage DNS Zones
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#quick-setup-terminal"
                  leftIcon={<Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Quick Setup
                </Button>
              </div>
            </motion.div>

            <div className="relative flex items-center justify-center mt-6 lg:mt-0 lg:self-center">
              <HeroAvatarFrame
                imageSrc="/images/dns-hero.webp"
                imageAlt="Masdika SafeDNS Resolver and Authoritative DNS"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: ShieldCheck, label: "SafeDNS Resolver", value: "Filtered + DoH Ready" },
                  { icon: Zap, label: "Edge Cache", value: "<1ms Packet Lookup" },
                  { icon: Globe, label: "Authoritative", value: "Instant 0s Sync" },
                  { icon: Lock, label: "Security", value: "DNSSEC & Anti-Abuse" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* 2. TWO DNS SERVICES SIDE-BY-SIDE + QUICK SETUP */}
        <section id="dns-console" className="scroll-mt-24 py-10 sm:py-14 relative z-10 space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              CORE DNS SERVICES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              SafeDNS Resolver &amp; Authoritative Pointing
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Use our filtered public DNS resolver on any device or router, or point your domain nameservers for zero-delay
              DNS management.
            </p>
          </div>

          {/* Service Cards Side-by-Side (Both Always Visible) */}
          <div data-gsap-stagger className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SafeDNS Public Resolver Card */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
              />
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
                        PUBLIC RECURSIVE RESOLVER
                      </span>
                      <h3 className="text-xl font-black text-[var(--text-primary)]">Masdika SafeDNS</h3>
                    </div>
                  </div>
                  <Badge variant="brand" size="sm" dot dotColor="bg-emerald-400" className="whitespace-nowrap shrink-0">
                    Free Public
                  </Badge>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Point your Linux servers, MikroTik routers, Wi-Fi, or browsers to{" "}
                  <span className="font-semibold text-[var(--text-primary)]">Masdika SafeDNS</span> for fast cached
                  resolution with automatic filtering of phishing, malware, and TrustPositif-restricted domains.
                </p>

                <div className="space-y-2.5">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                      Standard DNS IP (UDP / TCP 53)
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(resolverIp, "resolver-ip")}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 font-mono text-sm transition-colors cursor-pointer group"
                    >
                      <code className="text-[var(--text-primary)] font-semibold">{resolverIp}</code>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] group-hover:text-cyan-500 shrink-0">
                        {copiedId === "resolver-ip" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-cyan-500" />
                            <span className="text-cyan-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </span>
                    </button>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                      Encrypted DNS-over-HTTPS (DoH)
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(dohUrl, "doh-url")}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 font-mono text-xs sm:text-sm transition-colors cursor-pointer group"
                    >
                      <code className="text-[var(--text-primary)] truncate">{dohUrl}</code>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] group-hover:text-cyan-500 shrink-0">
                        {copiedId === "doh-url" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-cyan-500" />
                            <span className="text-cyan-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span>637,390+ SafeDNS rules · &lt;1ms cache · Serve-Stale</span>
                <a
                  href="#quick-setup-terminal"
                  className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  Setup Guide <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Authoritative DNS Card */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
              />
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                      <Server className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
                        AUTHORITATIVE NAMESERVERS
                      </span>
                      <h3 className="text-xl font-black text-[var(--text-primary)]">DNS Pointing (Authoritative)</h3>
                    </div>
                  </div>
                  <Badge variant="brand" size="sm" className="whitespace-nowrap shrink-0">
                    DNSSEC Ready
                  </Badge>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Register your domain in the Masdika DNS Console, then point your registrar nameservers to our{" "}
                  <span className="font-semibold text-[var(--text-primary)]">LMDB-backed PowerDNS cluster</span> for
                  instant 0-second record updates and 1-click ECDSA DNSSEC.
                </p>

                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                    Nameserver Targets (NS1 &amp; NS2)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {nameservers.map((ns, i) => (
                      <button
                        key={ns}
                        type="button"
                        onClick={() => copyText(ns, `ns-${ns}`)}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 font-mono text-sm transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase">NS{i + 1}</span>
                          <code className="text-cyan-600 dark:text-cyan-400 font-semibold truncate">{ns}</code>
                        </div>
                        <span className="inline-flex items-center text-xs text-[var(--text-secondary)] group-hover:text-cyan-500 shrink-0">
                          {copiedId === `ns-${ns}` ? (
                            <Check className="w-3.5 h-3.5 text-cyan-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 text-xs text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
                    <span>Supports A, AAAA, CNAME, MX, TXT, NS, SRV &amp; CAA</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400">AXFR Locked</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span>Works with PANDI, WHMCS, Namecheap &amp; Porkbun</span>
                <a
                  href="/dashboard/dns"
                  className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  Manage Zones <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2.2 DEDICATED CLIENT SETUP GUIDE SECTION */}
        <section id="quick-setup-terminal" className="scroll-mt-24 py-10 sm:py-14 relative z-10 space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              CLIENT CONFIGURATION GUIDE
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Configure SafeDNS in Seconds
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Apply Masdika SafeDNS ({resolverIp}) across Linux servers, macOS, Windows, MikroTik RouterOS, or any DoH-compatible browser.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)]/95 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/25">
            {/* Top Window Bar */}
            <div className="px-4 sm:px-5 py-3 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]/85 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <span className="font-mono text-xs font-semibold text-[var(--text-secondary)] truncate">
                  {activeTab}-safedns.{activeTab === "windows" ? "ps1" : "sh"}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border border-cyan-500/25 bg-cyan-500/10 text-cyan-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Anycast Ready
                </span>
              </div>

              <button
                type="button"
                onClick={() => copyText(activeSetup.command, `setup-${activeSetup.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer transition-colors shrink-0"
              >
                {copiedId === `setup-${activeSetup.id}` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-cyan-500" />
                    <span className="text-cyan-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>

            {/* Unified IDE-Style Split Body */}
            <div className="flex flex-col md:flex-row">
              {/* Left Vertical Platform Rail */}
              <div className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-[var(--border-primary)] bg-[var(--surface-secondary)]/40 p-2.5 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="hidden md:block px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[var(--text-secondary)]/80 font-semibold">
                  Target Platform
                </div>
                {setupTabs.map((t) => {
                  const isActive = activeTab === t.id;
                  const iconMap: Record<SetupTabId, IconType> = {
                    linux: SiLinux,
                    macos: SiApple,
                    windows: FaWindows,
                    mikrotik: SiMikrotik,
                    doh: Globe,
                  };
                  const PlatformIcon = iconMap[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={
                        isActive
                          ? "px-3 py-2 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/35 whitespace-nowrap shrink-0 cursor-pointer transition-all text-left flex items-center justify-between gap-2"
                          : "px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/70 border border-transparent whitespace-nowrap shrink-0 cursor-pointer transition-colors text-left flex items-center justify-between gap-2"
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <PlatformIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.label}</span>
                      </span>
                      {isActive && <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Right Code Pane + Inline Endpoint Strip */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="px-4 sm:px-6 py-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                  <span>{activeSetup.hint}</span>
                  <span className="font-mono text-[11px] text-cyan-500 hidden sm:inline">
                    # Test: dig doubleclick.net @{resolverIp} +short
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.pre
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 p-4 sm:p-6 bg-[var(--surface-secondary)]/25 font-mono text-xs sm:text-[13px] leading-6 overflow-x-auto whitespace-pre [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[var(--text-primary)]"
                  >
                    {activeSetup.command}
                  </motion.pre>
                </AnimatePresence>

                <div className="px-4 sm:px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: "ep-v4", label: "IPv4", value: resolverIp },
                      { id: "ep-doh", label: "DoH", value: "https://dns.masdika.id/dns-query" },
                      { id: "ep-dot", label: "DoT", value: "dns.masdika.id:853" },
                    ].map((ep) => (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => copyText(ep.value, ep.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                      >
                        <span className="text-cyan-500 font-bold">{ep.label}:</span>
                        <span>{ep.value}</span>
                        {copiedId === ep.id ? (
                          <Check className="w-3 h-3 text-cyan-500" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60" />
                        )}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    No-Logs · DNSSEC · 637K+ Rules
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2.5 LIVE DIAGNOSTIC PROBE (VPS Section Blueprint) */}
        <section id="dns-lookup" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              LIVE DIAGNOSTIC PROBE
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Real-Time DNS Lookup &amp; SafeDNS Check
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
              Query any domain live through <span className="font-mono font-semibold text-[var(--text-primary)]">{resolverIp}</span> to verify record propagation, TTLs, or threat sinkholing.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs text-[var(--text-secondary)] shadow-sm">
              <span>
                <strong className="text-[var(--text-primary)]">Tip:</strong> Try{" "}
                <button
                  type="button"
                  onClick={() => {
                    setLookupType("A");
                    runDnsLookup("doubleclick.net", "A");
                  }}
                  className="font-mono font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  doubleclick.net
                </button>{" "}
                to see SafeDNS sinkhole blocking (<code className="font-mono">0.0.0.0</code>), or test{" "}
                <button
                  type="button"
                  onClick={() => {
                    setLookupType("MX");
                    runDnsLookup("cloudflare.com", "MX");
                  }}
                  className="font-mono font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  cloudflare.com MX
                </button>
                .
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-5 flex flex-col justify-between gap-4 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold">
                    QUICK TEST PRESETS
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                    Click to Run Instant Probe
                  </h3>
                </div>
                <Zap className="w-4 h-4 text-cyan-500 shrink-0" />
              </div>

              <div className="space-y-2">
                {[
                  {
                    domain: "masdika.id",
                    type: "SOA" as LookupRecordType,
                    tag: "Authoritative",
                    desc: "Verify primary zone SOA & serial propagation",
                  },
                  {
                    domain: "doubleclick.net",
                    type: "A" as LookupRecordType,
                    tag: "SafeDNS Block",
                    desc: "Test RPZ tracker sinkhole (returns 0.0.0.0)",
                  },
                  {
                    domain: "cloudflare.com",
                    type: "MX" as LookupRecordType,
                    tag: "Mail Routing",
                    desc: "Inspect live MX priority & TTL caching",
                  },
                  {
                    domain: "google.com",
                    type: "AAAA" as LookupRecordType,
                    tag: "IPv6 Stack",
                    desc: "Verify dual-stack AAAA recursive resolution",
                  },
                ].map((preset) => (
                  <button
                    key={`${preset.domain}-${preset.type}`}
                    type="button"
                    onClick={() => {
                      setLookupType(preset.type);
                      runDnsLookup(preset.domain, preset.type);
                    }}
                    className="w-full text-left rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/55 hover:border-cyan-500/45 hover:bg-[var(--surface-secondary)] p-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                        {preset.domain} ({preset.type})
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-colors">
                        {preset.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{preset.desc}</p>
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                <span>Edge: Sidoarjo (AS63859)</span>
                <span className="text-cyan-500">dnsdist + RPZ</span>
              </div>
            </div>

            <div className="lg:col-span-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)]/95 backdrop-blur-sm shadow-xl shadow-black/20 overflow-hidden flex flex-col">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runDnsLookup(lookupDomain, lookupType);
                }}
                className="p-4 sm:p-5 flex flex-col xl:flex-row items-stretch xl:items-center gap-3"
              >
                <div className="relative flex-1 min-w-0">
                  <Globe className="w-4 h-4 text-[var(--text-secondary)]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={lookupDomain}
                    onChange={(e) => setLookupDomain(e.target.value)}
                    placeholder="Enter domain or hostname (e.g. masdika.id)"
                    aria-label="Domain name to lookup"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 transition-all"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <div className="grid grid-cols-7 sm:inline-flex items-center rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-1 h-11 w-full sm:w-auto">
                    {DNS_LOOKUP_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setLookupType(t)}
                        className={
                          lookupType === t
                            ? "px-2 sm:px-2.5 h-full rounded-lg text-[10px] sm:text-[11px] font-mono font-bold bg-cyan-400 text-slate-950 shadow-sm cursor-pointer transition-all text-center flex items-center justify-center"
                            : "px-2 sm:px-2.5 h-full rounded-lg text-[10px] sm:text-[11px] font-mono font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors text-center flex items-center justify-center"
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={lookupLoading}
                    leftIcon={<Search className="w-4 h-4" />}
                    className="w-full sm:w-auto justify-center shrink-0 h-11 px-5"
                  >
                    {lookupLoading ? "Querying..." : "Lookup"}
                  </Button>
                </div>
              </form>

            <AnimatePresence mode="wait">
              {lookupError && (
                <motion.div
                  key="lookup-err"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 sm:px-8 py-4 border-t border-[var(--border-subtle)] text-xs sm:text-sm font-mono text-rose-500 bg-rose-500/5"
                >
                  {lookupError}
                </motion.div>
              )}

              {!lookupResult && !lookupError && (
                <motion.div
                  key="lookup-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/25 p-5 sm:p-6 flex flex-col justify-between gap-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full bg-cyan-400 ${lookupLoading ? "animate-ping" : ""}`} />
                      <span className="text-[var(--text-primary)] font-semibold">
                        {lookupLoading ? "QUERYING EDGE RESOLVER..." : "PROBE READY"}
                      </span>
                    </span>
                    <span>Resolver: {resolverIp} · DNSSEC Enabled</span>
                  </div>

                  <div className="my-auto py-4 text-center max-w-md mx-auto space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-500 mx-auto">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {lookupLoading ? `Resolving ${lookupDomain} (${lookupType})...` : "Live Authoritative & Recursive Probe"}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Enter any domain above or select a preset on the left to inspect live DNS records, authoritative TTLs, and SafeDNS sinkhole status.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
                    {[
                      { label: "NOERROR", desc: "Valid record answer" },
                      { label: "SAFE-DNS BLOCK", desc: "Sinkholed to 0.0.0.0" },
                      { label: "NXDOMAIN", desc: "Domain not found" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)]/70 px-3 py-2 flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-cyan-500/25 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] truncate">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {lookupResult && !lookupError && (
                <motion.div
                  key={`${lookupResult.domain}-${lookupResult.type}-${lookupResult.latencyMs}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]"
                >
                  <div className="px-6 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[var(--surface-secondary)]/50">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={
                          lookupResult.filtered
                            ? "px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold"
                            : lookupResult.status === "NOERROR"
                              ? "px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold"
                              : "px-2.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-500 font-bold"
                        }
                      >
                        {lookupResult.filtered ? "BLOCKED BY SAFEDNS" : lookupResult.status}
                      </span>
                      <span className="text-[var(--text-primary)] font-semibold">
                        {lookupResult.domain} ({lookupResult.type})
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                      <span>Server: {lookupResult.server}</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{lookupResult.latencyMs} ms</span>
                    </div>
                  </div>

                  {lookupResult.records.length > 0 ? (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {lookupResult.records.map((rec, i) => (
                        <motion.div
                          key={`${rec.value}-${i}`}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.04 }}
                          className="px-6 sm:px-8 py-3.5 flex items-center justify-between gap-4 font-mono text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 shrink-0 w-12">
                              {lookupResult.type}
                            </span>
                            <span className="text-[var(--text-primary)] break-all">{rec.value}</span>
                          </div>
                          <span className="text-xs text-[var(--text-secondary)] shrink-0">
                            {rec.ttl !== undefined ? `TTL ${rec.ttl}s` : "-"}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 sm:px-8 py-4 text-xs sm:text-sm font-mono text-[var(--text-secondary)]">
                      {lookupResult.message || "No records returned for this query."}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </section>

        {/* 3. LIVE DNS TELEMETRY & HISTORY */}
        {stats.available && (
          <section className="py-10 sm:py-14 relative z-10 space-y-6">
            <div className="text-center max-w-3xl mx-auto mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                REAL-TIME EDGE TELEMETRY
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-3">
                Live Network Pulse
              </h2>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Live 1-second metrics streamed straight from our edge dnsdist packet cache and LMDB shards.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    livePolling ? "bg-cyan-400" : "bg-[var(--text-secondary)]"
                  }`}
                />
                <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                  Edge Stream Status
                </span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 font-mono text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap shrink-0">
                  {!livePolling ? "Paused" : streamConnected ? "Live · 1s" : "Reconnecting..."}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {stats.timestamp && (
                  <span className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                    Updated: {new Date(stats.timestamp).toLocaleTimeString()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setLivePolling((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/40 cursor-pointer transition-colors whitespace-nowrap"
                >
                  {livePolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{livePolling ? "Pause" : "Live"}</span>
                </button>
              </div>
            </div>

            {/* Clean Hairline KPI Strip (no heavy nested boxes) */}
            {(() => {
              const totalQ = Math.max(1, stats.queries ?? 0);
              const recPct = (((stats.rdQueries ?? 0) / totalQ) * 100).toFixed(1);
              const authPct = (((stats.authQueries ?? 0) / totalQ) * 100).toFixed(1);
              return (
                <div data-gsap-stagger className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-[var(--border-subtle)]">
                  <div className="p-4 sm:p-5 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold truncate">
                        SafeDNS Resolver
                      </span>
                      <Filter className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] font-mono whitespace-nowrap">
                        {formatCompactCount(stats.rdQueries ?? 0)}
                      </span>
                      <span className="text-xs font-mono font-semibold text-cyan-500 whitespace-nowrap">
                        {latestSample.resolverQps.toFixed(1)} qps
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                      {resolverIp} · {recPct}% traffic
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold truncate">
                        DNS Pointing (Auth)
                      </span>
                      <Network className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] font-mono whitespace-nowrap">
                        {formatCompactCount(stats.authQueries ?? 0)}
                      </span>
                      <span className="text-xs font-mono font-semibold text-cyan-500 whitespace-nowrap">
                        {latestSample.authQps.toFixed(1)} qps
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                      ns1/ns2 · {authPct}% traffic
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] truncate">
                        Packet Cache Hit
                      </span>
                      <Gauge className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-cyan-500 font-mono whitespace-nowrap">
                      {(stats.cacheHitRatio ?? 0).toFixed(1)}%
                    </div>
                    <div className="w-full h-1 rounded-full bg-[var(--border-primary)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, stats.cacheHitRatio ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] truncate">
                        Edge Latency
                      </span>
                      <Activity className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-cyan-500 font-mono whitespace-nowrap">
                      {formatLatencyUs(stats.latencyAvgUs ?? 0)}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                      Up {formatUptime(stats.uptimeSec ?? 0)} · {formatCompactCount(stats.blockedOrDropped ?? 0)} drops
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Graph 1: Smooth Spline Time-Series */}
              <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] space-y-4 min-w-0">
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        {chartRange === "live"
                          ? "Realtime Queries/sec (Resolver vs Pointing)"
                          : `Query History - ${chartRange.toUpperCase()} (Resolver vs Pointing)`}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                        {chartRange === "live"
                          ? `1s live stream (${qpsHistory.length}/30 samples)`
                          : historyLoading
                            ? "Loading historical telemetry..."
                            : `${historyData?.sampleCount ?? 0} snapshots recorded`}
                      </div>
                    </div>

                    <div className="inline-flex items-center rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-0.5 shrink-0">
                      {(
                        [
                          { id: "live", label: "Live" },
                          { id: "1d", label: "1D" },
                          { id: "7d", label: "7D" },
                          { id: "30d", label: "30D" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setChartRange(opt.id)}
                          className={
                            chartRange === opt.id
                              ? "px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-cyan-400 text-slate-950 cursor-pointer transition-colors"
                              : "px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                      SafeDNS Resolver
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-cyan-200/70 shrink-0" />
                      DNS Pointing
                    </span>
                  </div>
                </div>

                <div
                  className="relative w-full h-[180px] select-none"
                  onMouseLeave={() => setHoveredIdx(null)}
                  onMouseMove={(e) => {
                    if (activeSeries.length <= 1) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setHoveredIdx(Math.round(ratio * (activeSeries.length - 1)));
                  }}
                >
                  <svg
                    viewBox={`0 0 ${chartGeometry.W} ${chartGeometry.H}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="dnsQpsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="dnsAuthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = chartGeometry.padY + (chartGeometry.bottomY - chartGeometry.padY) * (1 - ratio);
                      return (
                        <line
                          key={ratio}
                          x1={chartGeometry.padX}
                          x2={chartGeometry.W - chartGeometry.padX}
                          y1={y}
                          y2={y}
                          stroke="currentColor"
                          strokeOpacity={ratio === 0 ? "0.18" : "0.08"}
                          strokeDasharray={ratio === 0 ? undefined : "4 4"}
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}

                    {chartGeometry.authArea && <path d={chartGeometry.authArea} fill="url(#dnsAuthFill)" />}
                    {chartGeometry.resolverArea && <path d={chartGeometry.resolverArea} fill="url(#dnsQpsFill)" />}
                    {chartGeometry.authLine && (
                      <path
                        fill="none"
                        stroke="#a5f3fc"
                        strokeOpacity="0.85"
                        strokeWidth="2"
                        strokeDasharray="5 4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        d={chartGeometry.authLine}
                      />
                    )}
                    {chartGeometry.resolverLine && (
                      <path
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        d={chartGeometry.resolverLine}
                      />
                    )}

                    {(() => {
                      const activeIdx =
                        hoveredIdx !== null && hoveredIdx < chartGeometry.points.length
                          ? hoveredIdx
                          : chartGeometry.points.length - 1;
                      if (activeIdx < 0 || hoveredIdx === null) return null;
                      const pt = chartGeometry.points[activeIdx];
                      return (
                        <line
                          x1={pt.x}
                          x2={pt.x}
                          y1={chartGeometry.padY}
                          y2={chartGeometry.bottomY}
                          stroke="#22d3ee"
                          strokeOpacity="0.35"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })()}
                  </svg>

                  {/* Perfectly circular HTML indicator dots (immune to SVG aspect-ratio stretching) */}
                  {(() => {
                    const activeIdx =
                      hoveredIdx !== null && hoveredIdx < chartGeometry.points.length
                        ? hoveredIdx
                        : chartGeometry.points.length - 1;
                    if (activeIdx < 0) return null;
                    const pt = chartGeometry.points[activeIdx];
                    const xPct = (pt.x / chartGeometry.W) * 100;
                    const yPct = (pt.y / chartGeometry.H) * 100;
                    const ayPct = (pt.ay / chartGeometry.H) * 100;
                    return (
                      <>
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-200 border-[1.5px] border-zinc-950 shadow-sm z-10"
                          style={{ left: `${xPct}%`, top: `${ayPct}%` }}
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-500 border-2 border-white shadow-[0_0_8px_rgba(6,182,212,0.7)] z-10"
                          style={{ left: `${xPct}%`, top: `${yPct}%` }}
                        />
                      </>
                    );
                  })()}

                  {hoveredIdx !== null && activeSeries[hoveredIdx] && (
                    <div className="pointer-events-none absolute top-2 left-2 rounded-xl border border-cyan-500/30 bg-[var(--surface)]/95 backdrop-blur-md px-3 py-2 text-[11px] font-mono shadow-lg space-y-0.5 z-20">
                      <div className="text-[var(--text-secondary)] font-semibold">{activeSeries[hoveredIdx].label}</div>
                      <div className="flex items-center gap-2 text-cyan-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>
                          Resolver: {activeSeries[hoveredIdx].resolverVal}
                          {chartRange === "live" ? " qps" : " req"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-200/80" />
                        <span>
                          Pointing: {activeSeries[hoveredIdx].authVal}
                          {chartRange === "live" ? " qps" : " req"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-1 right-2 text-[10px] font-mono text-[var(--text-secondary)]">
                    Peak: {chartRange === "live" ? `${maxChartVal} qps` : `${formatCompactCount(maxChartVal)} req`}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                  <span>{activeSeries[0]?.label || "--:--:--"}</span>
                  <span>
                    {chartRange === "live"
                      ? `Total: ${latestTotalQps.toFixed(2)} req/s`
                      : `Window: ${formatCompactCount(historyData?.totals.totalQueries ?? 0)} queries`}
                  </span>
                  <span>{activeSeries[activeSeries.length - 1]?.label || "--:--:--"}</span>
                </div>
              </div>

              {/* Graph 2: Latency Distribution */}
              <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] flex flex-col justify-between gap-4 min-w-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--text-primary)]">Query Latency Distribution</div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                        dnsdist edge response buckets
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold whitespace-nowrap shrink-0">
                      Avg {formatLatencyUs(stats.latencyAvgUs ?? 0)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const buckets = stats.latencyBuckets ?? [];
                      const totalBucketCount = Math.max(
                        1,
                        buckets.reduce((acc, b) => acc + b.count, 0)
                      );
                      return buckets.map((b, idx) => {
                        const pct = (b.count / totalBucketCount) * 100;
                        const barColor =
                          idx === 0
                            ? "bg-cyan-400"
                            : idx === 1
                              ? "bg-cyan-500/85"
                              : idx === 2
                                ? "bg-cyan-600/75"
                                : "bg-cyan-700/65";
                        return (
                          <div key={b.label} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-[var(--text-primary)] font-semibold">{b.label}</span>
                              <span className="text-[var(--text-secondary)]">
                                {formatCompactCount(b.count)} ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[var(--border-primary)] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor} transition-all duration-500`}
                                style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                  <span>Total: {formatCompactCount(stats.queries ?? 0)}</span>
                  <span>Hits: {formatCompactCount(stats.cacheHits ?? 0)}</span>
                  <span>Misses: {formatCompactCount(stats.cacheMisses ?? 0)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. INTERACTIVE DNS RESOLUTION PIPELINE (Original DNS Architecture) */}
        <section id="features" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              DNS ENGINE ARCHITECTURE
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Inside Every Sub-Millisecond Query
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
              Inspect how Masdika routes SafeDNS recursive lookups and PowerDNS LMDB authoritative zone answers at the Sidoarjo edge.
            </p>

            <div className="flex flex-col sm:inline-flex sm:flex-row items-stretch sm:items-center rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] p-1 shadow-sm w-full sm:w-auto gap-1 sm:gap-0">
              {(
                [
                  { id: "recursive", label: `SafeDNS (${resolverIp})` },
                  { id: "authoritative", label: "Authoritative (ns1 / ns2)" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFlowMode(tab.id)}
                  className={
                    flowMode === tab.id
                      ? "relative px-4 py-2 rounded-lg text-xs font-bold text-slate-950 cursor-pointer whitespace-nowrap"
                      : "relative px-4 py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors whitespace-nowrap"
                  }
                >
                  {flowMode === tab.id && (
                    <motion.span
                      layoutId="dnsFlowPill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 rounded-lg bg-cyan-400"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div data-no-gsap className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-10 shadow-xl space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={flowMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="relative grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch"
              >
                <div
                  aria-hidden="true"
                  className="hidden md:block absolute top-11 left-[12%] right-[12%] h-px bg-gradient-to-r from-cyan-500/20 via-cyan-400/60 to-cyan-500/20"
                />
                {(flowMode === "recursive"
                  ? [
                      {
                        step: "HOP 01",
                        icon: Laptop,
                        tag: "UDP/53 · DoH",
                        title: "Client Query Arrives",
                        desc: "Sent from your router, Linux server, Windows workstation, or browser RFC 8484 DoH endpoint.",
                      },
                      {
                        step: "HOP 02",
                        icon: ShieldAlert,
                        tag: "637K+ Rules",
                        title: "Edge Filter & Rate Guard",
                        desc: "dnsdist shunts ANY amplification to TCP, enforces per-IP limits, and sinkholes malicious hosts to 0.0.0.0.",
                      },
                      {
                        step: "HOP 03",
                        icon: MemoryStick,
                        tag: "<1 ms Hit",
                        title: "500K RAM Packet Cache",
                        desc: "Hot domains answer directly from lock-free C++ memory cache with serve-stale failover if upstream lags.",
                      },
                      {
                        step: "HOP 04",
                        icon: GitBranch,
                        tag: "DNSSEC Check",
                        title: "Recursive Iteration",
                        desc: "Uncached lookups walk root and TLD authorities with full cryptographic DNSSEC validation.",
                      },
                    ]
                  : [
                      {
                        step: "STAGE 01",
                        icon: SlidersHorizontal,
                        tag: "DNS Console",
                        title: "Save Record Changes",
                        desc: "Edit A, AAAA, CNAME, MX, TXT, SRV, or CAA records from the dashboard or REST API.",
                      },
                      {
                        step: "STAGE 02",
                        icon: Database,
                        tag: "0s Lock-Free",
                        title: "PowerDNS LMDB Commit",
                        desc: "Writes directly to memory-mapped LMDB shards with an automatic SOA serial increment and zero SQL locking.",
                      },
                      {
                        step: "STAGE 03",
                        icon: Radio,
                        tag: "AXFR Locked",
                        title: "Live on ns1 & ns2",
                        desc: "Both authoritative nameservers serve updated zone records instantly while blocking unauthorized zone transfers.",
                      },
                      {
                        step: "STAGE 04",
                        icon: Route,
                        tag: "60s Default TTL",
                        title: "Rapid Edge Rollout",
                        desc: "Short default 60-second TTLs ensure global resolvers pick up production IP swaps without stale caches.",
                      },
                    ]
                ).map((hop) => (
                  <motion.div
                    key={hop.step}
                    whileHover={{ y: -3 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="relative z-10 p-5 sm:p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/70 flex flex-col justify-between gap-4 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                          <hop.icon className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 font-mono text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                          {hop.tag}
                        </span>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                          {hop.step}
                        </div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">{hop.title}</h3>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{hop.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            <div className="pt-6 border-t border-[var(--border-subtle)] grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 font-mono">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">API Sync</span>
                <span className="text-sm font-bold text-cyan-500">0s Instant</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Packet Cache</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">&lt;1 ms · 500K Slots</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Default TTL</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">60 Seconds</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">DNSSEC Alg</span>
                <span className="text-sm font-bold text-cyan-500">ECDSA P-256</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. USE CASES (Matches /vps Section 5 Blueprint) */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              NETWORK USE CASES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Built for Every Network Workload
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              Whether filtering office Wi-Fi or serving production Kubernetes domains, Masdika DNS adapts effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Wifi,
                title: "Routers, LAN & Personal Devices",
                desc: "Configure 103.247.10.61 once on MikroTik DHCP, Windows, or systemd-resolved to block trackers and malware across every client.",
              },
              {
                icon: Layers,
                title: "SaaS & Production Domains",
                desc: "Manage apex A/AAAA, CNAME targets, SPF/DKIM TXT records, and MX mail routing with fast 60s default TTLs and ECDSA DNSSEC.",
              },
              {
                icon: Cpu,
                title: "CI/CD & ACME Automation",
                desc: "Publish verification records from Masdika DNS Console for instant zero-wait TLS issuance and zero propagation delays.",
              },
            ].map((item, idx) => (
              <FadeIn key={item.title} delay={idx * 0.1} direction="up" className="h-full">
                <div className="p-8 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-200 h-full flex flex-col justify-between group shadow-sm">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 group-hover:scale-105 transition-transform">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* 6. SUPPORTED RECORD MATRIX & REGISTRAR DELEGATION (Original DNS Reference) */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              RECORD MATRIX &amp; DELEGATION
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Supported Record Types &amp; Registrar Setup
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              Full RFC-compliant record control backed by automatic SOA management and registrar-ready nameserver delegation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Authoritative Record Specification
                </span>
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                  Default TTL: 60s
                </span>
              </div>
              <div data-gsap-stagger className="divide-y divide-[var(--border-subtle)] text-xs sm:text-sm">
                {[
                  { type: "A / AAAA", role: "IPv4 & IPv6 host mapping", example: "@ -> 45.198.149.x" },
                  { type: "CNAME", role: "Subdomain canonical alias target", example: "www -> app.masdika.id." },
                  { type: "MX", role: "Mail server priority routing", example: "10 mail.yourdomain.id." },
                  { type: "TXT", role: "SPF, DKIM, DMARC & ACME TLS-01", example: "v=spf1 a mx ~all" },
                  { type: "SRV", role: "Service port & protocol discovery", example: "_sip._tcp -> 0 5 5060 sip." },
                  { type: "CAA", role: "Restrict trusted TLS certificate CAs", example: '0 issue "letsencrypt.org"' },
                  { type: "NS", role: "Sub-zone delegation nameservers", example: "sub -> ns1.masdika.id." },
                ].map((rec) => (
                  <div
                    key={rec.type}
                    className="px-5 sm:px-6 py-3.5 flex flex-col sm:grid sm:grid-cols-12 gap-1.5 sm:gap-3 sm:items-center"
                  >
                    <div className="flex items-center justify-between sm:contents">
                      <span className="sm:col-span-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {rec.type}
                      </span>
                      <span className="sm:col-span-5 text-[var(--text-primary)] font-medium text-right sm:text-left">
                        {rec.role}
                      </span>
                    </div>
                    <code className="sm:col-span-4 sm:text-right font-mono text-xs text-[var(--text-secondary)] break-all sm:truncate">
                      {rec.example}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold">
                      REGISTRAR DELEGATION
                    </div>
                    <h3 className="text-lg font-black text-[var(--text-primary)]">
                      Switch Nameservers Zero-Downtime
                    </h3>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {[
                    "Create your domain zone inside DNS Console and replicate existing A/MX/TXT records first.",
                    "Clear any old DS records at PANDI, Namecheap, or Porkbun before switching NS.",
                    "Set custom nameservers to ns1.masdika.id and ns2.masdika.id.",
                    "Enable 1-click ECDSA P-256 DNSSEC in Masdika Console and paste the new DS record back.",
                  ].map((step) => (
                    <div key={step} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-mono text-[var(--text-secondary)]">PANDI · Cloudflare · Porkbun</span>
                <a
                  href="/dashboard/dns"
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  Open DNS Console <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FREQUENTLY ASKED QUESTIONS (Placed before Bottom CTA) */}
        <FaqSection faqs={DNS_FAQS} />

        {/* 8. BOTTOM CTA CARD (Always final section above footer) */}
        <section className="py-10 sm:py-14 relative z-10 w-full">
          <GlowCtaCard>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 block">
                  MASDIKA CLOUD NETWORKING
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight leading-tight">
                  Ready to Point Your Domain to Masdika DNS?
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  Create your DNS zone in seconds, manage records with zero propagation delay, or test latency and
                  routing from our Looking Glass.
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-500" /> Free for Masdika accounts
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-500" /> 1-click DNSSEC
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-500" /> 0s record sync
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Button variant="primary" size="lg" href="/dashboard/dns" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Open DNS Console
                </Button>
                <Button variant="secondary" size="lg" href="/lg" leftIcon={<Compass className="w-4 h-4" />}>
                  Looking Glass
                </Button>
              </div>
            </div>
          </GlowCtaCard>
        </section>
      </div>
    </div>
  );
}
