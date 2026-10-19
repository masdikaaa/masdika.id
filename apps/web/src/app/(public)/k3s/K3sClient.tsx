"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
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
  Database, 
  MapPin, 
  HardDrive, 
  Activity, 
  TrendingUp, 
  Network, 
  Server, 
  Layers, 
  RefreshCw, 
  Info,
  Lock,
  Sparkles
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import VpsSpecSlider from "@/components/ui/VpsSpecSlider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/animations/FadeIn";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { cn } from "@/lib/utils";

const K3S_TERMINAL_LOGS = [
  { time: "00:01", module: "CONFIG", message: "Parsing cluster specifications..." },
  { time: "00:02", module: "REGION", message: "Initializing VPC in Sidoarjo Data Center..." },
  { time: "00:04", module: "MASTER", message: "Deploying high-availability control plane..." },
  { time: "00:07", module: "WORKER", message: "Joining worker nodes to the cluster..." },
  { time: "00:10", module: "NET", message: "Configuring Flannel CNI and Traefik Ingress..." },
  { time: "00:12", module: "KUBE", message: "Generating kubeconfig and TLS certificates..." },
  { time: "00:15", module: "READY", message: "export KUBECONFIG=~/.kube/masdika.yaml", isCommand: true },
];

const K3S_TERMINAL_STATS = [
  { value: "v1.28", label: "K3s VERSION" },
  { value: "HA", label: "CONTROL PLANE" },
  { value: "Auto", label: "SCALING" },
  { value: "Traefik", label: "INGRESS" },
];

const K3S_FAQS = [
  {
    q: "What is K3s and how is it different from standard Kubernetes?",
    a: "K3s is a CNCF-certified, highly available Kubernetes distribution designed for production workloads. It strips out legacy in-tree cloud providers and bloated extensions to deliver a lightweight, blazing-fast Kubernetes experience with 50% less memory overhead."
  },
  {
    q: "Do I get full cluster-admin access?",
    a: "Yes! You receive complete cluster-admin credentials via Kubeconfig. You can run any kubectl commands, deploy Helm charts, set up operators, and install CRDs without restrictions."
  },
  {
    q: "How do I add or scale worker nodes?",
    a: "You can provision new worker nodes directly from your dashboard. Our control plane automatically attaches and registers them into your cluster with zero downtime."
  },
  {
    q: "Are the nodes behind NAT and can I expose services?",
    a: "By default, K3s nodes are provisioned with secure NAT routing. You can easily expose your web services to the internet using Cloudflare Tunnel (cloudflared) or by attaching dedicated public IPv4 addresses."
  },
  {
    q: "Can I access the underlying node via SSH?",
    a: "Yes. In addition to Kubernetes API access, you get full root SSH access and out-of-band VNC console access directly from your dashboard for complete infrastructure management."
  },
  {
    q: "Why is the Sidoarjo datacenter beneficial for Kubernetes?",
    a: "Local hosting in Sidoarjo, East Java guarantees under 20ms ping across Indonesia with direct IIX peering, making it ideal for low-latency microservices, edge data processing, and local traffic workloads."
  }
];

export default function K3sClient({ safePricing, isK3sEnabled }: { safePricing: any; isK3sEnabled: boolean }) {
  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Home Page, Vacancies & design.md) ────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl relative z-30"
            >
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  MANAGED KUBERNETES (K3S) PAAS
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page & design.md) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Managed Kubernetes <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  &amp; Clusters.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Deploy lightweight, production-grade K3s clusters in seconds. We handle control plane provisioning, automated upgrades, and self-healing so you can deploy containerized microservices effortlessly.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#pricing"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Configure Cluster
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#features"
                  leftIcon={<SiKubernetes className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Cluster Architecture
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (k3s.webp) with 4 Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-10 lg:mt-0"
            >
              <div className="relative w-full max-w-[380px] sm:max-w-[480px] lg:max-w-[560px] xl:max-w-[600px] h-[400px] sm:h-[460px] lg:h-[500px] mx-auto flex items-end justify-center">
                {/* Subtle ambient depth bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left (Orchestration) */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <SiKubernetes className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Orchestration
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Production K3s
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right (Auto-Scaling) */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <RefreshCw className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Auto Scaling
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Dynamic Node Pools
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left (Ingress & CNI) */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Network className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Ingress &amp; CNI
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Traefik &amp; Flannel
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right (High Availability) */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Availability
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Multi-Master Control
                    </div>
                  </div>
                </div>

                {/* Karakter k3s.webp utuh & proporsional sesuai design.md */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                  }}
                >
                  <Image
                    src="/k3s.webp"
                    alt="Masdika – Managed Kubernetes Clusters"
                    width={1536}
                    height={1024}
                    priority={true}
                    unoptimized={true}
                    className="w-full h-full object-contain object-bottom select-none"
                    style={{ imageRendering: "-webkit-optimize-contrast" }}
                  />
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights, Equal Height) ────────── */}
        <section className="py-12 border-y border-[var(--border-primary)] mb-16 lg:mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { icon: Layers, title: "Lightweight CNCF K3s", desc: "Production-certified Kubernetes consuming 50% less RAM than traditional K8s." },
              { icon: RefreshCw, title: "Automated Scaling", desc: "Scale worker node pools dynamically on-demand with zero disruption." },
              { icon: Terminal, title: "Full Cluster Admin", desc: "Unrestricted Kubeconfig access, Helm 3 support, and root SSH node access." },
              { icon: Activity, title: "Local Sidoarjo DC", desc: "Under 20ms ultra-low ping across Indonesia with direct IIX routing." },
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

        {/* ── 2. CLUSTER HARDWARE ARCHITECTURE ──────────────────────────── */}
        <section id="features" className="scroll-mt-24 mb-16 lg:mb-24">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 sm:p-12 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                  INFRASTRUCTURE ARCHITECTURE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                  Engineered for High-Density Pod Orchestration
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
                  Every K3s cluster node is deployed on enterprise-grade Dell PowerEdge R630 servers with high-frequency Intel Xeon processors, high-IOPS storage, and native CNI networking.
                </p>

                <div className="space-y-3.5">
                  {[
                    "Dell PowerEdge R630 Dual-Socket Hardware Architecture",
                    "Intel Xeon E5-2673v4 High-Thread Processors",
                    "Enterprise SSD Storage for High-Throughput etcd & State",
                    "Flannel CNI + Built-in Traefik v2 Ingress Controller",
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

              {/* Hardware Stats Grid */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                    40
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Physical Cores
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                    80
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Compute Threads
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    SSD Storage
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
                      99.99% Cluster Availability
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      Multi-master control plane with automatic node failover
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. SPEC SLIDER & PRICING CALCULATOR ───────────────────────── */}
        <section id="pricing" className="scroll-mt-24 mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-4 block">
              CLUSTER PRICING
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Size Your Initial Master Node
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
              Configure your initial master node specs. Choose Pay-As-You-Go hourly or monthly billing. Add worker nodes anytime as your application scales.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs text-[var(--text-secondary)] shadow-sm">
              <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>
                <strong>Note:</strong> Default nodes are provisioned with secure NAT routing. Dedicated public IPv4 addresses can be added anytime.
              </span>
            </div>
          </div>

          <VpsSpecSlider pricing={safePricing} serviceType="K3S" isDisabled={!isK3sEnabled} />

          {/* 4 Feature Badges Under Slider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {[
              { icon: Layers, title: "Resource Isolation", desc: "Dedicated CPU and RAM allocation for control plane and container pods." },
              { icon: Terminal, title: "Full Kubeconfig", desc: "Direct kubectl and Helm access with complete cluster-admin privileges." },
              { icon: TrendingUp, title: "One-Click Workers", desc: "Scale worker node pools dynamically from the management dashboard." },
              { icon: Network, title: "Pre-Configured CNI", desc: "Flannel overlay networking with Traefik Ingress out-of-the-box." },
            ].map((feat, i) => (
              <div key={i} className="p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-3.5">
                <feat.icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">{feat.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. WORKLOAD SOLUTIONS / USE CASES ─────────────────────────── */}
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              TARGET USE CASES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Engineered for Modern Cloud Workloads
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              Lightweight K3s is tailored for fast microservices, dynamic CI runners, and edge deployments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {[
              { 
                icon: Layers, 
                title: "Distributed Microservices", 
                desc: "Run polyglot microservice architectures with zero noisy neighbors, internal VPC communication, and built-in load balancing." 
              },
              { 
                icon: RefreshCw, 
                title: "Dynamic CI/CD Runners", 
                desc: "Spin up ephemeral GitLab or GitHub Actions runners on demand. Scale down when builds finish to minimize compute costs." 
              },
              { 
                icon: Network, 
                title: "Edge & IoT Workloads", 
                desc: "Deploy resource-efficient container pods at the edge with under 20ms local latency across Indonesia for rapid telemetry ingestion." 
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

        {/* ── 5. ENTERPRISE CAPABILITIES GRID ───────────────────────────── */}
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Everything Your Cluster Demands
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { icon: Layers, title: "Lightweight Architecture", desc: "CNCF certified with minimal footprint, saving resource overhead for workloads." },
              { icon: RefreshCw, title: "Effortless Worker Scaling", desc: "Add or detach worker nodes in seconds from the management dashboard." },
              { icon: Network, title: "Built-In Traefik Ingress", desc: "Pre-installed HTTP/HTTPS reverse proxy and SSL certificate automation." },
              { icon: Shield, title: "VPC & Encrypted Tunnels", desc: "Isolated private network topologies with WireGuard node-to-node security." },
              { icon: TrendingUp, title: "Zero-Downtime Upgrades", desc: "Upgrade Kubernetes control plane and node specifications smoothly." },
              { icon: Cloud, title: "Isolated VPC Peering", desc: "Connect your cluster with VPS databases privately at zero internal egress cost." },
              { icon: Server, title: "Root Node & VNC Access", desc: "Out-of-band management console available directly in your browser." },
              { icon: ShieldCheck, title: "Multi-Master Failover", desc: "Automated etcd replication ensuring continuous cluster availability." }
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

        {/* ── 6. DEPLOYMENT WORKFLOW (3 Steps) ──────────────────────────── */}
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              DEPLOYMENT PROCESS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Deploy Your Cluster in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            {[
              { step: "01", title: "Size Your Master Node", desc: "Select initial CPU cores, RAM, and storage required for your control plane." },
              { step: "02", title: "Top Up Deposit", desc: "Add balance via automated QRIS or VA. You only pay for active hourly resources." },
              { step: "03", title: "Deploy & Download Kubeconfig", desc: "Your cluster provisions automatically with Kubeconfig and Helm ready in under 60 seconds." }
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.15} direction="up" className="h-full">
                <div className="p-8 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-center shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="w-16 h-16 mx-auto rounded-full border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-center mb-6">
                      <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{item.step}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">{item.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 7. PROVISIONING SECTION (Live Terminal) ───────────────────── */}
        <ProvisioningSection
          subtitle="AUTOMATED CLUSTER PROVISIONING"
          title="One-click, production-ready Kubernetes clusters."
          description="We handle the heavy lifting of Kubernetes provisioning, etcd state replication, and Flannel CNI configuration. Download your Kubeconfig and start deploying Helm charts in seconds."
          buttonText="Open Dashboard"
          buttonHref="/dashboard"
          logs={K3S_TERMINAL_LOGS}
          stats={K3S_TERMINAL_STATS}
          terminalTitle="PROVISIONING K3S CLUSTER"
          iconType="k3s"
        />

        {/* ── 8. FINAL CTA SECTION ──────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-10 md:p-16 text-center shadow-xl overflow-hidden max-w-5xl mx-auto">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                SCALE WITH CONFIDENCE
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-tight mb-4">
                Ready to Deploy Your Kubernetes Cluster?
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
                Experience high-performance container orchestration without control plane complexity. Start scaling workloads today.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/checkout"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy Your Cluster
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                >
                  Contact DevOps Specialist
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. FAQ SECTION ────────────────────────────────────────────── */}
        <FaqSection faqs={K3S_FAQS} />

      </div>
    </div>
  );
}
