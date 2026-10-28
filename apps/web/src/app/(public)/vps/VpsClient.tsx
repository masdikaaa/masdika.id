"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  ChevronLeft, 
  ChevronRight, 
  Info,
  Layers,
  Lock
} from "lucide-react";
import VpsSpecSlider from "@/components/ui/VpsSpecSlider";
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

const VPS_TERMINAL_LOGS = [
  { time: "00:01", module: "CONFIG", message: "Parsing instance specifications..." },
  { time: "00:02", module: "REGION", message: "Initializing resources in Sidoarjo Data Center..." },
  { time: "00:03", module: "COMPUTE", message: "Allocating scalable vCPU and RAM..." },
  { time: "00:04", module: "STORAGE", message: "Attaching high-speed SSD block storage..." },
  { time: "00:05", module: "NET", message: "Configuring VPC, NAT Gateway, and Firewall Rules..." },
  { time: "00:06", module: "BOOT", message: "Booting instance and passing health checks..." },
  { time: "00:07", module: "READY", message: "ssh root@masdika.node", isCommand: true },
];

const VPS_TERMINAL_STATS = [
  { value: "Custom", label: "FIREWALL" },
  { value: "Included", label: "NAT GATEWAY" },
  { value: "Included", label: "VPC PEERING" },
  { value: "Any", label: "OPEN PORTS" },
];

const SUPPORTED_OPERATING_SYSTEMS = [
  { name: "AlmaLinux", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg" },
  { name: "Alpine Linux", icon: "https://cdn.simpleicons.org/alpinelinux/0D597F" },
  { name: "Debian", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg" },
  { name: "FreeBSD", icon: "https://cdn.simpleicons.org/freebsd/AB2B28" },
  { name: "Ubuntu", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ubuntu/ubuntu-original.svg" },
  { name: "Windows Server", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows8/windows8-original.svg" },
];

const REPEATED_OPERATING_SYSTEMS = [
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
];

const VPS_FAQS = [
  {
    q: "Why is the Sidoarjo datacenter important?",
    a: "Having our servers locally in Sidoarjo, East Java guarantees ultra-low latency (under 20ms) across Indonesia, ensuring much faster response times compared to routing traffic to Singapore or the US."
  },
  {
    q: "Should I choose SSD or HDD?",
    a: "Select SSD if you are running databases, high-traffic websites, or applications requiring fast I/O. Opt for HDD if you need massive storage space for backups, file hosting, or archives at a lower cost."
  },
  {
    q: "What kind of applications can I run?",
    a: "Yes! You can run almost anything. Our high-core count Intel Xeon E5-2673v4 processors make these servers excellent for hosting websites, databases, VPNs, or custom backend applications. You have full root access to install whatever you need."
  },
  {
    q: "Do I get full root access and VNC?",
    a: "Absolutely. You get full root access via SSH, plus an out-of-band VNC Console directly in your dashboard, giving you total control to install packages, tweak the kernel, and configure the OS exactly to your requirements."
  },
  {
    q: "How can I expose my applications online with VPS NAT?",
    a: "Since the VPS NAT does not come with a dedicated public IP by default, you can easily use Cloudflare Tunnel (cloudflared) to securely expose your web services and applications to the internet without needing port forwarding."
  }
];

export default function VpsClient({ safePricing, isVpsEnabled }: { safePricing: any; isVpsEnabled: boolean }) {
  const osScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const isPausedRef = useRef(false);
  const dragLastXRef = useRef(0);
  const lastTouchXRef = useRef(0);

  // Helper to measure exact width of 1 complete OS set
  const getItemSetWidth = useCallback((container: HTMLDivElement) => {
    const children = container.children;
    const n = SUPPORTED_OPERATING_SYSTEMS.length;
    if (children.length >= n * 2) {
      const el0 = children[0] as HTMLElement;
      const elN = children[n] as HTMLElement;
      const diff = elN.offsetLeft - el0.offsetLeft;
      if (diff > 0) return diff;
    }
    return container.scrollWidth / 6;
  }, []);

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
    const container = osScrollRef.current;
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
    const container = osScrollRef.current;
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
    if (!osScrollRef.current) return;
    setIsDragging(true);
    isDraggingRef.current = true;
    isPausedRef.current = true;
    dragLastXRef.current = e.pageX;
  };

  // Window mousemove / mouseup for unrestricted drag
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = osScrollRef.current;
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

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    isPausedRef.current = true;
    if (e.touches[0]) {
      lastTouchXRef.current = e.touches[0].pageX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = osScrollRef.current;
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

  // Arrow button click step
  const handleManualSlide = (direction: "left" | "right") => {
    const container = osScrollRef.current;
    if (!container) return;
    const delta = direction === "left" ? -280 : 280;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

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
                  HIGH-PERFORMANCE KVM COMPUTE
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page & design.md) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Cloud VPS &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Scalable Compute.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Deploy scalable, lightning-fast KVM cloud instances in seconds. Located securely in Sidoarjo Datacenter with under 20ms latency across Indonesia.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
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
                  href="#features"
                  leftIcon={<Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Explore Hardware
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (vps.webp) with 4 Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-6 lg:mt-0"
            >
              <HeroAvatarFrame
                imageSrc="/vps.webp"
                imageAlt="Masdika – Cloud VPS & Compute"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Cpu, label: "KVM Architecture", value: "Dedicated vCPU" },
                  { icon: HardDrive, label: "Storage Tiers", value: "SSD & SAS Drives" },
                  { icon: Zap, label: "Local Routing", value: "< 20ms Latency ID" },
                  { icon: ShieldCheck, label: "Availability", value: "98.99% Uptime SLA" },
                ]}
              />
            </motion.div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights) ─────────────────────── */}
        <section className="py-12 border-y border-[var(--border-primary)] mb-16 lg:mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { icon: Cloud, title: "98.99% Uptime SLA", desc: "Automated failover with redundant power and enterprise network backbone." },
              { icon: ShieldCheck, title: "Enterprise Anti-DDoS", desc: "Always-on multi-layered traffic scrubbing to protect mission-critical apps." },
              { icon: Terminal, title: "Full Root & VNC", desc: "Unrestricted root SSH access plus browser-based out-of-band VNC console." },
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

        {/* ── 2. HARDWARE & SPECS SHOWCASE ──────────────────────────────── */}
        <section id="features" className="scroll-mt-24 mb-16 lg:mb-24">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 sm:p-12 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                  HARDWARE ARCHITECTURE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                  Engineered for Extreme Power &amp; Stability
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
                  Every VPS instance is backed by enterprise-grade Dell PowerEdge R630 servers and localized routing in our Sidoarjo datacenter for intensive multi-threaded workloads.
                </p>

                <div className="space-y-3.5">
                  {[
                    "Dual Socket Dell PowerEdge R630 Enterprise Servers",
                    "2x Intel Xeon E5-2673v4 High-Frequency Processors",
                    "Choose between Enterprise SATA SSD or SAS HDD",
                    "500Mbps High-Throughput Shared Local Bandwidth",
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
                    CPU Threads
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    SSD &amp; HDD Tiers
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
                      98.99% Network Availability
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      Carrier-neutral backbone with enterprise reliability
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
 
        {/* ── 2.5. SUPPORT INFRA & CARRIER-GRADE ARCHITECTURE ──────────── */}
        <EnterpriseInfraSection mode="vps" />

        {/* ── 2.6. HOW ANTI-DDOS WORKS ANIMATED PIPELINE ───────────────── */}
        <AntiDdosWorkflowSection mode="vps" />

        {/* ── 3. SPEC SLIDER & PRICING CALCULATOR ───────────────────────── */}
        <section id="pricing" className="scroll-mt-24 mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-4 block">
              FLEXIBLE CLOUD PRICING
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Pay-As-You-Go Hourly Billing
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
              Allocate the exact resources your workload requires. Top up your deposit balance and scale anytime with zero commitment.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs text-[var(--text-secondary)] shadow-sm">
              <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>
                <strong>Note:</strong> Default provisioning includes NAT IPv4. Dedicated public IPv4 addresses can be attached anytime.
              </span>
            </div>
          </div>

          <VpsSpecSlider pricing={safePricing} serviceType="VPS" isDisabled={!isVpsEnabled} />

          {/* 4 Feature Badges Under Slider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {[
              { icon: ShieldCheck, title: "Isolated Resources", desc: "Dedicated vCPU and memory allocation — zero noisy neighbors." },
              { icon: Terminal, title: "Full Root Control", desc: "Install custom kernels, OS packages, and daemons without limitations." },
              { icon: TrendingUp, title: "Instant Upgrades", desc: "Scale compute, memory, and disk capacity smoothly from your dashboard." },
              { icon: Shield, title: "KVM Virtualization", desc: "Hardware-level virtualization ensuring complete operational isolation." },
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

        {/* ── 4. SUPPORTED OPERATING SYSTEMS ────────────────────────────── */}
        <section className="mb-16 lg:mb-24">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              OPERATING SYSTEMS
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-[1.15] mb-3">
              One-Click OS Deployment
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Choose from leading Linux distributions or Windows Server images ready in seconds.
            </p>
          </div>

          <div className="relative overflow-hidden w-full border border-[var(--border-primary)] bg-[var(--surface)] rounded-2xl p-6 shadow-md group">
            {/* Left Arrow Button */}
            <button
              type="button"
              onClick={() => handleManualSlide("left")}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-cyan-500 transition-all duration-200 shadow-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105"
              aria-label="Previous OS"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scroll Track */}
            <div className="w-full [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div
                ref={osScrollRef}
                onMouseDown={handleMouseDown}
                onMouseEnter={() => { isPausedRef.current = true; }}
                onMouseLeave={() => {
                  if (!isDraggingRef.current) isPausedRef.current = false;
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onScroll={() => {
                  if (osScrollRef.current) wrapScroll(osScrollRef.current);
                }}
                className={cn(
                  "flex items-center gap-12 sm:gap-16 overflow-x-auto select-none py-2 w-full",
                  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
              >
                {REPEATED_OPERATING_SYSTEMS.map((os, idx) => (
                  <div
                    key={`os-${idx}`}
                    className="flex items-center gap-3 shrink-0 transition-transform duration-200 select-none hover:scale-105"
                  >
                    <img
                      referrerPolicy="no-referrer"
                      src={os.icon}
                      alt={os.name}
                      className="h-8 w-8 sm:h-9 sm:w-9 object-contain pointer-events-none select-none"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    <span className="font-bold text-base sm:text-lg tracking-tight text-[var(--text-primary)] select-none pointer-events-none">
                      {os.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow Button */}
            <button
              type="button"
              onClick={() => handleManualSlide("right")}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-cyan-500 transition-all duration-200 shadow-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105"
              aria-label="Next OS"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ── 5. USE CASES SECTION ──────────────────────────────────────── */}
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              WORKLOAD SOLUTIONS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Built for Modern Cloud Workloads
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              From microservices to high-traffic database clusters, Masdika Cloud VPS provides dedicated performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { 
                icon: Box, 
                title: "Docker & Container Pods", 
                desc: "Optimized for lightweight containerization. Leverage multi-threaded CPUs for Docker, microservices, and CI runners." 
              },
              { 
                icon: Globe, 
                title: "High-Traffic Web Applications", 
                desc: "Host Next.js, Laravel, Node.js, and WordPress with zero noisy neighbors and under 20ms local latency across Indonesia." 
              },
              { 
                icon: Database, 
                title: "Database Clusters & Storage", 
                desc: "Run PostgreSQL, MySQL, Redis, and Elasticsearch with high sustained IOPS and enterprise-grade SSD storage." 
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
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Everything Your Infrastructure Demands
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: "SSD & HDD Tiers", desc: "Choose high-speed SSD for databases or economical HDD for large backup stores." },
              { icon: ShieldCheck, title: "Automated Anti-DDoS", desc: "Carrier-level DDoS mitigation protecting all public-facing services." },
              { icon: Terminal, title: "SSH & VNC Console", desc: "Out-of-band console access directly from your browser even if network fails." },
              { icon: Cloud, title: "98.99% Availability", desc: "Fault-tolerant infrastructure designed for mission-critical uptime." },
              { icon: TrendingUp, title: "Seamless Scaling", desc: "Dynamically increase CPU, RAM, or storage anytime without data loss." },
              { icon: Network, title: "Virtual Private Cloud", desc: "Isolated internal network topology for internal service communication." },
              { icon: Server, title: "VPC Peering", desc: "Connect instances privately with zero bandwidth egress charges." },
              { icon: Activity, title: "Hardware Monitoring", desc: "Real-time metrics on CPU load, memory utilization, and network I/O." }
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
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              DEPLOYMENT WORKFLOW
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Go Live in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            {/* Connecting Line Container */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-slate-200 dark:bg-white/10 overflow-hidden rounded-full">
              <AnimatedBeam />
            </div>

            {[
              { step: "01", title: "Select Specifications", desc: "Configure vCPU cores, RAM size, disk type, and operating system tailored to your workload." },
              { step: "02", title: "Top Up Deposit", desc: "Add funds using automated payment gateways. You only pay for exact hourly usage." },
              { step: "03", title: "Deploy Instantly", desc: "Your cloud instance provisions automatically and becomes SSH-accessible in under 60 seconds." }
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

        {/* ── 8. PROVISIONING SECTION (Live Terminal) ───────────────────── */}
        <ProvisioningSection
          subtitle="AUTOMATED PROVISIONING"
          title="One-click, instant cloud server deployment."
          description="Our control panel manages backend virtualization, disk attachments, and network routing seamlessly. Simply choose your specs and connect via SSH instantly."
          buttonText="Open Dashboard"
          buttonHref="/dashboard"
          logs={VPS_TERMINAL_LOGS}
          stats={VPS_TERMINAL_STATS}
          terminalTitle="PROVISIONING CLOUD VPS"
          iconType="vps"
        />

        {/* ── 9. FINAL CTA SECTION ──────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-10 md:p-16 text-center shadow-xl overflow-hidden max-w-5xl mx-auto">
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
                  href="/dashboard/checkout"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy Your Server
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
        <FaqSection faqs={VPS_FAQS} />

      </div>
    </div>
  );
}
