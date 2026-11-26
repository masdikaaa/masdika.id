"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Globe,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import type { DnsStatsSnapshot } from "@/lib/powerdns";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";

export interface DnsPublicInfo {
  enabled: boolean;
  configured: boolean;
  nameservers: string[];
  resolver: string;
  publicIp: string;
}

interface QpsSample {
  time: string;
  qps: number;
  cacheQps: number;
}

type SetupTabId = "linux" | "mikrotik" | "doh" | "windows";

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

export default function DnsPublicClient({
  publicInfo,
  initialStats,
}: {
  publicInfo: DnsPublicInfo;
  initialStats: DnsStatsSnapshot;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SetupTabId>("linux");
  const [stats, setStats] = useState<DnsStatsSnapshot>(initialStats);
  const [livePolling, setLivePolling] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
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
            qps: 0,
            cacheQps: 0,
          },
        ]
      : []
  );

  const prevSampleRef = useRef<{
    queries: number;
    cacheHits: number;
    timestamp: number;
  } | null>(
    initialStats.available && initialStats.timestamp
      ? {
          queries: initialStats.queries ?? 0,
          cacheHits: initialStats.cacheHits ?? 0,
          timestamp: initialStats.timestamp,
        }
      : null
  );

  const pollStats = useCallback(async (manual = false) => {
    if (manual) setIsManualRefreshing(true);
    try {
      const res = await fetch("/api/public/dns/stats", { cache: "no-store" });
      if (!res.ok) return;
      const next: DnsStatsSnapshot = await res.json();
      setStats(next);

      if (next.available && next.timestamp) {
        const prev = prevSampleRef.current;
        const nowQueries = next.queries ?? 0;
        const nowCacheHits = next.cacheHits ?? 0;
        let qps = 0;
        let cacheQps = 0;

        if (prev && next.timestamp > prev.timestamp) {
          const dtSec = Math.max(1, (next.timestamp - prev.timestamp) / 1000);
          qps = Number((Math.max(0, nowQueries - prev.queries) / dtSec).toFixed(2));
          cacheQps = Number((Math.max(0, nowCacheHits - prev.cacheHits) / dtSec).toFixed(2));
        }

        prevSampleRef.current = {
          queries: nowQueries,
          cacheHits: nowCacheHits,
          timestamp: next.timestamp,
        };

        const timeLabel = new Date(next.timestamp).toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setQpsHistory((cur) => [...cur.slice(-19), { time: timeLabel, qps, cacheQps }]);
      }
    } catch {
      // Ignore transient polling errors
    } finally {
      if (manual) setIsManualRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!livePolling) return;
    const warm = setTimeout(() => {
      pollStats(false);
    }, 1500);
    const id = setInterval(() => {
      pollStats(false);
    }, 5000);
    return () => {
      clearTimeout(warm);
      clearInterval(id);
    };
  }, [livePolling, pollStats]);

  const latestQps = qpsHistory.length > 0 ? qpsHistory[qpsHistory.length - 1].qps : 0;
  const maxQps = useMemo(() => {
    const peak = Math.max(...qpsHistory.map((s) => Math.max(s.qps, s.cacheQps)), 1);
    return Math.ceil(peak * 1.2);
  }, [qpsHistory]);

  const chartGeometry = useMemo(() => {
    const W = 560;
    const H = 170;
    const padX = 8;
    const padY = 14;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;

    if (qpsHistory.length === 0) {
      return { W, H, totalLine: "", totalArea: "", cacheLine: "", points: [] as { x: number; y: number; qps: number }[] };
    }

    const pts = qpsHistory.map((s, idx) => {
      const x =
        qpsHistory.length === 1
          ? padX + innerW
          : padX + (idx / (qpsHistory.length - 1)) * innerW;
      const y = padY + innerH - Math.min(1, s.qps / maxQps) * innerH;
      const cy = padY + innerH - Math.min(1, s.cacheQps / maxQps) * innerH;
      return { x, y, cy, qps: s.qps };
    });

    const totalLine = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const cacheLine = pts.map((p) => `${p.x.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");
    const firstX = pts[0].x.toFixed(1);
    const lastX = pts[pts.length - 1].x.toFixed(1);
    const bottomY = (padY + innerH).toFixed(1);
    const totalArea = `${firstX},${bottomY} ${totalLine} ${lastX},${bottomY}`;

    return { W, H, totalLine, totalArea, cacheLine, points: pts };
  }, [qpsHistory, maxQps]);

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

  const setupTabs: { id: SetupTabId; label: string; command: string }[] = [
    {
      id: "linux",
      label: "Linux / systemd-resolved",
      command: `# Set Masdika SafeDNS as your system resolver\nsudo mkdir -p /etc/systemd/resolved.conf.d\ncat << 'EOF' | sudo tee /etc/systemd/resolved.conf.d/masdika-dns.conf\n[Resolve]\nDNS=${resolverIp}\nFallbackDNS=1.1.1.1\nDNSOverTLS=no\nEOF\nsudo systemctl restart systemd-resolved\nresolvectl status`,
    },
    {
      id: "mikrotik",
      label: "MikroTik RouterOS",
      command: `# Standard UDP/TCP DNS Resolver\n/ip dns set servers=${resolverIp} allow-remote-requests=yes cache-size=8192KiB\n\n# Or Encrypted DNS-over-HTTPS (DoH)\n/ip dns set use-doh-server=${dohUrl} verify-doh-cert=yes`,
    },
    {
      id: "doh",
      label: "DNS-over-HTTPS (DoH)",
      command: `# Browser / Mobile / CLI DNS-over-HTTPS Endpoint\n${dohUrl}\n\n# Verify with curl (RFC 8484 DNS JSON / Wireformat)\ncurl -sH "accept: application/dns-json" "${dohUrl}?name=masdika.id&type=A"`,
    },
    {
      id: "windows",
      label: "Windows (PowerShell)",
      command: `# Apply Masdika SafeDNS to your active network adapter\nGet-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {\n  Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ("${resolverIp}", "1.1.1.1")\n}\nClear-DnsClientCache`,
    },
  ];

  const activeSetup = setupTabs.find((t) => t.id === activeTab) ?? setupTabs[0];

  return (
    <div className="flex flex-col min-h-screen pt-28 sm:pt-36 md:pt-40 pb-10 sm:pb-14 overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 relative">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full opacity-[0.12] dark:opacity-[0.18] blur-[140px]"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1 space-y-16 sm:space-y-24">
        {/* 1. HERO SECTION */}
        <section className="relative pt-0 pb-4 sm:pb-8 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start w-full">
            <div className="max-w-2xl relative z-30 lg:pt-20">
              <div className="mb-8">
                <Badge
                  variant="brand"
                  dot
                  dotColor={isOperational ? "bg-emerald-400" : "bg-amber-400"}
                  size="md"
                  className="font-mono uppercase text-[10px] sm:text-xs"
                >
                  {isOperational
                    ? `DNS NETWORK OPERATIONAL · ${resolverHost.toUpperCase()}`
                    : `SAFEDNS & AUTHORITATIVE · ${resolverHost.toUpperCase()}`}
                </Badge>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                SafeDNS Resolver. <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Authoritative DNS.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Sub-millisecond cached public DNS resolver with SafeDNS filtering and DNS-over-HTTPS, paired with
                instant-propagation authoritative nameservers and DNSSEC.
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
                  href="#resolver-setup"
                  leftIcon={<Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Configure Resolver
                </Button>
              </div>
            </div>

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

        {/* 1.5 LIVE DNS TELEMETRY & REALTIME GRAPHS */}
        {stats.available && (
          <section className="relative z-10">
            <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      livePolling ? "bg-cyan-400" : "bg-[var(--text-secondary)]"
                    }`}
                  />
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-primary)] whitespace-nowrap">
                    Live DNS Edge Telemetry
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 font-mono text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap shrink-0">
                    {livePolling ? "Realtime API · 5s" : "Paused"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
                  {stats.timestamp && (
                    <span className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                      Updated: {new Date(stats.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLivePolling((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/40 cursor-pointer transition-colors whitespace-nowrap"
                      title={livePolling ? "Pause live polling" : "Resume live polling"}
                    >
                      {livePolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{livePolling ? "Pause" : "Live"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => pollStats(true)}
                      disabled={isManualRefreshing}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/40 cursor-pointer transition-colors disabled:opacity-60"
                      title="Refresh DNS stats now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isManualRefreshing ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/60 space-y-1.5 min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] truncate">
                    Total Queries
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono whitespace-nowrap">
                      {formatCompactCount(stats.queries ?? 0)}
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                      {latestQps.toFixed(1)} qps
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-mono leading-snug">
                    {formatCompactCount(stats.rdQueries ?? 0)} rec · {formatCompactCount(stats.authQueries ?? 0)} auth
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/60 space-y-1.5 min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] truncate">
                    Cache Hit Ratio
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-500 font-mono whitespace-nowrap">
                    {(stats.cacheHitRatio ?? 0).toFixed(1)}%
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--border-primary)] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, stats.cacheHitRatio ?? 0)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/60 space-y-1.5 min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] truncate">
                    Avg Edge Latency
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-500 font-mono whitespace-nowrap">
                    {formatLatencyUs(stats.latencyAvgUs ?? 0)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-mono leading-snug">
                    {formatCompactCount(stats.cacheHits ?? 0)} cache hits
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/60 space-y-1.5 min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] truncate">
                    Edge Uptime
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono whitespace-nowrap">
                    {formatUptime(stats.uptimeSec ?? 0)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-mono leading-snug">
                    {formatCompactCount(stats.blockedOrDropped ?? 0)} ACL drops
                  </div>
                </div>
              </div>

              {/* Realtime Graphs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {/* Graph 1: Live QPS Time-Series */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/40 space-y-4 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        Realtime Query Throughput (QPS)
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                        Rolling 5s interval ({qpsHistory.length}/20 samples)
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                      <span className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                        Total QPS
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-cyan-200/70 shrink-0" />
                        Cache Hits/s
                      </span>
                    </div>
                  </div>

                  <div className="relative w-full h-[170px]">
                    <svg
                      viewBox={`0 0 ${chartGeometry.W} ${chartGeometry.H}`}
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="dnsQpsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines */}
                      {[0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = 14 + (170 - 28) * (1 - ratio);
                        return (
                          <line
                            key={ratio}
                            x1={8}
                            x2={chartGeometry.W - 8}
                            y1={y}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity="0.1"
                            strokeDasharray="4 4"
                          />
                        );
                      })}

                      {chartGeometry.totalArea && (
                        <polygon points={chartGeometry.totalArea} fill="url(#dnsQpsFill)" />
                      )}
                      {chartGeometry.cacheLine && (
                        <polyline
                          fill="none"
                          stroke="#a5f3fc"
                          strokeOpacity="0.7"
                          strokeWidth="1.75"
                          strokeDasharray="5 4"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={chartGeometry.cacheLine}
                        />
                      )}
                      {chartGeometry.totalLine && (
                        <polyline
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={chartGeometry.totalLine}
                        />
                      )}
                      {chartGeometry.points.length > 0 && (() => {
                        const last = chartGeometry.points[chartGeometry.points.length - 1];
                        return (
                          <circle
                            cx={last.x}
                            cy={last.y}
                            r="4"
                            fill="#06b6d4"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        );
                      })()}
                    </svg>

                    <div className="absolute top-1 right-2 text-[10px] font-mono text-[var(--text-secondary)]">
                      Peak: {maxQps} qps
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                    <span>{qpsHistory[0]?.time || "--:--:--"}</span>
                    <span>Live: {latestQps.toFixed(2)} req/s</span>
                    <span>{qpsHistory[qpsHistory.length - 1]?.time || "--:--:--"}</span>
                  </div>
                </div>

                {/* Graph 2: Latency Distribution & Response Breakdown */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/40 space-y-4 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        Query Latency Distribution
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                        dnsdist response time buckets
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold whitespace-nowrap shrink-0">
                      Avg {formatLatencyUs(stats.latencyAvgUs ?? 0)}
                    </span>
                  </div>

                  <div className="space-y-2.5">
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

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                    <span>NOERROR: {formatCompactCount(stats.noerrorAnswers ?? 0)}</span>
                    <span>NXDOMAIN: {formatCompactCount(stats.nxdomainAnswers ?? 0)}</span>
                    <span>SERVFAIL: {formatCompactCount(stats.servfailAnswers ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. TWO CORE DNS SERVICES */}
        <section id="services" className="relative z-10 space-y-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
              CORE DNS INFRASTRUCTURE
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
              Two Dedicated Services, One Network
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
              Use our public SafeDNS resolver for fast, filtered lookups on any device, or point your domains to our
              authoritative cluster for zero-delay record updates.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Public SafeDNS Resolver */}
            <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-5 sm:p-8 flex flex-col justify-between gap-6 shadow-sm min-w-0">
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
                        PUBLIC RECURSIVE RESOLVER
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
                        Masdika SafeDNS
                      </h3>
                    </div>
                  </div>
                  <Badge variant="brand" size="sm" dot dotColor="bg-cyan-400" className="whitespace-nowrap shrink-0">
                    Free Public
                  </Badge>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Powered by <span className="font-semibold text-[var(--text-primary)]">dnsdist</span> and{" "}
                  <span className="font-semibold text-[var(--text-primary)]">PowerDNS Recursor</span> with an
                  in-memory packet cache and SafeDNS / TrustPositif blocklists to stop malicious and restricted domains
                  at the edge.
                </p>

                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                    Standard DNS (UDP / TCP 53)
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] font-mono text-sm">
                    <code className="text-[var(--text-primary)] font-semibold">{resolverIp}</code>
                    <button
                      type="button"
                      onClick={() => copyText(resolverIp, "resolver-ip")}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-500 cursor-pointer transition-colors"
                      title="Copy Resolver IP"
                    >
                      {copiedId === "resolver-ip" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] pt-1">
                    DNS-over-HTTPS (DoH)
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] font-mono text-xs sm:text-sm">
                    <code className="text-[var(--text-primary)] truncate">{dohUrl}</code>
                    <button
                      type="button"
                      onClick={() => copyText(dohUrl, "doh-url")}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-500 cursor-pointer transition-colors shrink-0"
                      title="Copy DoH Endpoint"
                    >
                      {copiedId === "doh-url" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-[var(--text-secondary)]">
                  {[
                    "SafeDNS content & malware filtering",
                    "<1ms hot packet cache hits",
                    "DNS-over-HTTPS (RFC 8484) TLS",
                    "ANY & AXFR amplification protection",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Edge rate-limiting &amp; anti-DDoS enabled</span>
                <a
                  href="#resolver-setup"
                  className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  Setup Guide <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Card 2: Authoritative DNS */}
            <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-5 sm:p-8 flex flex-col justify-between gap-6 shadow-sm min-w-0">
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                      <Server className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
                        AUTHORITATIVE NAMESERVERS
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
                        Masdika Authoritative DNS
                      </h3>
                    </div>
                  </div>
                  <Badge variant="brand" size="sm" className="whitespace-nowrap shrink-0">
                    DNSSEC Ready
                  </Badge>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Host your domain zones on{" "}
                  <span className="font-semibold text-[var(--text-primary)]">PowerDNS Authoritative</span> with
                  instant propagation, one-click DNSSEC key signing, and full record control directly from the Masdika
                  Cloud dashboard.
                </p>

                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                    Authoritative Nameserver Targets
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {nameservers.map((ns) => (
                      <div
                        key={ns}
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] font-mono text-sm"
                      >
                        <code className="text-cyan-600 dark:text-cyan-400 font-semibold truncate">{ns}</code>
                        <button
                          type="button"
                          onClick={() => copyText(ns, `ns-${ns}`)}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-500 cursor-pointer transition-colors shrink-0"
                          title={`Copy ${ns}`}
                        >
                          {copiedId === `ns-${ns}` ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-[var(--text-secondary)]">
                  {[
                    "Instant 0s zone record propagation",
                    "ECDSAP256SHA256 DNSSEC & DS keys",
                    "A, AAAA, CNAME, MX, TXT, SRV, CAA",
                    "AXFR zone transfers locked by default",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Included for Masdika Cloud accounts</span>
                <a
                  href="/dashboard/dns"
                  className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  Add Domain Zone <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 3. QUICK SETUP SNIPPETS */}
        <section id="resolver-setup" className="relative z-10 space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
              QUICK CONFIGURATION
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
              Start Using Masdika SafeDNS
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
              Point your Linux server, MikroTik router, Windows workstation, or browser DoH client to{" "}
              <code className="font-mono text-cyan-600 dark:text-cyan-400">{resolverIp}</code>.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                  {activeSetup.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyText(activeSetup.command, `setup-${activeSetup.id}`)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/40 cursor-pointer transition-colors"
              >
                {copiedId === `setup-${activeSetup.id}` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface)] flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {setupTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={
                    activeTab === t.id
                      ? "px-3 py-1 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
                      : "px-3 py-1 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            <pre className="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto whitespace-pre [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[var(--text-primary)]">
              {activeSetup.command}
            </pre>
          </div>
        </section>

        {/* 4. ARCHITECTURE */}
        <section className="relative z-10 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
              ROUTING ARCHITECTURE
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
              Built for Low Latency &amp; Protection
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step: "01",
                icon: ShieldCheck,
                title: "dnsdist Edge Router",
                desc: "Inspects incoming UDP/TCP 53 and DoH queries, enforces per-IP rate limits, drops ANY/AXFR abuse, and serves hot responses directly from packet cache.",
              },
              {
                step: "02",
                icon: Activity,
                title: "SafeDNS Recursor",
                desc: "Resolves uncached recursive lookups with DNSSEC validation and filters blocked or malicious hostnames in real time.",
              },
              {
                step: "03",
                icon: Globe,
                title: "Authoritative Backend",
                desc: "Serves your custom domain zones with instant API updates, automatic SOA serial increments, and DNSSEC signing.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="p-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">STEP {s.step}</span>
                  <s.icon className="w-4 h-4 text-cyan-500" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. BOTTOM CTA */}
        <section className="relative z-10">
          <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-sm">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 block">
                MASDIKA CLOUD NETWORKING
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Ready to Point Your Domain to Masdika DNS?
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)]">
                Create your DNS zone in seconds, manage records with zero propagation delay, or inspect our network
                routing from Looking Glass.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button variant="primary" size="lg" href="/dashboard/dns" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Open DNS Console
              </Button>
              <Button variant="secondary" size="lg" href="/lg" leftIcon={<Globe className="w-4 h-4" />}>
                Looking Glass
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
