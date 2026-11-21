"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AppWindow,
  ArrowRight,
  Activity,
  Box,
  CheckCircle2,
  Cpu,
  GitBranch,
  Globe,
  HardDrive,
  Layers,
  Lock,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Terminal,
  Webhook,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { cn } from "@/lib/utils";
import { AppPlatformPlan, OFFICIAL_APP_PLATFORM_PLANS } from "@/lib/app-platform-plans";

const PAAS_TERMINAL_LOGS = [
  { time: "00:01", module: "GIT", message: "Cloning repository branch from GitHub / GitLab / Bitbucket..." },
  { time: "00:03", module: "BUILDKIT", message: "Building multi-stage Dockerfile with registry layer cache..." },
  { time: "00:14", module: "REGISTRY", message: "Pushing immutable OCI container image to internal registry..." },
  { time: "00:16", module: "K8S", message: "Scheduling Pod with guaranteed vCPU, RAM, and env secrets..." },
  { time: "00:18", module: "INGRESS", message: "Provisioning Traefik route & Let's Encrypt SSL certificate..." },
  { time: "00:20", module: "PTY", message: "Live Linux PTY WebSocket shell attached and ready." },
  { time: "00:21", module: "READY", message: "Deployment live with zero-downtime rolling update.", isCommand: true },
];

const PAAS_TERMINAL_STATS = [
  { value: "BuildKit", label: "DOCKERFILE ENGINE" },
  { value: "Auto SSL", label: "LET'S ENCRYPT" },
  { value: "Live PTY", label: "WEB SHELL" },
  { value: "Git Push", label: "CI/CD WEBHOOK" },
];

const PAAS_FAQS = [
  {
    q: "How does Masdika App Platform differ from Managed Apps?",
    a: "Managed Apps deploys pre-packaged 1-click stacks like n8n, 9Router, and Hermes Agent. App Platform is a Git-to-Container PaaS for your own custom source code (Laravel, Next.js, Go, FastAPI, or any Dockerfile) from GitHub, GitLab, or Bitbucket.",
  },
  {
    q: "Do I need a Dockerfile in my repository?",
    a: "You can either keep a Dockerfile in your Git repository or write/edit one directly inside our built-in Inline Dockerfile Editor with quick templates for Laravel, Next.js, FastAPI, Go Fiber, and Nginx.",
  },
  {
    q: "How do environment variables and CI/CD webhooks work?",
    a: "Environment variables are securely mounted into the Kubernetes Pod OS environment at runtime. Whenever you push to your configured branch, our webhook triggers an automated BuildKit rebuild and zero-downtime rolling update.",
  },
  {
    q: "Can I access a real interactive terminal inside my container?",
    a: "Yes! Every running App Platform container includes a real-time Linux PTY WebSocket shell supporting Tab autocomplete, arrow history, Ctrl+C, and interactive commands like php artisan tinker or prisma migrate.",
  },
  {
    q: "How does billing work?",
    a: "You can deploy with predictable Monthly plans or flexible hourly Pay-As-You-Go billing deducted from your account balance. Upgrade or scale compute resources at any time without losing persistent storage.",
  },
];

interface AppPlatformClientProps {
  plans?: AppPlatformPlan[];
  isAppPlatformEnabled?: boolean;
}

export default function AppPlatformClient({
  plans = OFFICIAL_APP_PLATFORM_PLANS,
  isAppPlatformEnabled = true,
}: AppPlatformClientProps) {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "HOURLY">("MONTHLY");

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-x-clip transition-colors duration-300 relative">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full opacity-[0.12] dark:opacity-[0.18] blur-[140px]"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
        />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 space-y-20">
        {/* ── HERO SECTION ──────────────────────────────────────────────── */}
        <section className="pt-4 sm:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="max-w-2xl relative z-30">
              <div className="mb-6">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase whitespace-nowrap">
                  GIT-TO-CONTAINER PAAS · BUILDKIT
                </Badge>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.06] mb-5 text-[var(--text-primary)]">
                Push Your Code. <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Ship Containers Fast.
                </span>
              </h1>

              <p className="text-base sm:text-lg mb-8 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                Deploy Laravel, Next.js, Go, Python, or any Dockerfile straight from GitHub, GitLab, and Bitbucket. Built with BuildKit caching, automatic Let&apos;s Encrypt SSL, CI/CD webhooks, and a live Linux PTY web terminal.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href={isAppPlatformEnabled ? "/dashboard/app-platform/new" : "#pricing"}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isAppPlatformEnabled ? "Deploy New App" : "View Plans"}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#pricing"
                  leftIcon={<AppWindow className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Compare All Plans
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center mt-4 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/images/app-platform-hero.webp"
                imageAlt="Masdika App Platform - Git-to-Container Deployment"
                imageWidth={1230}
                imageHeight={1278}
                badges={[
                  { icon: GitBranch, label: "Git Providers", value: "GitHub, GitLab, Bitbucket" },
                  { icon: Rocket, label: "Build Engine", value: "BuildKit + Dockerfile" },
                  { icon: Terminal, label: "Pod Console", value: "Live Linux PTY Shell" },
                  { icon: ShieldCheck, label: "Ingress SSL", value: "Auto Let's Encrypt" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── VALUE PILLARS ─────────────────────────────────────────────── */}
        <section className="relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {[
              {
                icon: Box,
                title: "Dockerfile-Native BuildKit",
                desc: "Use your repository Dockerfile or our inline editor with registry layer caching for fast rebuilds.",
              },
              {
                icon: Webhook,
                title: "CI/CD Git Push Webhooks",
                desc: "Trigger automated zero-downtime rolling updates whenever you push to your production branch.",
              },
              {
                icon: Terminal,
                title: "Live Linux PTY Terminal",
                desc: "Attach directly to running Pods with Tab autocomplete, history, and interactive CLI support.",
              },
              {
                icon: Activity,
                title: "Sidoarjo Low-Latency DC",
                desc: "Isolated Kubernetes Pods with dedicated vCPU/RAM quotas and under 20ms local ping.",
              },
            ].map((pillar, i) => (
              <FadeIn key={i} delay={i * 0.08} direction="up" className="h-full">
                <div className="p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-sm hover:border-cyan-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <pillar.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── ALL PRICING PLANS GRID ────────────────────────────────────── */}
        <section id="pricing" className="scroll-mt-24 relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
                TRANSPARENT PAAS PRICING
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
                All App Platform Compute Plans
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2 max-w-2xl">
                Every tier includes automated BuildKit builds, isolated Kubernetes runtime, Let&apos;s Encrypt SSL, custom domains, and live Linux PTY shell access.
              </p>
            </div>

            <div className="inline-flex p-1 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setBillingCycle("MONTHLY")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  billingCycle === "MONTHLY"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("HOURLY")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  billingCycle === "HOURLY"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Pay-As-You-Go (Hourly)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {plans.map((plan) => {
              const displayPrice = billingCycle === "MONTHLY" ? plan.monthlyPrice : plan.hourlyRate;
              const deployHref = `/dashboard/app-platform/new?plan=${encodeURIComponent(plan.planCode)}&billing=${billingCycle === "MONTHLY" ? "MONTHLY" : "PAYG"}`;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "rounded-2xl border p-5 flex flex-col justify-between transition-all relative bg-[var(--surface)]",
                    plan.popular
                      ? "border-cyan-500 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-500/10"
                      : "border-[var(--border-primary)] hover:border-cyan-500/40"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                        {plan.planCode}
                      </span>
                      {plan.popular && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                          Popular
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                      {plan.name}
                    </h3>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-2xl font-black font-mono text-[var(--text-primary)]">
                        {formatCurrency(displayPrice)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {billingCycle === "MONTHLY" ? "/month" : "/hour"}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs text-[var(--text-secondary)] border-t border-[var(--border-primary)] pt-4 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-cyan-500" /> vCPU
                        </span>
                        <span className="font-mono font-semibold text-[var(--text-primary)]">{plan.cpuLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-500" /> Memory
                        </span>
                        <span className="font-mono font-semibold text-[var(--text-primary)]">{plan.ramLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-cyan-500" /> Storage
                        </span>
                        <span className="font-mono font-semibold text-[var(--text-primary)]">{plan.diskLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] pt-1 text-emerald-500">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>SSL, CI/CD &amp; Live PTY included</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={deployHref}
                    className={cn(
                      "w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      plan.popular
                        ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm"
                        : "border border-[var(--border-primary)] hover:border-cyan-500/50 text-[var(--text-primary)] hover:text-cyan-500"
                    )}
                  >
                    <span>Deploy {plan.planCode}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── WORKFLOW HIGHLIGHTS ───────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: GitBranch,
              title: "1. Connect Any Git Repo",
              desc: "Link GitHub, GitLab, or Bitbucket with OAuth/PAT or paste any public HTTPS repository URL. Inspect branches and manifests automatically.",
            },
            {
              icon: Lock,
              title: "2. Configure Dockerfile & Env",
              desc: "Build directly from your repo Dockerfile or edit inline. Inject runtime environment variables directly into Kubernetes Pod secrets.",
            },
            {
              icon: Globe,
              title: "3. Instant HTTPS & Live Shell",
              desc: "Get an instant *.app.masdikacloud.my.id URL with Let's Encrypt SSL, custom domain CNAME support, metrics, and live Linux PTY terminal.",
            },
          ].map((step, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                <step.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">{step.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </section>

        {/* ── PROVISIONING TERMINAL PREVIEW ─────────────────────────────── */}
        <ProvisioningSection
          subtitle="BUILDKIT PIPELINE"
          title="Watch Every Build From Git Clone to Live Pod"
          description="Real-time BuildKit logs, internal registry caching, and zero-downtime Kubernetes rollouts."
          buttonText="Deploy New App"
          buttonHref="/dashboard/app-platform/new"
          iconType="k3s"
          logs={PAAS_TERMINAL_LOGS}
          stats={PAAS_TERMINAL_STATS}
        />

        {/* ── FAQ SECTION ───────────────────────────────────────────────── */}
        <FaqSection faqs={PAAS_FAQS} />

        {/* ── BOTTOM CTA ────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-[var(--surface)] to-transparent p-8 sm:p-12 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
            <Zap className="w-3.5 h-3.5" />
            <span>READY IN SECONDS</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[var(--text-primary)]">
            Deploy Your First Container Today
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto">
            Start with Pay-As-You-Go from Rp 28/hour or Rp 20.000/month. Scale vCPU and RAM anytime without losing data.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              href="/dashboard/app-platform/new"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Launch App Platform
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
