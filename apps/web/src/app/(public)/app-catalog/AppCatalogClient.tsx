"use client";

import { useState, useMemo } from "react";
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
import { FaqSection } from "@/components/ui/FaqSection";
import { cn } from "@/lib/utils";
import {
  VPS_APPS,
  APP_CATEGORIES,
  AppCategory,
  VpsAppDefinition,
} from "@/lib/vps-apps";

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

export default function AppCatalogClient({ baseHourlyRate = 100 }: { baseHourlyRate?: number }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>("All Apps");

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
        app.osBase.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 lg:pb-28 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO SECTION ────────────────────────────────────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
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
        <section className="py-12 border-y border-[var(--border-primary)] mb-16 lg:mb-24">
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
        <section id="catalog" className="py-10 mb-20 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Verified Application Marketplace</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--text-primary)]">
                Browse Pre-Configured Apps
              </h2>
              <p className="text-sm sm:text-base mt-2 text-[var(--text-secondary)] max-w-2xl">
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
                        : "bg-white/[0.06] text-zinc-400"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredApps.map((app) => (
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          v{app.appVersion || "Latest"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold text-zinc-400 bg-white/[0.04] border border-white/[0.06]">
                          {app.category}
                        </span>
                      </div>
                    </div>

                    {/* App Name & Description */}
                    <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors mb-2">
                      {app.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-4">
                      {app.description}
                    </p>

                    {/* Meta Specs Pill Bar */}
                    <div className="space-y-1.5 pt-3 border-t border-[var(--border-primary)] text-[11px] font-mono text-zinc-400 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
                          Min Specs:
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {app.minSpecs.cpu} vCPU / {app.minSpecs.ram}GB RAM
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                          Setup Time:
                        </span>
                        <span className="font-semibold text-emerald-400">
                          {app.estimatedTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                          Web Port:
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {app.defaultProtocol}://:{app.defaultPort}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deploy Button */}
                  <Link
                    href={`/dashboard/checkout?service=APP_CATALOG&app=${encodeURIComponent(app.id)}`}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <span>Deploy 1-Click {app.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              ))}
            </div>
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

        {/* ── 3. HOW IT WORKS (3 Simple Steps) ────────────────────────── */}
        <section className="py-16 border-t border-[var(--border-primary)] mb-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              Automated Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] mt-2">
              How 1-Click Provisioning Works
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              From zero to a running application dashboard with full HTTPS and credentials in 3 automated steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Choose Application",
                desc: "Pick your desired software stack from aaPanel to Ollama AI. Pre-filled with optimal defaults or customizable inputs.",
                icon: Rocket,
              },
              {
                step: "02",
                title: "Select Compute Specs",
                desc: "Choose vCPU cores, RAM size, and Enterprise SSD disk. Hourly pay-as-you-go billing starting at Rp 100/hr.",
                icon: Cpu,
              },
              {
                step: "03",
                title: "Instant Web Access",
                desc: "Cloud-Init automatically boots, installs vendor packages, opens ports, and serves your live web login link.",
                icon: CheckCircle2,
              },
            ].map((s, i) => (
              <div
                key={i}
                className="relative p-6 sm:p-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <s.icon className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-black font-mono text-zinc-300 dark:text-zinc-700">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. FAQS SECTION ─────────────────────────────────────────── */}
        <FaqSection faqs={APP_CATALOG_FAQS} />

        {/* ── 5. BOTTOM CTA BANNER ─────────────────────────────────────── */}
        <section className="mt-20">
          <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-[var(--surface)] to-[var(--surface)] p-8 sm:p-12 lg:p-16 text-center">
            <div className="max-w-2xl mx-auto relative z-10">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-3 block">
                Instant Cloud Automation
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--text-primary)] mb-4">
                Deploy Your First 1-Click Application Today
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-8 leading-relaxed">
                Experience high-performance cloud computing backed by enterprise Intel Xeon CPUs, NVMe storage, and automated deployment pipelines.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/checkout?service=APP_CATALOG"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Launch App in Dashboard
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

