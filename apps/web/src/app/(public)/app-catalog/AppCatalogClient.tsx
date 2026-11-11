"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Rocket,
  Search,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal,
  Clock,
  Sparkles,
  Server,
  Zap,
  Globe,
  CheckCircle2,
  HardDrive,
  Activity,
  X,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";
import {
  VPS_APPS,
  APP_CATEGORIES,
  AppCategory,
  VpsAppDefinition,
} from "@/lib/vps-apps";

const APP_TERMINAL_LOGS = [
  { time: "00:01", module: "CATALOG", message: "Resolving 1-Click application blueprint and requirements..." },
  { time: "00:02", module: "OS BASE", message: "Initializing Ubuntu 26.04 LTS minimal cloud environment..." },
  { time: "00:03", module: "RUNTIME", message: "Setting up container engine and package dependencies..." },
  { time: "00:04", module: "DEPLOY", message: "Pulling verified application stack and mounting volumes..." },
  { time: "00:05", module: "CONFIG", message: "Injecting environment variables and generating admin credentials..." },
  { time: "00:06", module: "NETWORK", message: "Configuring application ports and firewall routing rules..." },
  { time: "00:07", module: "READY", message: "ssh root@masdika.node", isCommand: true },
];

const APP_TERMINAL_STATS = [
  { value: "1-Click", label: "AUTOMATION" },
  { value: "Cloud-Init", label: "PROVISIONER" },
  { value: "Auto-Config", label: "PORTS & SSL" },
  { value: "Full Root", label: "SSH ACCESS" },
];

function formatCatalogVersion(ver?: string | null): string {
  if (!ver || !ver.trim()) return "Latest";
  const clean = ver.trim();
  if (/^[a-zA-Z]/.test(clean) && !/^v\d/i.test(clean)) {
    return clean;
  }
  return `v${clean.replace(/^v+/i, "")}`;
}

const APP_CATALOG_FAQS = [
  {
    q: "How does 1-Click automated deployment work?",
    a: "When you select an application from our catalog, our cloud provisioning engine injects a production-tested Cloud-Init automation blueprint into your newly provisioned KVM VPS. The operating system boots, downloads official vendor packages, applies security hardening, opens required firewall ports, and outputs your initial dashboard credentials directly to your portal.",
  },
  {
    q: "Do I still get full root SSH and terminal console access?",
    a: "Yes! Unlike restrictive shared hosting or rigid PaaS platforms, you retain 100% root access via SSH and our out-of-band noVNC server terminal console. You can install extra dependencies, tweak config files, or customize the kernel at any time.",
  },
  {
    q: "Can I connect my own custom domain or public IP?",
    a: "Absolutely. All 1-Click applications support optional custom domain names during checkout or reinstall. You can also attach a dedicated Public IPv4 / Reserved IP, or use our built-in Cloudflare Tunnel integration to expose your apps with SSL in seconds without opening local ports.",
  },
  {
    q: "How fast is the deployment process?",
    a: "Most applications (such as Docker, aaPanel, or Nginx Proxy Manager) are online in under 2 to 4 minutes. Heavy enterprise stacks like GitLab or large AI LLM models may take 5 to 8 minutes to pull image layers and initialize databases.",
  },
  {
    q: "Can I reinstall or switch to another application later?",
    a: "Yes. In your VPS Management Dashboard, you can rebuild or format your instance anytime with 1 click, switching between base Linux OS templates or any other application in the App Catalog without extra hardware setup fees.",
  },
];

const ITEMS_PER_PAGE = 8;

export default function AppCatalogClient({ baseHourlyRate = 100 }: { baseHourlyRate?: number }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>("All Apps");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 whenever category or search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const filteredApps = useMemo(() => {
    return VPS_APPS.filter((app) => {
      const matchesCategory =
        selectedCategory === "All Apps" ||
        app.category === selectedCategory ||
        (app.secondaryCategories && app.secondaryCategories.includes(selectedCategory));

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        app.defaultPort.toString().includes(q) ||
        app.osBase.toLowerCase().includes(q) ||
        (app.accessNote && app.accessNote.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredApps.length / ITEMS_PER_PAGE);

  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApps.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApps, currentPage]);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-10 sm:pb-14 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO SECTION ────────────────────────────────────────── */}
        <section className="relative pt-6 sm:pt-10 pb-8 sm:pb-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              <div className="mb-8">
                <Badge
                  variant="brand"
                  dot
                  dotColor="bg-emerald-400"
                  size="md"
                  className="font-mono uppercase whitespace-nowrap"
                >
                  HIGH-PERFORMANCE 1-CLICK STACKS
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                App Catalog &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Instant Deploy.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Deploy production-grade web control panels, developer containers, databases, and AI LLM stacks in under 60 seconds on Masdika Cloud VPS. 100% automated Cloud-Init setup with isolated KVM compute.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#catalog"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Browse {VPS_APPS.length} Applications
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/dashboard/checkout?service=APP_CATALOG"
                  leftIcon={<Rocket className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Deploy in Dashboard
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar Frame */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/images/mascots/app-catalog.webp"
                imageAlt="Masdika – 1-Click App Catalog"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Rocket, label: "Automated Deploy", value: "1-Click Cloud-Init" },
                  { icon: Layers, label: "Ready Stacks", value: `${VPS_APPS.length}+ Verified Apps` },
                  { icon: Terminal, label: "Control & Access", value: "Full Root & Web UI" },
                  { icon: ShieldCheck, label: "Compute Isolation", value: "Dedicated KVM VPS" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights) ───────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              {
                icon: Rocket,
                title: "Zero-Touch Cloud-Init",
                desc: "Unattended automation configures official repos, dependencies, firewall rules, and security policies.",
              },
              {
                icon: Cpu,
                title: "Dedicated KVM Compute",
                desc: "Enterprise Intel Xeon processors with high-speed SSD storage and guaranteed non-oversold RAM.",
              },
              {
                icon: Terminal,
                title: "Full Root & Web Panel",
                desc: "Every deployment gives you complete SSH root power alongside modern, secure web control panels.",
              },
              {
                icon: Activity,
                title: "Local Low-Latency DC",
                desc: "Sub-20ms ultra-low ping across Indonesia with direct IIX peering and enterprise Anti-DDoS protection.",
              },
            ].map((pillar, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-xs hover:border-cyan-500/40 transition-colors">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <pillar.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 2. INTERACTIVE APP CATALOG & SEARCH ─────────────────────── */}
        <section id="catalog" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                VERIFIED APPLICATION MARKETPLACE
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-[var(--text-primary)] leading-[1.15] mb-3">
                Browse Pre-Configured Apps
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl">
                Choose from control panels, CMS platforms, container runtimes, and local AI stacks. Ready to launch instantly on your cloud instance.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps (e.g. docker, aapanel)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-zinc-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-8">
            {APP_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              const count = cat === "All Apps"
                ? VPS_APPS.length
                : VPS_APPS.filter(
                    (a) => a.category === cat || (a.secondaryCategories && a.secondaryCategories.includes(cat))
                  ).length;

              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border select-none",
                    isActive
                      ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-xs font-extrabold"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:border-cyan-500/40 hover:text-[var(--text-primary)]"
                  )}
                >
                  <span>{cat}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                      isActive
                        ? "bg-slate-950/20 text-slate-950 font-bold"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-400"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Apps Grid */}
          {filteredApps.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedApps.map((app) => {
                  const versionDisplay = formatCatalogVersion(app.appVersion);

                  return (
                    <div
                      key={app.id}
                      className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-5 sm:p-6 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-lg transition-all duration-200 group"
                    >
                      <div>
                        {/* Top Row: Icon + Badges */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="w-14 h-14 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-2.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-2xs">
                            {app.icon ? (
                              <img
                                referrerPolicy="no-referrer"
                                src={app.icon}
                                alt={app.name}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <Server className="w-7 h-7 text-cyan-400" />
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200/80 dark:border-cyan-500/20">
                              {versionDisplay}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                                {app.category}
                              </span>
                              {app.isWebAccess === false && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                                  {app.accessType === "database" ? "Database" : "CLI / SSH"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* App Name & Description */}
                        <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-2">
                          {app.name}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-4">
                          {app.description}
                        </p>

                        {/* Meta Specs Pill Bar */}
                        <div className="space-y-1.5 pt-3 border-t border-[var(--border-primary)] text-[11px] font-mono text-slate-500 dark:text-zinc-400 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Cpu className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                              Min Specs:
                            </span>
                            <span className="font-semibold text-[var(--text-primary)]">
                              {app.minSpecs.cpu} vCPU / {app.minSpecs.ram}GB RAM
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                              Setup Time:
                            </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {app.estimatedTime}
                            </span>
                          </div>
                          {app.isWebAccess === false ? (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Terminal className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                Access Mode:
                              </span>
                              <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                                {app.accessType === "database" ? `Port :${app.defaultPort} (DB)` : "Terminal / SSH (CLI)"}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                Web Port:
                              </span>
                              <span className="font-semibold text-[var(--text-primary)]">
                                {app.defaultProtocol}://:{app.defaultPort}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Note for Non-Browser (CLI/Database) Apps */}
                        {app.isWebAccess === false && (
                          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2 mb-4">
                            <Terminal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                              <strong className="font-semibold">No Browser UI:</strong>{" "}
                              <span>{app.accessNote || "This application is operated directly via SSH terminal or remote client (no browser required)."}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Deploy Button */}
                      <Link
                        href={`/dashboard/checkout?service=APP_CATALOG&app=${encodeURIComponent(app.id)}`}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                      >
                        <span>Deploy 1-Click {app.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-[var(--border-primary)]">
                  <div className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                    Showing <span className="font-bold text-[var(--text-primary)]">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–
                    <span className="font-bold text-[var(--text-primary)]">{Math.min(currentPage * ITEMS_PER_PAGE, filteredApps.length)}</span> of{" "}
                    <span className="font-bold text-cyan-400">{filteredApps.length}</span> Applications
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      const el = document.getElementById("catalog");
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)]">
              <Search className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                No applications found
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
                We couldn&apos;t find any applications matching &quot;{searchQuery}&quot;. Try checking your spelling or select another category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All Apps");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors"
              >
                Reset Search Filters
              </button>
            </div>
          )}
        </section>

        {/* ── 3. HOW IT WORKS SECTION ───────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              DEPLOYMENT WORKFLOW
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Go Live in 3 Simple Steps
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              From zero to a running application dashboard with full HTTPS and credentials in 3 automated steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            {/* Connecting Line Container */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-slate-200 dark:bg-white/10 overflow-hidden rounded-full">
              <AnimatedBeam />
            </div>

            {[
              {
                step: "01",
                title: "Choose Application",
                desc: "Pick your desired software stack from aaPanel to Antigravity CLI. Pre-filled with optimal defaults or customizable inputs.",
              },
              {
                step: "02",
                title: "Select Compute Specs",
                desc: "Choose vCPU cores, RAM size, and Enterprise SSD disk. Hourly pay-as-you-go billing starting at Rp 100/hr.",
              },
              {
                step: "03",
                title: "Instant Access & Credentials",
                desc: "Cloud-Init automatically boots, installs vendor packages, opens ports, and outputs your login link and SSH command.",
              },
            ].map((st, i) => (
              <FadeIn key={i} delay={i * 0.15} direction="up" className="h-full">
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 text-center shadow-sm hover:border-cyan-500/40 transition-all duration-300 h-full flex flex-col justify-between relative z-10 group">
                  <div>
                    <div className="w-20 h-20 mx-auto rounded-full bg-[var(--surface-secondary)] border border-[var(--border-primary)] flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform duration-300">
                      <OrbitalRings />
                      <span className="relative z-10 text-3xl font-black bg-gradient-to-br from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
                        {st.step}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                      {st.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 4. PROVISIONING SECTION (Live Terminal) ───────────────────── */}
        <ProvisioningSection
          subtitle="AUTOMATED 1-CLICK DEPLOYMENT"
          title="One-click, instant application stack deployment."
          description="Our automated Cloud-Init engine handles repository provisioning, runtime dependencies, firewall routing, and credential generation automatically. Simply select your software and launch."
          buttonText="Explore All Apps"
          buttonHref="#catalog"
          logs={APP_TERMINAL_LOGS}
          stats={APP_TERMINAL_STATS}
          terminalTitle="PROVISIONING 1-CLICK APP"
          iconType="vps"
          targetServer="Dell PowerEdge R630 • Sidoarjo DC"
          provisionEstimate="Stack: Cloud-Init Automated Blueprint (Estimasi ~2-3 Menit)"
        />

        {/* ── 5. FAQS SECTION ─────────────────────────────────────────── */}
        <FaqSection faqs={APP_CATALOG_FAQS} />

        {/* ── 6. FINAL CTA SECTION ──────────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10 w-full">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-10 md:p-16 text-center shadow-xl overflow-hidden w-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                START COMPUTING TODAY
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-tight mb-4">
                Ready for True High-Performance Compute?
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
                Deploy workloads on Masdika Cloud infrastructure today. Enjoy dedicated resources, local low latency, and full administrative freedom.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/checkout?service=APP_CATALOG"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy Your Server
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/vps"
                  leftIcon={<Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  View Cloud VPS Specs
                </Button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

