"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Globe,
  Lock,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
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

type SetupTabId = "linux" | "mikrotik" | "doh" | "windows";

export default function DnsPublicClient({ publicInfo }: { publicInfo: DnsPublicInfo }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SetupTabId>("linux");

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

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
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
            <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
                        PUBLIC RECURSIVE RESOLVER
                      </span>
                      <h3 className="text-xl font-black text-[var(--text-primary)]">
                        Masdika SafeDNS
                      </h3>
                    </div>
                  </div>
                  <Badge variant="success" size="sm" dot dotColor="bg-emerald-400">
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
            <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
                        AUTHORITATIVE NAMESERVERS
                      </span>
                      <h3 className="text-xl font-black text-[var(--text-primary)]">
                        Masdika Authoritative DNS
                      </h3>
                    </div>
                  </div>
                  <Badge variant="brand" size="sm">
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
