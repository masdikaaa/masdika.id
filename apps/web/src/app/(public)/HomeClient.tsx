"use client";

import ReactDOM from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Layout,
  Code,
  Server,
  CheckCircle,
  Database,
  Lock,
  Cloud,
  Terminal,
  Activity,
  MessageSquare,
  Star,
  FolderOpen,
  FileText,
  Calendar,
  Clock,
  Link2,
  Building2,
  Quote,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  SiKubernetes,
  SiMikrotik,
  SiJunipernetworks,
  SiIntel,
  SiDell,
  SiCloudflare,
  SiNextdotjs,
  SiPostgresql,
} from "react-icons/si";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/FadeIn";
import { TechStackMarquee } from "@/components/ui/TechStackMarquee";
import { TechIcon } from "@/components/ui/TechIcon";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SectionOrnaments } from "@/components/ui/PremiumBackground";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";

const TypeAnimation = dynamic(
  () => import("react-type-animation").then((mod) => mod.TypeAnimation),
  { ssr: false }
);


const PRODUCTS = [
  {
    icon: Code,
    title: "API Hub",
    subtitle: "Developer Gateway & Telemetry",
    description:
      "Centralized API gateway with automated key rotation, real-time latency telemetry, and per-route rate limiting.",
    href: "/api-hub",
    type: "SaaS",
    sla: "99.95% SLA",
    specs: ["REST & Webhook", "Rate Limiting", "Live Analytics"],
    cta: "Explore API Hub",
  },
  {
    icon: SiKubernetes,
    title: "Managed K3s",
    subtitle: "Lightweight Kubernetes Engine",
    description:
      "Production-ready K3s clusters with isolated control planes, Traefik ingress, and automated kubeconfig provisioning.",
    href: "/k3s",
    type: "PaaS",
    sla: "99.95% SLA",
    specs: ["Dedicated Node", "Auto TLS Ingress", "Instant Kubeconfig"],
    cta: "Deploy K3s Cluster",
  },
  {
    icon: Terminal,
    title: "High-Performance VPS",
    subtitle: "Proxmox KVM Virtualization",
    description:
      "Dedicated vCPU Intel Xeon instances with NVMe SSD or high-capacity HDD storage, full root SSH, and private VPC networking.",
    href: "/vps",
    type: "IaaS",
    sla: "99.98% SLA",
    specs: ["Full Root Access", "NVMe SSD & HDD", "Up to 1 Gbps"],
    cta: "Configure VPS",
  },
  {
    icon: Link2,
    title: "URL Shortener",
    subtitle: "Branded Links & Click Analytics",
    description:
      "Low-latency edge link redirection with custom aliases, QR code generation, and geographic click stream analytics.",
    href: "/shortener",
    type: "SaaS",
    sla: "99.99% SLA",
    specs: ["Custom Slugs", "Geo Analytics", "Instant Redirect"],
    cta: "Create Short Link",
  },
  {
    icon: Cloud,
    title: "File CDN",
    subtitle: "S3-Backed Object Storage",
    description:
      "High-throughput S3-compatible object storage powered by RustFS with byte-range video streaming and token access control.",
    href: "/file-cdn",
    type: "PaaS",
    sla: "99.99% SLA",
    specs: ["RustFS S3 Engine", "Range Streaming", "Public & Private"],
    cta: "Explore File CDN",
  },
  {
    icon: Server,
    title: "Custom Enterprise Infra",
    subtitle: "Bespoke Cluster & BGP Peering",
    description:
      "Need custom bare-metal topologies, multi-node HA database clusters, or dedicated MikroTik/WireGuard site-to-site tunnels?",
    href: "/contact",
    type: "Enterprise",
    sla: "Custom SLA",
    specs: ["Dedicated Hardware", "BGP / WireGuard", "24/7 SRE Support"],
    cta: "Consult Architecture",
    isCustom: true,
  },
];

const INFRASTRUCTURE_STACK = [
  {
    name: "MikroTik",
    category: "Core Routing",
    description: "Enterprise BGP routing, firewalling & high-throughput network tunneling.",
    icon: SiMikrotik,
    iconColor: "text-slate-800 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400",
  },
  {
    name: "Juniper Networks",
    category: "Backbone Switch",
    description: "Carrier-grade datacenter switching and ultra-low-latency packet forwarding.",
    icon: SiJunipernetworks,
    iconColor: "text-[#00A98F] dark:text-[#2dd4bf]",
  },
  {
    name: "Intel",
    category: "Compute Engine",
    description: "High-frequency enterprise Xeon processors for intensive cloud workloads.",
    icon: SiIntel,
    iconColor: "text-[#0071C5] dark:text-[#38bdf8]",
  },
  {
    name: "Dell",
    category: "Bare-Metal",
    description: "Redundant PowerEdge rackmount server hardware with enterprise SSD/HDD RAID.",
    icon: SiDell,
    iconColor: "text-[#007DB8] dark:text-[#38bdf8]",
  },
  {
    name: "Cloudflare",
    category: "Edge & Security",
    description: "Global Anycast CDN, Zero Trust tunnels, WAF & L3/L7 DDoS mitigation.",
    icon: SiCloudflare,
    iconColor: "text-[#F38020]",
  },
  {
    name: "Kubernetes",
    category: "Container Orchestration",
    description: "Production-grade container orchestration, self-healing workloads & elastic pod autoscaling.",
    icon: SiKubernetes,
    iconColor: "text-[#326CE5] dark:text-[#326CE5]",
  },
  {
    name: "Next.js",
    category: "Web Framework",
    description: "React server-rendered architecture powering blazing-fast control panels.",
    icon: SiNextdotjs,
    iconColor: "text-slate-900 dark:text-white",
  },
  {
    name: "PostgreSQL",
    category: "Core Database",
    description: "ACID-compliant relational database engine for high-concurrency state.",
    icon: SiPostgresql,
    iconColor: "text-[#336791] dark:text-[#60a5fa]",
  },
];

const DEFAULT_TESTIMONIALS = [
  {
    name: "Sarah Jenkins",
    role: "CTO, TechCorp",
    text: "Masdika transformed our entire AWS infrastructure. Our deployments are now 5x faster and highly available.",
  },
  {
    name: "David Chen",
    role: "VP Engineering",
    text: "The Kubernetes migration was flawless. True professional with deep knowledge of modern DevOps practices.",
  },
  {
    name: "Emily Rodriguez",
    role: "Startup Founder",
    text: "He doesn't just build infrastructure; he builds scalable businesses. Excellent communication and delivery.",
  },
  {
    name: "James Wilson",
    role: "Lead Architect",
    text: "An absolute master of cloud architecture. Helped us reduce our AWS bill by 40% while improving performance.",
  },
];

export interface HomeClientProps {
  initialSettings?: Record<string, any>;
  initialProjects?: any[];
  initialPosts?: any[];
  initialTestimonials?: any[];
}

export function HomeClient({
  initialSettings = {},
  initialProjects = [],
  initialPosts = [],
  initialTestimonials = [],
}: HomeClientProps) {
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>(initialProjects);
  const [settings, setSettings] = useState<any>(initialSettings);
  const [testimonials, setTestimonials] = useState<any[]>(
    initialTestimonials && initialTestimonials.length > 0
      ? initialTestimonials
      : DEFAULT_TESTIMONIALS
  );
  const [latestPosts, setLatestPosts] = useState<any[]>(initialPosts);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setIsPaused(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftPos(scrollRef.current.scrollLeft);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    setIsPaused(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeftPos - walk;
  };

  useEffect(() => {
    // Only fetch client-side if server props were empty/unavailable
    if (portfolioProjects.length === 0) {
      fetch("/api/portfolio")
        .then((res) => res.json())
        .then((data) => {
          if (!data.error && Array.isArray(data)) {
            setPortfolioProjects(data.slice(0, 3));
          }
        })
        .catch((err) => console.error("Error fetching portfolio:", err));
    }

    if (Object.keys(settings).length === 0) {
      fetch("/api/settings/public")
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) setSettings(data);
        })
        .catch((err) => console.error("Error fetching settings:", err));
    }

    if (latestPosts.length === 0) {
      fetch("/api/posts")
        .then((res) => res.json())
        .then((data) => {
          if (!data.error && Array.isArray(data)) {
            setLatestPosts(data.slice(0, 3));
          }
        })
        .catch((err) => console.error("Error fetching posts:", err));
    }

    if (testimonials.length === 0) {
      fetch("/api/testimonials")
        .then((res) => res.json())
        .then((data) => {
          if (!data.error && Array.isArray(data) && data.length > 0) {
            setTestimonials(data);
          } else {
            setTestimonials(DEFAULT_TESTIMONIALS);
          }
        })
        .catch((err) => {
          console.error("Error fetching testimonials:", err);
          setTestimonials(DEFAULT_TESTIMONIALS);
        });
    }
  }, []);

  // Auto-scroll testimonials
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let animationId: number;
    let accumulatedScroll = 0;
    const scrollSpeed = 0.5;
    let isVisible = false;

    const observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
    });
    observer.observe(container);

    const scroll = () => {
      if (!isPaused && isVisible) {
        accumulatedScroll += scrollSpeed;
        if (accumulatedScroll >= 1) {
          container.scrollLeft += Math.floor(accumulatedScroll);
          accumulatedScroll -= Math.floor(accumulatedScroll);
          if (container.scrollLeft >= container.scrollWidth / 2) {
            container.scrollLeft = 0;
          }
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [isPaused]);

  const typingSequence = useMemo(() => {
    const rawText =
      settings?.hero_typing_text ||
      "Cloud Engineer, DevOps Expert, SysAdmin Pro, Backend Dev";
    const parts = rawText
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const seq: any[] = [];
    parts.forEach((part: string) => {
      seq.push(part);
      seq.push(2500);
    });
    if (seq.length === 0) {
      seq.push(
        "DevOps Engineer", 2500,
        "Cloud Engineer", 2500,
        "SysAdmin Pro", 2500,
        "Backend Dev", 2500
      );
    }
    return seq;
  }, [settings?.hero_typing_text]);

  // Unified cyan accent matching high-tech cloud & DevOps platform aesthetic (Image 2)
  const iconBoxStyle = isDark
    ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-400 group-hover:border-cyan-500/60 group-hover:bg-cyan-500/10 group-hover:text-cyan-300"
    : "bg-cyan-50 border-cyan-200/80 text-cyan-600 group-hover:bg-cyan-100/60 group-hover:border-cyan-300";

  const iconAccent = isDark ? "text-cyan-400" : "text-cyan-600";

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">

      {/* ── 1. HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 sm:pt-36 md:pt-40 pb-12 sm:pb-16 lg:pb-24 flex items-center">
        <SectionOrnaments variant="hero" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left – text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl relative z-30 order-1"
            >
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  AVAILABLE FOR NEW PROJECTS
                </Badge>
              </div>

              {/* Headline */}
              <div className="mb-6">
                <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-3 text-[var(--text-primary)]">
                  {settings?.hero_title || "Hi, I'm Masdika,"}
                </h1>

                <div className="min-h-[48px] sm:min-h-[56px] md:min-h-[72px] flex items-center">
                  {isMounted ? (
                    <TypeAnimation
                      key={typingSequence.join(",")}
                      sequence={typingSequence}
                      wrapper="span"
                      speed={50}
                      repeat={Infinity}
                      className={cn(
                        "font-black text-3xl sm:text-4xl md:text-[56px] tracking-tight leading-tight block",
                        iconAccent
                      )}
                    />
                  ) : (
                    <span
                      className={cn(
                        "font-black text-3xl sm:text-4xl md:text-[56px] tracking-tight leading-tight block",
                        iconAccent
                      )}
                    >
                      {typingSequence[0] || "DevOps Engineer"}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                {settings?.hero_description ||
                  "Specializing in highly available cloud infrastructure, CI/CD automation, and scalable backend services. I build robust systems that power modern digital businesses."}
              </p>

              {/* Action Buttons using shared Button primitives */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/contact"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Start a Project
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  href="/resume"
                  leftIcon={<FileText className={cn("w-4 h-4", iconAccent)} />}
                >
                  View Resume
                </Button>
              </div>
            </motion.div>
            {/* Right – hero image with smooth grounded bottom fade */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
              className="relative flex items-center justify-center mt-4 lg:mt-0 order-2"
            >
              <HeroAvatarFrame
                imageSrc="/masdika.webp"
                imageAlt="Masdika – Cloud Engineer"
                imageWidth={720}
                imageHeight={864}
                isPortrait={true}
                priority={true}
                badges={[
                  { icon: Cloud, label: "AWS Certified", value: "Cloud Expert" },
                  { icon: Database, label: "High Availability", value: "DB Architect" },
                  { icon: Activity, label: "CI/CD Pipeline", value: "Automation" },
                  { icon: SiKubernetes, label: "Kubernetes", value: "Mastery" },
                ]}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 1.5 MARQUEE STRIP ──────────────────────────────────────── */}
      <section className="relative z-20 py-4 border-y border-[var(--border-primary)] overflow-hidden bg-[var(--surface)]">
        <div className="flex whitespace-nowrap overflow-hidden">
          <div className="flex items-center animate-marquee-half" style={{ animationDuration: "40s" }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center text-xs sm:text-[13px] font-bold tracking-[0.22em] uppercase px-8 text-[var(--text-primary)]">
                <span className={cn("mr-3.5", iconAccent)}>▸</span>
                <span>CLOUD ARCHITECTURE</span>
                <span className={cn("mx-6 font-bold", iconAccent)}>•</span>
                <span>DEVOPS</span>
                <span className={cn("mx-6 font-bold", iconAccent)}>•</span>
                <span>SYSADMIN</span>
                <span className={cn("mx-6 font-bold", iconAccent)}>•</span>
                <span>KUBERNETES</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. ABOUT ──────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="sides" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-x-8 lg:gap-y-6 items-stretch">

            {/* Row 1, Left: 4+ Years Metric Card */}
            <FadeIn direction="right" duration={0.7} className="lg:col-span-4 flex">
              <div className="group relative w-full h-full rounded-2xl p-6 sm:p-7 flex flex-col justify-between border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 transition-all duration-300 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                    Track Record
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-[var(--text-muted)]">
                    EST. 2022
                  </span>
                </div>

                <div className="my-5 flex items-center gap-4">
                  <div className="flex items-center text-5xl sm:text-6xl font-black tracking-tight text-[var(--text-primary)] leading-none shrink-0">
                    4<span className={iconAccent}>+</span>
                  </div>
                  <div className="flex flex-col justify-center border-l border-[var(--border-primary)] pl-3.5">
                    <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-snug">
                      Years of Experience
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug font-mono">
                      Cloud &amp; DevOps Engineering
                    </p>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[var(--border-primary)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)] font-medium">Production SLA</span>
                  <span className={cn("font-mono font-bold", iconAccent)}>98.99% Uptime</span>
                </div>
              </div>
            </FadeIn>

            {/* Row 1, Right: About Me Bento Card */}
            <FadeIn direction="left" delay={0.1} duration={0.7} className="lg:col-span-8 flex">
              <div className="group relative w-full h-full rounded-2xl p-6 sm:p-7 flex flex-col justify-between border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 transition-all duration-300 overflow-hidden">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-cyan-600 dark:text-cyan-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                      About Me
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                      <Terminal className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                      Cloud &amp; DevOps Specialist
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--text-primary)] mb-3 leading-[1.2] tracking-tight">
                    Boost business with Modern Cloud
                  </h2>

                  <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                    As a dedicated DevOps and Cloud Engineer, I specialize in automating workflows, managing multi-cloud deployments, and scaling organizational infrastructure. I ensure your environments are secure, efficient, and highly available.
                  </p>
                </div>

                <div className="pt-3.5 mt-5 border-t border-[var(--border-primary)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {["Bare-Metal & BGP", "Kubernetes (K3s)", "CI/CD & GitOps", "Terraform IaC"].map((chip) => (
                      <span
                        key={chip}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <Link
                    href="/resume"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    View Resume <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Row 2: 3 Equal-Height Aligned Pillar Cards (4 + 4 + 4 cols) */}
            {[
              {
                icon: Server,
                title: "Infrastructure",
                badge: "50+ Deployments",
                desc: "Provisioning and operating high-availability bare-metal servers, hybrid networks, and multi-cloud clusters.",
                delay: 0.15,
              },
              {
                icon: Layout,
                title: "Architecture",
                badge: "High Availability",
                desc: "Designing resilient, fault-tolerant, and cost-effective cloud topologies tailored to mission-critical workloads.",
                delay: 0.2,
              },
              {
                icon: Code,
                title: "Automation",
                badge: "Zero-Touch CI/CD",
                desc: "Implementing reproducible Infrastructure as Code and automated delivery pipelines for rapid, safe releases.",
                delay: 0.25,
              },
            ].map((card, i) => (
              <FadeIn key={card.title + i} direction="up" delay={card.delay} duration={0.7} className="lg:col-span-4 flex">
                <div className="group relative w-full h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300 hover:-translate-y-1 p-5 sm:p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-colors", iconBoxStyle)}>
                      <card.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", iconAccent)} />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-2">
                    {card.title}
                  </h3>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-grow">
                    {card.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. WORKING PROCESS ──────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="diagonal" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="down" className="text-center max-w-2xl mx-auto mb-16">
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Workflow
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
              My Working Process
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-[var(--border-primary)] z-0" />

            {[
              { title: "Consultation", desc: "Understanding your business needs and current infrastructure.", icon: MessageSquare },
              { title: "Architecture", desc: "Designing a highly scalable, secure, and resilient cloud solution.", icon: Layout },
              { title: "Implementation", desc: "Building the infrastructure as code using modern tools.", icon: Code },
              { title: "Optimization", desc: "Continuous monitoring, scaling, and cost optimization.", icon: CheckCircle },
            ].map((step, idx) => (
              <FadeIn key={idx} delay={idx * 0.1} direction="up" className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-center justify-center mb-6 relative">
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-center text-[11px] font-bold text-[var(--text-muted)]">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <step.icon className={cn("w-8 h-8", iconAccent)} />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[220px]">{step.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3.5 PRODUCTS ────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="center" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="down" duration={0.5} className="text-center max-w-2xl mx-auto mb-16">
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Our Products
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Power Your Apps with<br />Cloud Platform
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Deploy, scale, and manage your applications with our high-performance cloud infrastructure and fully managed services.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {PRODUCTS.map((prod, i) => (
              <FadeIn key={i} delay={i * 0.06} direction="up" className="h-full">
                <Link
                  href={prod.href}
                  className={cn(
                    "block group h-full rounded-2xl border bg-[var(--surface)] transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                    prod.isCustom
                      ? "border-dashed border-cyan-500/35 hover:border-cyan-400 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.12)]"
                      : "border-[var(--border-primary)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)]"
                  )}
                >
                  <div className="relative h-full p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:scale-105", iconBoxStyle)}>
                            {prod.title === "Managed K3s"
                              ? <prod.icon className={cn("w-5 h-5", iconAccent)} />
                              : <prod.icon className={cn("w-5 h-5", iconAccent)} strokeWidth={1.75} />
                            }
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block truncate">
                              {prod.subtitle}
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                              {prod.title}
                            </h3>
                          </div>
                        </div>

                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] shrink-0">
                          {prod.type}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                        {prod.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {prod.specs.map((spec) => (
                          <span
                            key={spec}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] group-hover:border-cyan-500/25 transition-colors"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border-primary)] flex items-center justify-between gap-2 mt-auto">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {prod.sla}
                      </span>

                      <span className={cn("inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold", iconAccent)}>
                        {prod.cta}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3.8 SUPPORT & INFRASTRUCTURE ────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="sides" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="down" duration={0.5} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Support &amp; Infrastructure
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Powered by Enterprise<br className="hidden sm:inline" /> Hardware &amp; Stack
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Built on carrier-grade routing, bare-metal server hardware, global edge protection, and battle-tested software architecture.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {INFRASTRUCTURE_STACK.map((infra, idx) => (
              <FadeIn key={infra.name + idx} delay={idx * 0.06} direction="up" className="h-full">
                <div className="group relative h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300 hover:-translate-y-1 p-5 sm:p-6 flex flex-col">
                  {/* Top row: Icon box + Category badge */}
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-[var(--border-primary)] bg-[var(--surface-secondary)] group-hover:border-cyan-500/30 transition-colors shrink-0">
                      <infra.icon className={cn("w-6 h-6 transition-transform duration-300 group-hover:scale-110", infra.iconColor)} />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                      {infra.category}
                    </span>
                  </div>

                  {/* Brand Name */}
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-2">
                    {infra.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-grow">
                    {infra.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. TOOLS & TECHNOLOGIES ─────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="center-wide" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="up" duration={0.7} className="text-center max-w-2xl mx-auto mb-16">
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Expertise
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Tools & Technologies
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Leveraging industry-standard tools to build, deploy, and scale robust applications in high-performance cloud environments.
            </p>
          </FadeIn>

          <TechStackMarquee />

          <div className="flex justify-center mt-10">
            <Button
              variant="primary"
              size="md"
              href="/skills"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Explore All Skills
            </Button>
          </div>
        </div>
      </section>

      {/* ── 5. SERVICES ─────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="bottom-left" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="down" className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Solutions &amp; Consulting
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Premium IT Services
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              End-to-end infrastructure engineering, zero-downtime cloud migrations, and production reliability consulting.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {[
              {
                icon: Server,
                code: "SRV-01",
                domain: "Migration",
                title: "Cloud Migration",
                desc: "Zero-downtime workload cutovers from legacy on-premise racks to AWS, GCP, or Proxmox private cloud.",
                stack: ["AWS / GCP", "Proxmox VE", "Zero-Downtime"],
                outcome: "Seamless Cutover",
              },
              {
                icon: Database,
                code: "SRV-02",
                domain: "Data Layer",
                title: "Database Optimization",
                desc: "High-availability PostgreSQL/MySQL clustering, query execution plan tuning, and automated PITR backups.",
                stack: ["PostgreSQL", "MySQL", "Redis Cluster"],
                outcome: "Sub-ms Query Tuning",
              },
              {
                icon: Lock,
                code: "SRV-03",
                domain: "Zero-Trust",
                title: "Security & DevSecOps",
                desc: "Automated SAST/DAST pipeline gates, container image signing, WAF hardening, and WireGuard mesh ACLs.",
                stack: ["WireGuard", "Cloudflare WAF", "Trivy / SAST"],
                outcome: "Hardened Posture",
              },
              {
                icon: Cloud,
                code: "SRV-04",
                domain: "Multi-Cloud",
                title: "Cloud Architecture",
                desc: "Designing fault-tolerant, multi-AZ topologies with BGP routing, elastic autoscaling, and FinOps cost control.",
                stack: ["Multi-AZ", "BGP Routing", "FinOps"],
                outcome: "99.99% High-Availability",
              },
              {
                icon: Terminal,
                code: "SRV-05",
                domain: "Automation",
                title: "Infrastructure as Code",
                desc: "Declarative, version-controlled infrastructure provisioning using modular Terraform, OpenTofu, and Ansible.",
                stack: ["Terraform", "Ansible", "GitOps CI/CD"],
                outcome: "100% Reproducible",
              },
              {
                icon: Activity,
                code: "SRV-06",
                domain: "Telemetry",
                title: "Monitoring & Logging",
                desc: "Full-stack observability with Prometheus metrics, Grafana dashboards, Loki log aggregation, and on-call alerting.",
                stack: ["Prometheus", "Grafana", "ELK / Loki"],
                outcome: "Real-Time Alerting",
              },
            ].map((srv, idx) => (
              <FadeIn key={idx} delay={idx * 0.06} direction="up" className="h-full">
                <Link
                  href="/services"
                  className="block group h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.1)] transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <div className="p-6 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:scale-105", iconBoxStyle)}>
                            <srv.icon className="w-5 h-5" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block">
                              {srv.domain} • {srv.code}
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                              {srv.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                        {srv.desc}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {srv.stack.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] group-hover:border-cyan-500/25 transition-colors"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border-primary)] flex items-center justify-between gap-2 mt-auto">
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        Target: <strong className="text-[var(--text-primary)] font-semibold">{srv.outcome}</strong>
                      </span>

                      <span className={cn("inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold", iconAccent)}>
                        Learn More
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. PORTFOLIO HIGHLIGHTS ─────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="right-focus" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="down" className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
            <div>
              <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
                Projects
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
                Featured Work
              </h2>
            </div>
            <Button
              variant="primary"
              size="md"
              href="/portfolio"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="shrink-0 w-fit"
            >
              View All Projects
            </Button>
          </FadeIn>

          {portfolioProjects.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)]">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                <FolderOpen className={cn("w-6 h-6", iconAccent)} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No projects yet</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">Projects will appear here once they are added to the database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-sm sm:max-w-none mx-auto">
              {portfolioProjects.map((project, index) => {
                const techList = project.techStack
                  ? project.techStack.split(",").map((t: string) => t.trim()).filter(Boolean)
                  : [];

                return (
                  <FadeIn key={project.id} delay={index * 0.1} direction="up" className="h-full">
                    <div className="group flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-2xl dark:hover:shadow-[0_12px_40px_-10px_rgba(6,182,212,0.12)] transition-all duration-300 hover:-translate-y-1 h-full">
                      {/* Screenshot Preview with Clean Browser Header Bar */}
                      <Link
                        href={project.slug ? `/portfolio/${project.slug}` : "#"}
                        className="block relative overflow-hidden bg-[var(--surface-secondary)] group/img border-b border-[var(--border-primary)]"
                      >
                        {/* Sleek Window Top Bar */}
                        <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[var(--border-primary)] bg-[var(--surface)]">
                          {/* Window Control Dots */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          </div>

                          {/* Address Bar Pill (Safari / Chrome Style) */}
                          <div className="min-w-0 flex-1 px-1 flex items-center justify-center">
                            <div className="w-full max-w-[280px] px-2.5 py-0.5 rounded-md bg-[var(--surface-secondary)] border border-[var(--border-primary)]/70 text-center">
                              <span className="text-[10px] sm:text-[11px] font-mono font-medium text-[var(--text-muted)] truncate block">
                                {project.slug ? `${project.slug}.masdika.id` : project.title}
                              </span>
                            </div>
                          </div>

                          {/* Category Badge */}
                          <span className="shrink-0 px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                            {project.category?.name || project.category || "Case Study"}
                          </span>
                        </div>

                        {/* Unobstructed 16:10 Image */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden">
                          <Image
                            referrerPolicy="no-referrer"
                            src={project.image || "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?q=80&w=800&auto=format&fit=crop"}
                            alt={project.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover object-top transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                          />
                        </div>
                      </Link>

                      {/* Card Body */}
                      <div className="p-4 sm:p-5 flex flex-col flex-1">
                        {/* Tech Stack Chips */}
                        {techList.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-3 sm:mb-3.5">
                            {techList.slice(0, 4).map((tech: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] group-hover:border-cyan-500/30 transition-colors"
                              >
                                <TechIcon tech={tech} size={12} />
                                <span>{tech}</span>
                              </span>
                            ))}
                            {techList.length > 4 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[10px] font-bold rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-muted)]">
                                +{techList.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        <Link href={project.slug ? `/portfolio/${project.slug}` : "#"} className="group/title focus:outline-none mb-1.5 sm:mb-2">
                          <h3 className="text-base sm:text-lg font-bold line-clamp-1 transition-colors text-[var(--text-primary)] group-hover/title:text-cyan-600 dark:group-hover/title:text-cyan-400 leading-snug">
                            {project.title}
                          </h3>
                        </Link>

                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-4 sm:mb-5 flex-1">
                          {project.description || "Explore full technical architecture, features, and deployment details."}
                        </p>

                        <div className="mt-auto pt-3.5 sm:pt-4 border-t border-[var(--border-primary)] flex items-center justify-between gap-2 sm:gap-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] min-w-0">
                            <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <span className="truncate">{project.client || "Personal Project"}</span>
                          </div>
                          <Link
                            href={project.slug ? `/portfolio/${project.slug}` : "#"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-950 group-hover:border-cyan-400 transition-all shrink-0"
                          >
                            <span>View Case Study</span>
                            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 7. TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="sides" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="down" className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 sm:mb-16">
            <div>
              <span className={cn("text-xs font-semibold uppercase tracking-widest mb-3 block", iconAccent)}>
                Feedback
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
                What Clients Say
              </h2>
            </div>

            {/* Interactive Carousel Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollBy({ left: -380, behavior: "smooth" });
                  }
                }}
                className="w-10 h-10 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 text-[var(--text-secondary)] hover:text-cyan-500 dark:hover:text-cyan-400 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollBy({ left: 380, behavior: "smooth" });
                  }
                }}
                className="w-10 h-10 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 text-[var(--text-secondary)] hover:text-cyan-500 dark:hover:text-cyan-400 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </FadeIn>

          <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
            <div
              ref={scrollRef}
              className={`flex gap-5 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={handleMouseUpOrLeave}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUpOrLeave}
              onMouseMove={handleMouseMove}
            >
              {[...testimonials, ...testimonials].map((testi, idx) => {
                const ratingVal = Number(testi.rating || 5).toFixed(1);
                return (
                  <div
                    key={idx}
                    className="group relative p-5 sm:p-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300 w-[84vw] sm:w-[370px] min-w-[84vw] sm:min-w-[370px] flex-shrink-0 flex flex-col justify-between"
                  >
                    {/* Top Header: Quote Icon + Verified Tag & Compact Rating Badge */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-colors", iconBoxStyle)}>
                          <Quote className={cn("w-4 h-4", iconAccent)} />
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Verified Client
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{ratingVal}</span>
                      </div>
                    </div>

                    {/* Review Body */}
                    <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] mb-6 leading-relaxed flex-1">
                      &ldquo;{testi.text}&rdquo;
                    </p>

                    {/* Client Identity Footer */}
                    <div className="flex items-center justify-between gap-3 pt-4 mt-auto border-t border-[var(--border-primary)]">
                      <div className="flex items-center gap-3 min-w-0">
                        {testi.image ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-cyan-500/30 ring-2 ring-cyan-500/10 shrink-0">
                            <img
                              referrerPolicy="no-referrer"
                              src={testi.image}
                              alt={testi.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        ) : (
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border", iconBoxStyle)}>
                            {testi.name?.[0] || "C"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                              {testi.name}
                            </p>
                            <BadgeCheck className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                          </div>
                          <p className="text-xs font-mono text-[var(--text-muted)] truncate">
                            {testi.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. LATEST BLOG POSTS ────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="right-focus" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="down" className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
                Blog
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
                Latest Insights
              </h2>
            </div>
            <Button
              variant="primary"
              size="md"
              href="/blog"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="shrink-0"
            >
              Read All
            </Button>
          </FadeIn>

          {latestPosts.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No posts yet</h3>
              <p className="text-sm text-[var(--text-muted)]">Articles will appear here once published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {latestPosts.map((post, index) => (
                <FadeIn key={post.id || index} delay={index * 0.1} direction="up" className="h-full">
                  <div className="group relative rounded-xl overflow-hidden border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 focus-within:ring-2 focus-within:ring-cyan-500 transition-colors flex flex-col h-full">
                    <Link href={`/blog/${post.slug || "#"}`} className="flex flex-col h-full focus:outline-none">
                      <div className="relative aspect-video w-full overflow-hidden shrink-0 border-b border-[var(--border-primary)]">
                        <Image
                          referrerPolicy="no-referrer"
                          src={post.image || "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?q=80&w=800&auto=format&fit=crop"}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {post.category && (
                          <div
                            className="absolute top-4 left-4 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/70 border border-white/20"
                            style={{ color: "#ffffff" }}
                          >
                            {post.category.name || post.category}
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3">
                          <span className="flex items-center gap-1.5">
                            <Calendar className={cn("w-3.5 h-3.5", iconAccent)} />
                            {post.createdAt
                              ? new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "Recently"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className={cn("w-3.5 h-3.5", iconAccent)} />
                            {post.readTime || Math.max(2, Math.ceil((post.content?.length || post.excerpt?.length || 2000) / 1000))} min read
                          </span>
                        </div>

                        <h3 className="text-base font-bold mb-3 line-clamp-2 leading-snug text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-5 flex-grow leading-relaxed">
                          {post.excerpt}
                        </p>

                        <div className={cn("flex items-center gap-2 text-sm font-semibold mt-auto", iconAccent)}>
                          Read Article
                          <ArrowRight className={cn("w-3.5 h-3.5 group-hover:translate-x-1 transition-transform", iconAccent)} />
                        </div>
                      </div>
                    </Link>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 9. CTA ──────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="cta" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn direction="up" duration={0.7} className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 p-6 sm:p-8 md:p-12 lg:p-14 xl:p-16 shadow-sm transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/40" />

            {/* Left Content */}
            <div className="max-w-xl lg:max-w-2xl text-left relative z-10">
              <div className="mb-4 inline-block">
                <Badge variant="brand" dot dotColor="bg-cyan-400" size="md" className="font-mono uppercase">
                  LET&apos;S BUILD TOGETHER
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-3 sm:mb-4 leading-[1.15] tracking-tight">
                Ready to Scale Your<br />Infrastructure?
              </h2>

              <p className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] mb-8 max-w-xl leading-relaxed">
                Elevate your digital presence with enterprise-grade cloud architectures, zero-downtime migrations, and bulletproof security.
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/contact"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Let&apos;s Talk
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  href="/services"
                  rightIcon={<ArrowRight className={cn("w-4 h-4", iconAccent)} />}
                >
                  View Pricing
                </Button>
              </div>
            </div>

            {/* Right Hero Image (Desktop: Lowered downwards so card border cleanly clips pants, showing only jacket) */}
            <div className="hidden md:block absolute right-6 lg:right-12 xl:right-16 -bottom-6 lg:-bottom-8 xl:-bottom-10 pointer-events-none select-none z-10">
              <Image
                src="/hero-card-1.webp"
                alt="Ready to Scale Infrastructure - Masdika"
                width={1145}
                height={1060}
                className="w-[280px] lg:w-[330px] xl:w-[370px] h-auto object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)]"
                priority={false}
              />
            </div>

            {/* Mobile Hero (Centered at bottom, sitting on card border with pants cleanly clipped) */}
            <div className="block md:hidden mt-6 -mb-6 sm:-mb-8 flex justify-center pointer-events-none select-none">
              <Image
                src="/hero-card-1.webp"
                alt="Ready to Scale Infrastructure - Masdika"
                width={1145}
                height={1060}
                className="w-52 sm:w-60 h-auto object-contain object-bottom translate-y-3 sm:translate-y-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)]"
                priority={false}
              />
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
