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
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import type { DnsHistoryRange, DnsHistoryResponse, DnsStatsSnapshot } from "@/lib/powerdns";
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
  resolverQps: number;
  authQps: number;
}

type SetupTabId = "linux" | "mikrotik" | "doh" | "windows";
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
  const [streamConnected, setStreamConnected] = useState<boolean>(Boolean(initialStats.available));
  const [chartRange, setChartRange] = useState<ChartRange>("live");
  const [historyData, setHistoryData] = useState<DnsHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
    {
      id: "windows",
      label: "Windows",
      hint: "Run in an elevated PowerShell window to switch your active adapter.",
      command: `Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {\n  Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ("${resolverIp}", "1.1.1.1")\n}\nClear-DnsClientCache`,
    },
  ];

  const activeSetup = setupTabs.find((t) => t.id === activeTab) ?? setupTabs[0];

  return (
    <div className="flex flex-col min-h-screen pt-28 sm:pt-36 md:pt-40 pb-12 sm:pb-16 overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 relative">
      {/* Subtle Top Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full opacity-[0.12] dark:opacity-[0.18] blur-[140px]"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1 space-y-20 sm:space-y-28">
        {/* 1. HERO SECTION */}
        <section className="relative pt-0 pb-2 sm:pb-6 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start w-full">
            <div className="max-w-2xl relative z-30 lg:pt-20">
              <div className="mb-8">
                <Badge
                  variant="brand"
                  dot
                  dotColor={isOperational ? "bg-cyan-400" : "bg-amber-400"}
                  size="md"
                  className="font-mono uppercase text-[10px] sm:text-xs"
                >
                  {isOperational
                    ? `DNS NETWORK ONLINE · ${resolverHost.toUpperCase()}`
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
                  href="#dns-console"
                  leftIcon={<Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Quick Setup
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

        {/* 2. TWO DNS SERVICES SIDE-BY-SIDE + QUICK SETUP */}
        <section id="dns-console" className="relative z-10 space-y-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
              CORE DNS SERVICES
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
              SafeDNS Resolver &amp; Authoritative Pointing
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
              Use our filtered public DNS resolver on any device or router, or point your domain nameservers for zero-delay
              DNS management.
            </p>
          </div>

          {/* Service Cards Side-by-Side (Both Always Visible) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <Badge variant="brand" size="sm" dot dotColor="bg-cyan-400" className="whitespace-nowrap shrink-0">
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

          {/* Integrated Quick Setup Snippet Terminal */}
          <div
            id="quick-setup-terminal"
            className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-sm"
          >
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--text-primary)] shrink-0">
                  <Terminal className="w-4 h-4 text-cyan-500" />
                  <span className="hidden sm:inline">Quick SafeDNS Setup:</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              </div>

              <button
                type="button"
                onClick={() => copyText(activeSetup.command, `setup-${activeSetup.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/40 cursor-pointer transition-colors shrink-0"
              >
                {copiedId === `setup-${activeSetup.id}` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-cyan-500" />
                    <span className="text-cyan-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>

            <div className="px-5 pt-4 text-xs text-[var(--text-secondary)]">{activeSetup.hint}</div>

            <pre className="p-5 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto whitespace-pre [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[var(--text-primary)]">
              {activeSetup.command}
            </pre>
          </div>
        </section>

        {/* 3. LIVE DNS TELEMETRY & HISTORY */}
        {stats.available && (
          <section className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    livePolling ? "bg-cyan-400" : "bg-[var(--text-secondary)]"
                  }`}
                />
                <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight">
                  Live Network Pulse
                </h2>
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
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-[var(--border-subtle)]">
                  <div className="p-4 sm:p-5 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold truncate">
                        SafeDNS Resolver
                      </span>
                      <Shield className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
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
                      <Server className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
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
                      <Zap className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
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
                        d={chartGeometry.resolverLine}
                      />
                    )}

                    {(() => {
                      const activeIdx =
                        hoveredIdx !== null && hoveredIdx < chartGeometry.points.length
                          ? hoveredIdx
                          : chartGeometry.points.length - 1;
                      if (activeIdx < 0) return null;
                      const pt = chartGeometry.points[activeIdx];
                      return (
                        <g>
                          {hoveredIdx !== null && (
                            <line
                              x1={pt.x}
                              x2={pt.x}
                              y1={chartGeometry.padY}
                              y2={chartGeometry.bottomY}
                              stroke="#22d3ee"
                              strokeOpacity="0.35"
                              strokeWidth="1"
                              strokeDasharray="3 3"
                            />
                          )}
                          <circle
                            cx={pt.x}
                            cy={pt.ay}
                            r={hoveredIdx !== null ? "4" : "3"}
                            fill="#a5f3fc"
                            stroke="#09090b"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4.5"
                            fill="#06b6d4"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })()}
                  </svg>

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

        {/* 4. WHY MASDIKA DNS (Balanced Bento Metrics + Framed Capability List) */}
        <section className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
                  WHY MASDIKA DNS
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
                  Instant Propagation &amp; Carrier-Grade Stack
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3 leading-relaxed">
                  Engineered for rapid global DNS propagation, sub-millisecond cached lookups, and automated security
                  without SQL bottlenecks.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] grid grid-cols-2 divide-x divide-y divide-[var(--border-subtle)] overflow-hidden shadow-sm">
                <div className="p-4 sm:p-5">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-500">0s</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">Zone &amp; record API sync</div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--text-primary)]">&lt;1 ms</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">500K RAM packet cache</div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--text-primary)]">60s</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">Fast default record TTL</div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-500">637K+</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">Daily-synced blocklist</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] px-5 sm:px-7 shadow-sm">
              {[
                {
                  icon: Zap,
                  tag: "0s Sync",
                  title: "Instant Record Propagation",
                  desc: "Every A, AAAA, CNAME, MX, or TXT change pushed from the DNS Console activates immediately on ns1/ns2 with automatic SOA serial increments.",
                },
                {
                  icon: Server,
                  tag: "LMDB Engine",
                  title: "Zero-Copy Memory-Mapped Storage",
                  desc: "Authoritative zones run on PowerDNS LMDB shards, eliminating SQL lock contention at high concurrent write and read loads.",
                },
                {
                  icon: Activity,
                  tag: "Serve-Stale",
                  title: "Resilient In-Memory Packet Cache",
                  desc: "Repeated queries hit dnsdist's C++ packet cache in under 1 ms, while serve-stale keeps responses flowing if an upstream slows down.",
                },
                {
                  icon: Lock,
                  tag: "ECDSA P-256",
                  title: "1-Click DNSSEC & Encrypted DoH",
                  desc: "Sign zones with modern ECDSAP256SHA256 keys and route client lookups over TLS via RFC 8484 DNS-over-HTTPS.",
                },
                {
                  icon: Shield,
                  tag: "Anti-DDoS",
                  title: "Reflection & Zone-Leak Shield",
                  desc: "Enforces ANY-to-TCP shunting, refuses unauthorized AXFR/IXFR transfers, and applies per-IP QPS rate limiting at the edge.",
                },
              ].map((feat) => (
                <div key={feat.title} className="py-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0 mt-0.5">
                    <feat.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">{feat.title}</h3>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 font-mono text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                        {feat.tag}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. BOTTOM CTA CARD */}
        <section className="relative z-10">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-[var(--surface)] p-8 sm:p-12 shadow-sm">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-[0.14] blur-[100px]"
              style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
            />

            <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
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
                <Button variant="secondary" size="lg" href="/lg" leftIcon={<Globe className="w-4 h-4" />}>
                  Looking Glass
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
