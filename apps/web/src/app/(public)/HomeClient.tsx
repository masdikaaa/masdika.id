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
import { FcGoogle } from "react-icons/fc";
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const PRODUCTS = [
  {
    icon: Code,
    title: "API Hub",
    description:
      "A centralized hub to discover, manage, and consume high-performance APIs with seamless integration and monitoring.",
    href: "/api-hub",
    type: "SaaS",
  },
  {
    icon: SiKubernetes,
    title: "Managed K3s",
    description:
      "Lightweight, production-ready Kubernetes clusters optimized for edge and IoT, fully managed for you.",
    href: "/k3s",
    type: "PaaS",
  },
  {
    icon: Terminal,
    title: "High-Performance VPS",
    description:
      "Blazing fast Virtual Private Servers with dedicated resources, SSD & HDD storage options, and root access.",
    href: "/vps",
    type: "IaaS",
  },
  {
    icon: Link2,
    title: "URL Shortener",
    description:
      "Fast, reliable, and trackable short links to optimize your marketing campaigns and share URLs gracefully.",
    href: "/shortener",
    type: "SaaS",
  },
  {
    icon: Cloud,
    title: "File CDN",
    description:
      "Global edge network to securely host, manage, and deliver your files and media globally with low latency.",
    href: "/file-cdn",
    type: "PaaS",
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
    name: "Google",
    category: "Global Ecosystem",
    description: "Global network peering, OAuth 2.0 identity, upstream DNS & cloud ecosystem.",
    icon: FcGoogle,
    iconColor: "",
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
            setPortfolioProjects(data.slice(0, 4));
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
            <div className="max-w-2xl relative z-30 order-2 lg:order-1">
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
            </div>

            {/* Right – hero image with smooth grounded bottom fade */}
            <div className="relative flex items-center justify-center mt-4 lg:mt-0 order-1 lg:order-2">
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
            </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Stats column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-4 flex flex-col gap-4"
            >
              <div className="rounded-2xl p-10 flex flex-col items-center justify-center text-center border border-[var(--border-primary)] bg-[var(--surface)]">
                <p className="text-7xl font-black text-[var(--text-primary)] mb-1">4+</p>
                <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
                  Years of<br />Experience
                </p>
              </div>

              <div className="rounded-2xl p-5 flex items-center gap-4 border border-[var(--border-primary)] bg-[var(--surface)]">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", iconBoxStyle)}>
                  <Server className={cn("w-5 h-5", iconAccent)} />
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Infrastructure</p>
                  <p className="text-sm text-[var(--text-muted)]">50+ Deployments</p>
                </div>
              </div>
            </motion.div>

            {/* Text column */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="lg:col-span-8 flex flex-col justify-center"
            >
              <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
                About Me
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-6 leading-[1.15]">
                Boost business with Modern Cloud
              </h2>
              <p className="text-base md:text-lg text-[var(--text-secondary)] mb-10 leading-relaxed max-w-2xl">
                As a dedicated DevOps and Cloud Engineer, I specialize in automating workflows, managing multi-cloud deployments, and scaling organizational infrastructure. I ensure your environments are secure, efficient, and highly available.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Layout, title: "Architecture", desc: "Designing resilient, scalable, and cost-effective cloud architectures tailored to your needs." },
                  { icon: Code, title: "Automation", desc: "Implementing robust CI/CD pipelines and infrastructure as code for rapid deployments." },
                ].map((card, i) => (
                  <div key={i} className="rounded-xl p-5 border border-[var(--border-primary)] bg-[var(--surface)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border", iconBoxStyle)}>
                        <card.icon className={cn("w-4 h-4", iconAccent)} />
                      </div>
                      <h3 className="font-bold text-[var(--text-primary)]">{card.title}</h3>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3. WORKING PROCESS ──────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="diagonal" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Workflow
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
              My Working Process
            </h2>
          </motion.div>

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
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Our Products
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Power Your Apps with<br />Cloud Platform
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Deploy, scale, and manage your applications with our high-performance cloud infrastructure and fully managed services.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {PRODUCTS.map((prod, i) => (
              <motion.div variants={item} key={i} className="h-full">
                <Link
                  href={prod.href}
                  className="block group h-full rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-colors duration-200"
                >
                  <div className="relative h-full p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-5">
                      <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center border", iconBoxStyle)}>
                        {prod.title === "Managed K3s"
                          ? <prod.icon className={cn("w-5 h-5", iconAccent)} />
                          : <prod.icon className={cn("w-5 h-5", iconAccent)} strokeWidth={1.5} />
                        }
                      </div>
                      <div className="flex items-center gap-2">
                        {prod.type && (
                          <Badge variant="neutral" size="sm">
                            {prod.type}
                          </Badge>
                        )}
                        <Badge variant="success" size="sm" dot>
                          98.99%
                        </Badge>
                      </div>
                    </div>

                    <h3 className="text-base font-bold mb-2 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {prod.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-grow mb-5">
                      {prod.description}
                    </p>

                    <div className={cn("flex items-center gap-2 mt-auto text-sm font-semibold", iconAccent)}>
                      View Details
                      <ArrowRight className={cn("w-3.5 h-3.5 group-hover:translate-x-1 transition-transform", iconAccent)} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 3.8 SUPPORT & INFRASTRUCTURE ────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="sides" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12 sm:mb-16"
          >
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Support &amp; Infrastructure
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Powered by Enterprise<br className="hidden sm:inline" /> Hardware &amp; Stack
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Built on carrier-grade routing, bare-metal server hardware, global edge protection, and battle-tested software architecture.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
          >
            {INFRASTRUCTURE_STACK.map((infra, idx) => (
              <motion.div variants={item} key={infra.name + idx} className="h-full">
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
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 4. TOOLS & TECHNOLOGIES ─────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="center-wide" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Expertise
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Tools & Technologies
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Leveraging industry-standard tools to build, deploy, and scale robust applications in high-performance cloud environments.
            </p>
          </motion.div>

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
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Solutions
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
              Premium IT Services
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Server, title: "Cloud Migration", desc: "Seamlessly move your on-premise infrastructure to AWS or GCP with zero downtime." },
              { icon: Database, title: "Database Optimization", desc: "Scale and tune your SQL and NoSQL databases for high performance and reliability." },
              { icon: Lock, title: "Security & DevSecOps", desc: "Implementing robust security policies and automated vulnerability scanning in pipelines." },
              { icon: Cloud, title: "Cloud Architecture", desc: "Designing scalable, resilient, and cost-effective cloud architectures tailored to your needs." },
              { icon: Terminal, title: "Infrastructure as Code", desc: "Automate provisioning with Terraform and Ansible for consistent, repeatable environments." },
              { icon: Activity, title: "Monitoring & Logging", desc: "Implement comprehensive observability with Prometheus, Grafana, and ELK stack." },
            ].map((srv, idx) => (
              <Link
                href="/services"
                key={idx}
                className="block group h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.1)] transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-5 border transition-all duration-300", iconBoxStyle)}>
                    <srv.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{srv.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1 mb-5">{srv.desc}</p>
                  <div className="flex items-center gap-2 text-sm font-semibold mt-auto text-zinc-500 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-all">
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. PORTFOLIO HIGHLIGHTS ─────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="right-focus" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16"
          >
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
          </motion.div>

          {portfolioProjects.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)]">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                <FolderOpen className={cn("w-6 h-6", iconAccent)} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No projects yet</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">Projects will appear here once they are added to the database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
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
                        <div className="relative aspect-[16/10] w-full overflow-hidden">
                          <Image
                            referrerPolicy="no-referrer"
                            src={project.image || "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?q=80&w=800&auto=format&fit=crop"}
                            alt={project.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover object-top transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                          />
                        </div>
                      </Link>

                      {/* Card Body */}
                      <div className="p-4 sm:p-6 lg:p-7 flex flex-col flex-1">
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
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold transition-colors text-[var(--text-primary)] group-hover/title:text-cyan-600 dark:group-hover/title:text-cyan-400 leading-snug">
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
        <div className="max-w-[1400px] mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16 px-4"
          >
            <span className={cn("text-xs font-semibold uppercase tracking-widest mb-4 block", iconAccent)}>
              Feedback
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
              What Clients Say
            </h2>
          </motion.div>

          <div className="relative w-full overflow-hidden flex">
            <div className="absolute top-0 left-0 w-16 h-full z-10 pointer-events-none bg-gradient-to-r from-[var(--background)] to-transparent" />

            <div
              ref={scrollRef}
              className={`flex gap-5 px-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={handleMouseUpOrLeave}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUpOrLeave}
              onMouseMove={handleMouseMove}
            >
              {[...testimonials, ...testimonials].map((testi, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] w-[85vw] sm:w-[400px] min-w-[85vw] sm:min-w-[400px] flex-shrink-0 flex flex-col"
                >
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < (testi.rating || 5)
                            ? "text-amber-400 fill-amber-400"
                            : "text-[var(--border-primary)] fill-transparent"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-base text-[var(--text-secondary)] mb-6 leading-relaxed flex-1">
                    &ldquo;{testi.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-5 mt-auto border-t border-[var(--border-subtle)]">
                    {testi.image ? (
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-[var(--border-primary)] shrink-0">
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
                      <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {testi.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm text-[var(--text-primary)]">{testi.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{testi.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute top-0 right-0 w-16 h-full z-10 pointer-events-none bg-gradient-to-l from-[var(--background)] to-transparent" />
          </div>
        </div>
      </section>

      {/* ── 8. LATEST BLOG POSTS ────────────────────────────────────── */}
      <section className="py-16 lg:py-24 relative z-10 overflow-hidden">
        <SectionOrnaments variant="right-focus" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
          >
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
          </motion.div>

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
                      <div className="relative h-48 w-full overflow-hidden shrink-0">
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
      <section className="py-20 lg:py-28 relative z-10 overflow-hidden">
        <SectionOrnaments variant="cta" />
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden px-6 py-14 sm:p-14 md:p-20 text-center border border-[var(--border-primary)] bg-[var(--surface)] shadow-sm"
          >
            <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/40" />
            <div className="mb-8 inline-block">
              <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                LET&apos;S BUILD TOGETHER
              </Badge>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[var(--text-primary)] mb-5 leading-[1.1]">
              Ready to Scale Your<br />Infrastructure?
            </h2>

            <p className="text-base md:text-lg text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
              Elevate your digital presence with enterprise-grade cloud architectures, zero-downtime migrations, and bulletproof security.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Let's Talk
              </Button>

              <Button
                variant="secondary"
                size="lg"
                href="/services"
                rightIcon={<ArrowRight className={cn("w-4 h-4", iconAccent)} />}
                className="w-full sm:w-auto"
              >
                View Pricing
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
