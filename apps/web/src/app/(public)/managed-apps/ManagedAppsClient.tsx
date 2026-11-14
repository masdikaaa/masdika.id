"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  Zap,
  ShieldCheck,
  Terminal,
  ArrowRight,
  Cpu,
  Box,
  Globe,
  CheckCircle2,
  HardDrive,
  Activity,
  TrendingUp,
  Server,
  Layers,
  ExternalLink,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { FaqSection } from "@/components/ui/FaqSection";
import { EnterpriseInfraSection } from "@/components/infra/EnterpriseInfraSection";
import { AntiDdosWorkflowSection } from "@/components/infra/AntiDdosWorkflowSection";
import { cn } from "@/lib/utils";
import {
  ManagedAppDefinition,
  ManagedAppPlanDefinition,
  formatRupiah,
} from "@/lib/app-catalog";

interface ManagedAppsClientProps {
  catalog: ManagedAppDefinition[];
  plans: ManagedAppPlanDefinition[];
}

export default function ManagedAppsClient({
  catalog,
  plans,
}: ManagedAppsClientProps) {
  const [selectedAppId, setSelectedAppId] = useState<string>("hermes");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("1c2g");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "HOURLY">("MONTHLY");

  const activeApp =
    catalog.find((a) => a.id === selectedAppId) || catalog[0];
  const activePlan =
    plans.find((p) => p.id === selectedPlanId) || plans[1] || plans[0];

  const appFaqs = [
    {
      q: "What makes Masdika Managed Applications different from shared VPS?",
      a: "Every application deployed on Masdika Cloud runs inside an isolated Kubernetes pod with strictly reserved vCPU and memory quotas. You receive zero noisy neighbors, guaranteed compute performance, and automated failover recovery across our Sidoarjo cluster nodes.",
    },
    {
      q: "How does automated SSL work for web applications like n8n and 9Router?",
      a: "Web applications automatically obtain an official Let's Encrypt wildcard SSL certificate routed via our edge Ingress gateway. Your app receives a dedicated HTTPS subdomain (*.app.masdika.id) with zero manual DNS configurations required.",
    },
    {
      q: "How is the terminal access secured for Hermes Agent and OpenCode?",
      a: "Hermes Agent and OpenCode are provisioned with direct high-speed SSH terminal access on an dynamically allocated random NodePort within our agreed range (30000–32767). The container environment is locked down against package installation and TCP port forwarding to ensure 100% stability, zero resource abuse, and strict compliance.",
    },
    {
      q: "Can I scale or upgrade my application pod without data loss?",
      a: "Yes! Powered by Kubernetes stateful PVC architecture, scaling up your vCPU and RAM flavors modifies only the compute specification while your mounted SSD storage volume (/app/data or /workspace) remains completely untouched and safe.",
    },
    {
      q: "Where is the Kubernetes cluster hosted?",
      a: "All pods run on our enterprise Kubernetes cluster located in our Sidoarjo Data Center (ID-SDA), providing under 20ms local latency across Indonesia with direct IIX, OpenIX, and CDIX peering.",
    },
  ];

  return (
    <div className="relative min-h-screen text-[var(--text-primary)]">
      {/* ── AMBIENT BACKGROUND GLOWS ──────────────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-15%] left-[20%] w-[550px] h-[550px] bg-cyan-500/10 dark:bg-cyan-500/15 blur-[140px] rounded-full mix-blend-screen" />
        <div className="absolute top-[10%] right-[15%] w-[450px] h-[450px] bg-blue-500/10 dark:bg-blue-600/15 blur-[130px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
        {/* ── HERO SECTION ─────────────────────────────────────────────── */}
        <section className="pt-24 sm:pt-32 pb-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left – Copy & CTAs */}
            <div className="space-y-6 text-left">
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Production Kubernetes Microservices &amp; AI Stacks</span>
                </div>
              </FadeIn>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15]">
                Deploy AI Agents &amp; Cloud Workflows{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">
                  in Seconds
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl font-normal">
                Launch NousResearch Hermes Agent, 9Router, n8n, OpenCode, and OpenClaw on dedicated Kubernetes compute. Equipped with automated Let&apos;s Encrypt SSL, sandboxed SSH terminal, and persistent SSD storage in Sidoarjo.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/apps/new"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy First App
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#catalog"
                  leftIcon={<Boxes className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Browse Catalog
                </Button>
              </div>

              {/* Quick Spec Metrics */}
              <div className="pt-6 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-4 text-xs font-medium text-[var(--text-muted)]">
                <div>
                  <span className="block font-black text-base sm:text-lg text-[var(--text-primary)]">
                    5 Stacks
                  </span>
                  <span>AI &amp; Microservices</span>
                </div>
                <div>
                  <span className="block font-black text-base sm:text-lg text-[var(--text-primary)]">
                    &lt; 20ms
                  </span>
                  <span>Latency in Indonesia</span>
                </div>
                <div>
                  <span className="block font-black text-base sm:text-lg text-cyan-600 dark:text-cyan-400">
                    Auto SSL
                  </span>
                  <span>Let&apos;s Encrypt Ingress</span>
                </div>
              </div>
            </div>

            {/* Right – Hero Avatar Frame (managed-apps.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/images/mascots/managed-apps.webp"
                imageAlt="Masdika – Managed Applications &amp; Kubernetes Microservices"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Boxes, label: "AI & Workflow Stacks", value: "Hermes, 9Router, n8n, OpenCode" },
                  { icon: Globe, label: "Ingress Routing", value: "Automated Let's Encrypt SSL" },
                  { icon: Terminal, label: "Terminal Access", value: "Sandboxed Direct SSH" },
                  { icon: ShieldCheck, label: "Architecture", value: "Dedicated Kubernetes Pods" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights) ───────────────────── */}
        <section className="py-6 sm:py-10 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              {
                icon: Box,
                title: "Kubernetes Pod Isolation",
                desc: "Each application runs in a dedicated pod with guaranteed CPU shares and RAM limits, completely isolated from noisy neighbors.",
              },
              {
                icon: Globe,
                title: "Automated Let's Encrypt SSL",
                desc: "Zero-config Ingress routing on *.app.masdika.id with automated SSL certificate provisioning and renewal.",
              },
              {
                icon: Terminal,
                title: "Sandboxed Direct SSH",
                desc: "CLI-focused AI tools connect over dynamic NodePorts with package manager protection and zero tunneling abuse.",
              },
              {
                icon: HardDrive,
                title: "Persistent Storage Mounts",
                desc: "Kubernetes PersistentVolumeClaims guarantee your AI memory, code repositories, and workflows are never lost on restart.",
              },
            ].map((pillar, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-xs group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                    <pillar.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. APPLICATION CATALOG SHOWCASE ─────────────────────────── */}
        <section id="catalog" className="py-10 relative z-10 scroll-mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
              <Boxes className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Curated Cloud Stacks</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Production-Grade AI &amp; Workflow Applications
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Explore our curated library of autonomous coding agents, API proxies, and visual workflow automation engines.
            </p>
          </div>

          {/* App Selector Pills */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            {catalog.map((app) => {
              const isSelected = selectedAppId === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-sm"
                      : "bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-cyan-500/20"
                  )}
                >
                  <div className="w-5 h-5 rounded-md p-0.5 bg-black/40 border border-white/10 shrink-0 relative overflow-hidden">
                    <Image
                      src={app.icon}
                      alt={app.name}
                      width={20}
                      height={20}
                      className="object-contain w-full h-full"
                      unoptimized
                    />
                  </div>
                  <span>{app.name}</span>
                  <span className="text-[10px] opacity-60">({app.accessProtocol})</span>
                </button>
              );
            })}
          </div>

          {/* Active App Detailed Showcase Card */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] transition-all shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* App Overview & Badges */}
              <div className="lg:col-span-7 space-y-5 text-left">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 p-2 bg-black/40 border border-white/10 shadow-lg relative overflow-hidden">
                    <Image
                      src={activeApp.icon}
                      alt={activeApp.name}
                      width={48}
                      height={48}
                      className="object-contain w-full h-full"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                        {activeApp.name}
                      </h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-cyan-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-300">
                        {activeApp.badge}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                      {activeApp.tagline}
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {activeApp.description}
                </p>

                {/* Features List */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Key Features &amp; Architecture:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {activeApp.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="text-[var(--text-secondary)]">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center gap-4 pt-4 flex-wrap">
                  <Button
                    variant="primary"
                    size="md"
                    href={`/dashboard/apps/new?app=${activeApp.id}`}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Deploy {activeApp.name}
                  </Button>
                  {activeApp.website && (
                    <a
                      href={activeApp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[var(--text-muted)] hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Official Documentation</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Protocol & Architecture Info Box */}
              <div className="lg:col-span-5 p-5 sm:p-6 rounded-xl border border-[var(--border-subtle)] bg-black/20 dark:bg-white/[0.02] space-y-4 text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                  <Server className="w-4 h-4" /> Runtime Specifications
                </span>

                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-black/30 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">Access Protocol</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-300">
                      {activeApp.accessProtocol === "SSH" ? "Direct SSH Terminal (CLI)" : "HTTPS Ingress with Let's Encrypt"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-black/30 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">Persistent Storage Mount</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {activeApp.dataDir} (Dedicated PVC)
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-black/30 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">Cluster Region</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      Sidoarjo (ID-SDA), Indonesia
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. COMPUTE FLAVORS & PRICING TABLE ──────────────────────── */}
        <section id="pricing" className="py-10 relative z-10 scroll-mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Transparent Pricing</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Dedicated Compute Tiers &amp; Flavors
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Every flavor includes dedicated CPU shares, memory allocation, and persistent SSD storage with Zero-Data-Loss scaling.
            </p>

            {/* Billing Cycle Toggle */}
            <div className="pt-3 flex items-center justify-center gap-2">
              <div className="p-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] inline-flex">
                <button
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    billingCycle === "MONTHLY"
                      ? "bg-cyan-400 text-slate-950 shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Monthly Commitment
                </button>
                <button
                  onClick={() => setBillingCycle("HOURLY")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    billingCycle === "HOURLY"
                      ? "bg-cyan-400 text-slate-950 shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Hourly PAYG
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Grid (7 Compute Flavors) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const priceDisplay =
                billingCycle === "MONTHLY"
                  ? `${formatRupiah(plan.monthlyPrice)}/mo`
                  : `${formatRupiah(plan.hourlyPrice)}/hr`;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer relative",
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-400/40 shadow-md"
                      : "bg-[var(--card-bg)] border-[var(--border-subtle)] hover:border-cyan-500/30"
                  )}
                >
                  {plan.isPopular && (
                    <span className="absolute -top-2.5 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 shadow-xs">
                      Popular
                    </span>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black tracking-tight text-[var(--text-primary)]">
                        {plan.planCode}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {plan.remainingStock} slots left
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-medium text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{plan.cpuLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{plan.ramLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{plan.storageGb} GB Persistent SSD</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-[var(--border-subtle)] flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-[var(--text-muted)] block">Price</span>
                      <span className="text-base font-black text-cyan-600 dark:text-cyan-400 tracking-tight">
                        {priceDisplay}
                      </span>
                    </div>

                    <Button
                      variant={isSelected ? "primary" : "secondary"}
                      size="sm"
                      href={`/dashboard/apps/new?app=${selectedAppId}&plan=${plan.planCode}`}
                    >
                      Deploy
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 4. ENTERPRISE INFRASTRUCTURE & ANTI-DDOS ─────────────────── */}
        <EnterpriseInfraSection />
        <AntiDdosWorkflowSection />

        {/* ── 5. FREQUENTLY ASKED QUESTIONS ───────────────────────────── */}
        <section className="py-6 sm:py-10">
          <FaqSection faqs={appFaqs} />
        </section>

        {/* ── 6. BOTTOM CALL TO ACTION BANNER ─────────────────────────── */}
        <section className="py-12 relative">
          <div className="p-8 sm:p-12 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent text-center space-y-6 relative overflow-hidden shadow-xl">
            <div className="max-w-2xl mx-auto space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                Ready to Launch Your Autonomous Cloud Stack?
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Start with Hermes Agent, 9Router, n8n, OpenCode, or OpenClaw in just 1-click. Zero manual Kubernetes config, automated SSL, and dedicated SSD storage.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button
                variant="primary"
                size="lg"
                href="/dashboard/apps/new"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Deploy Managed App Now
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
