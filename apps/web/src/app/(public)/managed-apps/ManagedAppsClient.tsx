"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Boxes,
  Cloud, 
  Zap, 
  ShieldCheck, 
  Shield, 
  Terminal, 
  ArrowRight, 
  Cpu, 
  Box, 
  Globe, 
  CheckCircle2, 
  MapPin, 
  HardDrive, 
  Activity, 
  TrendingUp, 
  Network, 
  Server, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  Layers,
  Lock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Check,
  Download,
  KeyRound,
  Workflow
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { EnterpriseInfraSection } from "@/components/infra/EnterpriseInfraSection";
import { AntiDdosWorkflowSection } from "@/components/infra/AntiDdosWorkflowSection";
import { cn } from "@/lib/utils";
import { 
  ManagedAppDefinition, 
  ManagedAppPlanDefinition, 
  MANAGED_APPS_CATALOG, 
  MANAGED_APP_PLANS 
} from "@/lib/app-catalog";

const APP_TERMINAL_LOGS = [
  { time: "00:01", module: "CLUSTER", message: "Verifying Kubernetes node capacity and cluster quotas..." },
  { time: "00:02", module: "WORKSPACE", message: "Mounting isolated application workspace and runtime state..." },
  { time: "00:03", module: "SECRETS", message: "Generating cryptographic passwords and isolation secrets..." },
  { time: "00:04", module: "POD", message: "Scheduling application container pod with resource limits..." },
  { time: "00:05", module: "NETWORK", message: "Binding dedicated NodePort and routing ingress..." },
  { time: "00:06", module: "HEALTH", message: "Performing readiness and liveness container health probes..." },
  { time: "00:07", module: "READY", message: "Application pod healthy. Ready for production traffic.", isCommand: true },
];

const APP_TERMINAL_STATS = [
  { value: "Included", label: "AUTO SSL INGRESS" },
  { value: "Dedicated", label: "NODEPORT ACCESS" },
  { value: "1-Click", label: "INSTANT DEPLOY" },
  { value: "Isolated", label: "CONTAINER CGROUP" },
];

const REPEATED_APPS = [
  ...MANAGED_APPS_CATALOG,
  ...MANAGED_APPS_CATALOG,
  ...MANAGED_APPS_CATALOG,
  ...MANAGED_APPS_CATALOG,
  ...MANAGED_APPS_CATALOG,
  ...MANAGED_APPS_CATALOG,
];

const APP_FAQS = [
  {
    q: "How does Masdika Managed Applications work?",
    a: "Every managed application runs inside a dedicated Kubernetes container Pod on enterprise Dell PowerEdge nodes. Applications benefit from guaranteed CPU and RAM isolation, automated SSL ingress, and self-healing container lifecycles across Pod restarts or node maintenance."
  },
  {
    q: "How is access handled for web applications vs. CLI/SSH applications?",
    a: "Web-based applications (like n8n, 9Router, and OpenClaw) are automatically assigned a Let's Encrypt SSL-secured subdomain on *.app.masdika.id. CLI and agentic applications (like Hermes Agent and OpenCode) are assigned a secure, direct NodePort for SSH terminal access, isolated from web ingress."
  },
  {
    q: "Can I connect via SSH to Hermes Agent and OpenCode?",
    a: "Yes! Every SSH-enabled instance is assigned a dedicated, secure SSH port. You can connect securely from your terminal using your allocated connection command (e.g. ssh hermes@apps.masdika.id -p <PORT>) or via our integrated web terminal."
  },
  {
    q: "Is there protection against resource abuse on SSH containers?",
    a: "Absolutely. Terminal-accessible applications operate in locked-down, restricted user environments with Linux cgroups and seccomp profiles enforced. Package installation, unauthorized background daemons, and resource abuse are blocked to guarantee cluster stability."
  },
  {
    q: "How does billing work?",
    a: "Billing is transparent and predictable. You can choose flexible Monthly plans starting at Rp 20.000/month or hourly Pay-As-You-Go rates deducted from your deposit balance. There are no lock-in contracts or setup fees."
  },
  {
    q: "Can I upgrade or scale my application resources later?",
    a: "Yes. You can scale your vCPU and RAM allocations at any time directly from the dashboard. Your application workspace, workflows, and configurations remain 100% intact across upgrades."
  }
];

interface ManagedAppsClientProps {
  catalog?: ManagedAppDefinition[];
  plans?: ManagedAppPlanDefinition[];
}

export default function ManagedAppsClient({
  catalog = MANAGED_APPS_CATALOG,
  plans = MANAGED_APP_PLANS,
}: ManagedAppsClientProps) {
  // App Carousel state & drag logic
  const appScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const isPausedRef = useRef(false);
  const dragLastXRef = useRef(0);
  const lastTouchXRef = useRef(0);

  // Interactive Configurator State
  const [selectedAppId, setSelectedAppId] = useState<string>("hermes");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("1c2g");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "HOURLY">("MONTHLY");

  const activeApp = catalog.find((a) => a.id === selectedAppId) || catalog[0];
  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[1] || plans[0];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Helper to measure exact width of 1 complete app set
  const getItemSetWidth = useCallback((container: HTMLDivElement) => {
    const children = container.children;
    const n = catalog.length;
    if (children.length >= n * 2) {
      const el0 = children[0] as HTMLElement;
      const elN = children[n] as HTMLElement;
      const diff = elN.offsetLeft - el0.offsetLeft;
      if (diff > 0) return diff;
    }
    return container.scrollWidth / 6;
  }, [catalog.length]);

  // Seamless wrap-around logic ensuring infinite continuous flow
  const wrapScroll = useCallback((container: HTMLDivElement) => {
    const setWidth = getItemSetWidth(container);
    if (!setWidth || setWidth <= 10) return;

    const minScroll = setWidth * 1.5;
    const maxScroll = setWidth * 3.5;

    while (container.scrollLeft >= maxScroll) {
      container.scrollLeft -= setWidth;
    }
    while (container.scrollLeft < minScroll) {
      container.scrollLeft += setWidth;
    }
  }, [getItemSetWidth]);

  // Initial scroll positioning into the middle sets
  useEffect(() => {
    const container = appScrollRef.current;
    if (!container) return;

    const initPos = () => {
      const setWidth = getItemSetWidth(container);
      if (setWidth > 0 && (container.scrollLeft === 0 || container.scrollLeft < setWidth)) {
        container.scrollLeft = setWidth * 2;
      }
    };

    initPos();
    const timer = setTimeout(initPos, 150);
    return () => clearTimeout(timer);
  }, [getItemSetWidth]);

  // Infinite continuous auto-scroll loop (60fps)
  useEffect(() => {
    const container = appScrollRef.current;
    if (!container) return;

    let animationId: number;
    let accumulated = 0;
    const speed = 0.75;
    let isVisible = true;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]) {
        isVisible = entries[0].isIntersecting;
      }
    });
    observer.observe(container);

    const step = () => {
      if (!isPausedRef.current && !isDraggingRef.current && isVisible) {
        accumulated += speed;
        if (accumulated >= 1) {
          const px = Math.floor(accumulated);
          container.scrollLeft += px;
          accumulated -= px;
          wrapScroll(container);
        }
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [wrapScroll]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!appScrollRef.current) return;
    setIsDragging(true);
    isDraggingRef.current = true;
    isPausedRef.current = true;
    dragLastXRef.current = e.pageX;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = appScrollRef.current;
      if (!container || !isDraggingRef.current) return;
      e.preventDefault();
      const deltaX = e.pageX - dragLastXRef.current;
      dragLastXRef.current = e.pageX;
      container.scrollLeft -= deltaX;
      wrapScroll(container);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      isPausedRef.current = false;
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("blur", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("blur", handleGlobalMouseUp);
    };
  }, [isDragging, wrapScroll]);

  const handleTouchStart = (e: React.TouchEvent) => {
    isPausedRef.current = true;
    if (e.touches[0]) {
      lastTouchXRef.current = e.touches[0].pageX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = appScrollRef.current;
    if (!container || !e.touches[0]) return;
    const currentX = e.touches[0].pageX;
    const deltaX = currentX - lastTouchXRef.current;
    lastTouchXRef.current = currentX;
    container.scrollLeft -= deltaX;
    wrapScroll(container);
  };

  const handleTouchEnd = () => {
    isPausedRef.current = false;
  };

  const handleManualSlide = (direction: "left" | "right") => {
    const container = appScrollRef.current;
    if (!container) return;
    const delta = direction === "left" ? -280 : 280;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-10 sm:pb-14 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identical to Managed DB & VPS Page Pattern) ───────────── */}
        <section className="relative pt-6 sm:pt-10 pb-8 sm:pb-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase whitespace-nowrap">
                  ENTERPRISE KUBERNETES CLUSTER
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Managed Application &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  High-Performance Clusters.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Deploy production-grade Hermes Agent, 9Router, n8n, OpenCode, and OpenClaw in seconds. Powered by Kubernetes container isolation, automated SSL ingress, sandboxed SSH terminals, and under 20ms local latency across Indonesia.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#pricing"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Configure &amp; Deploy
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#apps"
                  leftIcon={<Boxes className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Explore Stacks
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar (managed-apps.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/images/mascots/managed-apps.webp"
                imageAlt="Masdika – Managed Applications & Kubernetes Microservices"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Boxes, label: "Application Stacks", value: "Hermes, 9Router, n8n, OpenCode" },
                  { icon: Cpu, label: "Compute Engine", value: "Guaranteed vCPU & RAM" },
                  { icon: Zap, label: "NodePort Access", value: "Direct High-Speed Port" },
                  { icon: ShieldCheck, label: "Architecture", value: "Dedicated Kubernetes Pods" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights) ─────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { icon: Box, title: "Kubernetes Pod Isolation", desc: "Every application runs inside dedicated container pods with strict CPU and memory resource quotas." },
              { icon: Globe, title: "Automated Let's Encrypt SSL", desc: "Zero-configuration Ingress routing on *.app.masdika.id with automated SSL certificate provisioning." },
              { icon: RefreshCw, title: "Self-Healing Orchestration", desc: "Automated container restarts and node failover reconciliation guarantee 99.9% uptime." },
              { icon: Activity, title: "Local Sidoarjo DC", desc: "Under 20ms ultra-low ping across Indonesia with direct IIX, OpenIX, and CDIX peering." },
            ].map((pillar, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-sm hover:border-cyan-500/40 transition-colors">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <pillar.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 2. SUPPORTED APPLICATION STACKS CAROUSEL ──────────────────── */}
        <section id="apps" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="text-center mb-6 sm:mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              SUPPORTED STACKS
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-[1.15] mb-3">
              One-Click Production Application Stacks
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Select your favorite AI agent, API router, or workflow engine, pre-configured with secure ingress and automated orchestration.
            </p>
          </div>

          <div className="relative overflow-hidden w-full border border-[var(--border-primary)] bg-[var(--surface)] rounded-2xl p-6 shadow-md group">
            {/* Left Arrow Button */}
            <button
              type="button"
              onClick={() => handleManualSlide("left")}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-cyan-500 transition-all duration-200 shadow-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105"
              aria-label="Previous Application"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scroll Track */}
            <div className="w-full [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div
                ref={appScrollRef}
                onMouseDown={handleMouseDown}
                onMouseEnter={() => { isPausedRef.current = true; }}
                onMouseLeave={() => {
                  if (!isDraggingRef.current) isPausedRef.current = false;
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onScroll={() => {
                  if (appScrollRef.current) wrapScroll(appScrollRef.current);
                }}
                className={cn(
                  "flex items-center gap-12 sm:gap-16 overflow-x-auto select-none py-2 w-full",
                  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
              >
                {REPEATED_APPS.map((app, idx) => (
                  <div
                    key={`app-${idx}`}
                    className="flex items-center gap-3 shrink-0 transition-transform duration-200 select-none hover:scale-105 cursor-pointer"
                    onClick={() => {
                      setSelectedAppId(app.id);
                      const el = document.getElementById("pricing");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <img
                      referrerPolicy="no-referrer"
                      src={app.icon}
                      alt={app.name}
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain pointer-events-none select-none bg-slate-900/40 p-1 border border-white/5"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-base sm:text-lg tracking-tight text-[var(--text-primary)] select-none pointer-events-none">
                        {app.name}
                      </span>
                      <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                        {app.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow Button */}
            <button
              type="button"
              onClick={() => handleManualSlide("right")}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-cyan-500 transition-all duration-200 shadow-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105"
              aria-label="Next Application"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ── 3. HARDWARE & K8S ARCHITECTURE SHOWCASE ───────────────────── */}
        <section id="features" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 sm:p-12 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                  KUBERNETES CLUSTER ARCHITECTURE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                  Built on Cloud-Native Kubernetes
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
                  Unlike conventional shared hosting, each Masdika Managed Application runs in an isolated StatefulSet Pod with dedicated memory buffers, guaranteed CPU limits, and automated self-healing.
                </p>

                <div className="space-y-3.5">
                  {[
                    "Isolated Kubernetes StatefulSet Pod with Dedicated Resource Limits",
                    "Automated Self-Healing Pods with Zero-Downtime Rolling Restarts",
                    "Sandboxed SSH & Dedicated Secure Port for CLI Tools",
                    "Automated Let's Encrypt TLS/SSL Ingress for Web Interfaces",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cluster Stats Grid */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                    &lt;1s
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Failover Detection
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                    100%
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Uptime SLA
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    Guaranteed vCPU
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    Sidoarjo DC
                  </span>
                </div>

                <div className="col-span-2 p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      99.9% Application Availability
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      Orchestrated auto-restart and zero-touch pod health reconciliation
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3.5. SUPPORT INFRA & CARRIER-GRADE NETWORK (K3s Mode) ─────── */}
        <EnterpriseInfraSection mode="k3s" />

        {/* ── 3.6. ANTI-DDOS WORKFLOW (K3s Mode) ────────────────────────── */}
        <AntiDdosWorkflowSection mode="k3s" />

        {/* ── 4. INTERACTIVE PRICING & SPEC CONFIGURATOR ────────────────── */}
        <section id="pricing" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-4 block">
              FLEXIBLE APPLICATION PRICING
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Pay-As-You-Go Application Configurator
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
              Select your application stack and compute tier. Transparent pricing with zero setup fees or long-term commitments.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs text-[var(--text-secondary)] shadow-sm">
              <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>
                <strong>Zero Maintenance:</strong> Automated Let&apos;s Encrypt SSL, isolated container environments, and dedicated ports are completely included.
              </span>
            </div>
          </div>

          {/* Configurator Box - Full Space Container */}
          <div className="relative rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-4 sm:p-8 md:p-12 shadow-xl overflow-hidden w-full">
            
            {/* Step 1: Select Application Stack */}
            <div className="mb-8 sm:mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>Select Application Stack</span>
                </label>
                <span className="text-xs text-[var(--text-muted)] font-medium pl-7 sm:pl-0">
                  Automated SSL or direct SSH provisioned instantly
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {catalog.map((app) => {
                  const isSelected = selectedAppId === app.id;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedAppId(app.id)}
                      className={cn(
                        "rounded-xl border text-left transition-all relative group cursor-pointer p-3.5 sm:p-4 flex flex-col justify-between min-h-[110px] sm:min-h-[130px]",
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30"
                          : "border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40"
                      )}
                    >
                      <div className="flex items-start justify-between w-full">
                        <img 
                          src={app.icon} 
                          alt={app.name} 
                          className="w-8 h-8 rounded-lg object-contain shrink-0 bg-slate-900/60 p-1 border border-white/5" 
                        />
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold",
                            app.accessProtocol === 'SSH' ? "bg-amber-500/20 text-amber-400" : "bg-cyan-500/20 text-cyan-400"
                          )}>
                            {app.accessProtocol}
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                          {app.name}
                        </div>
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                          {app.badge}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Compute Tier (Flavor) */}
            <div className="mb-8 sm:mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>Select Compute Specification</span>
                </label>

                {/* Billing Cycle Toggle */}
                <div className="inline-flex items-center p-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("MONTHLY")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-bold transition-all",
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
                      "px-3 py-1 rounded-md text-xs font-bold transition-all",
                      billingCycle === "HOURLY"
                        ? "bg-cyan-500 text-slate-950 shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Pay-As-You-Go
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  const priceDisplay = billingCycle === "MONTHLY" 
                    ? `${formatCurrency(p.monthlyPrice)}/mo`
                    : `${formatCurrency(p.hourlyPrice)}/hr`;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanId(p.id)}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[120px] group cursor-pointer",
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30"
                          : "border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40"
                      )}
                    >
                      {p.isPopular && (
                        <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-md flex items-center gap-1 border border-amber-300/40">
                          <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                          <span>Popular</span>
                        </span>
                      )}

                      <div className="flex items-start justify-between w-full">
                        <div>
                          <div className="text-sm font-bold text-[var(--text-primary)]">
                            {p.cpuLabel} • {p.ramLabel}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5 font-medium">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{p.cpuShares >= 1 ? `${p.cpuShares} Dedicated Core` : 'Guaranteed Core'}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-2 border-t border-[var(--border-primary)] flex items-baseline justify-between w-full">
                        <span className="text-base sm:text-lg font-black text-cyan-600 dark:text-cyan-400">
                          {priceDisplay}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {p.planCode}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Calculation Card */}
            <div className="p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                    ESTIMATED RATE
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                    {billingCycle === "MONTHLY" ? "FIXED MONTHLY" : "PAYG HOURLY"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
                    {formatCurrency(activePlan.monthlyPrice)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    /month (~{formatCurrency(activePlan.hourlyPrice)}/hr)
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                  Includes {activeApp.name}, {activePlan.cpuLabel} / {activePlan.ramLabel} &amp; {activeApp.accessProtocol === 'SSH' ? 'Direct SSH Terminal Access' : 'Automated Let\'s Encrypt SSL Ingress'}.
                </p>
              </div>

              <div className="w-full md:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  href={`/dashboard/apps/new?app=${selectedAppId}&plan=${selectedPlanId}`}
                  className="w-full md:w-auto justify-center font-bold"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy {activeApp.name} ({activePlan.planCode})
                </Button>
              </div>
            </div>

            {/* 4 Feature Badges Under Configurator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {[
                { icon: ShieldCheck, title: "Kubernetes Pod Isolation", desc: "Guaranteed CPU & RAM allocation with strict cgroup limits." },
                { icon: Globe, title: "Automated Let's Encrypt SSL", desc: "Instant HTTPS certificates with zero DNS setup required." },
                { icon: Terminal, title: "Sandboxed Direct SSH", desc: "Secure command-line access via dedicated high-speed NodePorts." },
                { icon: RefreshCw, title: "Self-Healing Container", desc: "Automatic container restarts with zero-downtime health reconciliation." },
              ].map((feat, i) => (
                <div key={i} className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-3">
                  <feat.icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">{feat.title}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── 5. USE CASES SECTION ──────────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              PRODUCTION WORKLOADS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Engineered for Autonomous AI &amp; Modern Workflows
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              From autonomous coding agents to high-throughput multi-LLM gateways, Masdika Managed Applications deliver native Kubernetes performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { 
                icon: Terminal, 
                title: "Autonomous Coding & CLI Agents", 
                desc: "Run NousResearch Hermes Agent and OpenCode with persistent memory, tool-calling loops, and direct terminal execution without timeout limits." 
              },
              { 
                icon: Zap, 
                title: "Multi-LLM Routing & Compression", 
                desc: "Deploy 9Router to unify OpenAI and Anthropic APIs, route traffic with automatic failover, and compress token payloads to lower LLM costs." 
              },
              { 
                icon: Workflow, 
                title: "Visual Workflow Automations", 
                desc: "Self-host n8n with 400+ connectors, native LangChain nodes, and automated webhook endpoints with zero per-workflow execution limits." 
              }
            ].map((srv, idx) => (
              <FadeIn key={idx} delay={idx * 0.1} direction="up" className="h-full">
                <div className="p-8 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-200 h-full flex flex-col justify-between group shadow-sm">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 group-hover:scale-105 transition-transform">
                      <srv.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {srv.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 6. COMPREHENSIVE FEATURES GRID ────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Everything Your Application Layer Requires
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Cpu, title: "Guaranteed vCPU & RAM", desc: "Dedicated resource allocations ensure consistent, unthrottled application performance." },
              { icon: Globe, title: "Automated Let's Encrypt SSL", desc: "Zero-configuration wildcard TLS certificates provisioned automatically for web apps." },
              { icon: Terminal, title: "Sandboxed Direct SSH", desc: "High-speed CLI access over dedicated NodePorts protected by hardened user permissions." },
              { icon: Zap, title: "Dynamic Scaling", desc: "Expand your vCPU and memory specifications seamlessly as your compute requirements grow." },
              { icon: RefreshCw, title: "Graceful Restarts", desc: "Perform rolling Pod restarts safely without dropping active application connections." },
              { icon: ShieldCheck, title: "Cgroup Memory Isolation", desc: "Strict Linux container limits guarantee noisy neighbors never impact your containers." },
              { icon: KeyRound, title: "Isolated Cluster Secrets", desc: "API keys and sensitive tokens are encrypted using Kubernetes Secret objects." },
              { icon: Activity, title: "Real-Time Telemetry", desc: "Monitor live CPU usage, memory consumption, and runtime metrics in dashboard." }
            ].map((feat, i) => (
              <FadeIn key={i} delay={i * 0.05} direction="up" className="h-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors flex flex-col justify-between h-full shadow-sm">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
                      <feat.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 7. HOW IT WORKS SECTION ───────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              PROVISIONING WORKFLOW
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Deploy Your Application in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-slate-200 dark:bg-white/10 overflow-hidden rounded-full">
              <AnimatedBeam />
            </div>

            {[
              { step: "01", title: "Select App & Plan", desc: "Choose Hermes Agent, 9Router, n8n, OpenCode, or OpenClaw and pick your compute tier." },
              { step: "02", title: "Top Up Balance", desc: "Fund your account via QRIS or automated gateway. Only pay for exact active hours." },
              { step: "03", title: "Connect & Build", desc: "Receive automated SSL endpoints or direct SSH access and launch your application instantly." }
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

        {/* ── 8. PROVISIONING SECTION (Live Kubernetes Terminal Visualizer) ─ */}
        <ProvisioningSection
          subtitle="AUTOMATED CLUSTER PROVISIONING"
          title="Instant, native Kubernetes deployment."
          description="Our control panel manages Kubernetes Pod scheduling, persistent volume claim binding, secret encryption, and public TCP routing automatically. Your application is deploy-ready in seconds."
          buttonText="Open Application Panel"
          buttonHref="/dashboard/apps"
          logs={APP_TERMINAL_LOGS}
          stats={APP_TERMINAL_STATS}
          terminalTitle="PROVISIONING MANAGED APPLICATION (K3S)"
          iconType="k3s"
          targetServer="Dell PowerEdge R630 • Sidoarjo DC (Kubernetes Cluster)"
          provisionEstimate="Backend: Native Kubernetes (~15 Seconds)"
        />

        {/* ── 9. FINAL CTA SECTION ──────────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10 w-full">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-10 md:p-16 text-center shadow-xl overflow-hidden w-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                START BUILDING TODAY
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-tight mb-4">
                Ready for True Managed Cloud Applications?
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
                Deploy production-ready AI agents and workflows on Masdika Kubernetes infrastructure today. Enjoy isolated Pods, automated SSL, and guaranteed compute.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/apps"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy Your Application
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 10. FAQ SECTION ───────────────────────────────────────────── */}
        <FaqSection faqs={APP_FAQS} />

      </div>
    </div>
  );
}
