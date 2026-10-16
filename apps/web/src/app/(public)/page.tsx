"use client";

import ReactDOM from "react-dom";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Layout, Code, Server, CheckCircle, Database, Lock, Cloud, Terminal, Activity, Monitor, Shield, ChevronLeft, ChevronRight, MessageSquare, Star, FolderOpen, FileText, Calendar, Clock, HardDrive, Link2 } from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const TypeAnimation = dynamic(
  () => import("react-type-animation").then((mod) => mod.TypeAnimation),
  { ssr: false }
);
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { TechStackMarquee } from "@/components/ui/TechStackMarquee";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { useTheme } from "@/components/ThemeProvider";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
} as const;

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

const PRODUCTS = [
  {
    icon: Code,
    title: "API Hub",
    percentage: 99,
    description: "A centralized hub to discover, manage, and consume high-performance APIs with seamless integration and monitoring.",
    color: "from-cyan-500 to-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20",
    iconColor: "text-cyan-400",
    href: "/api-hub",
    type: "SaaS"
  },

  {
    icon: SiKubernetes,
    title: "Managed K3s",
    percentage: 99,
    description: "Lightweight, production-ready Kubernetes clusters optimized for edge and IoT, fully managed for you.",
    color: "from-cyan-500 to-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20",
    iconColor: "text-cyan-400",
    href: "/k3s",
    type: "PaaS"
  },
  {
    icon: Terminal,
    title: "High-Performance VPS",
    percentage: 99,
    description: "Blazing fast Virtual Private Servers with dedicated resources, SSD & HDD storage options, and root access for ultimate control.",
    color: "from-cyan-500 to-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20",
    iconColor: "text-cyan-400",
    href: "/vps",
    type: "IaaS"
  },
  {
    icon: Link2,
    title: "URL Shortener",
    percentage: 99,
    description: "Fast, reliable, and trackable short links to optimize your marketing campaigns and share URLs gracefully.",
    color: "from-cyan-500 to-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20",
    iconColor: "text-cyan-400",
    href: "/shortener",
    type: "SaaS"
  },
  {
    icon: Cloud,
    title: "File CDN",
    percentage: 99,
    description: "Global edge network to securely host, manage, and deliver your files and media globally with low latency.",
    color: "from-cyan-500 to-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20",
    iconColor: "text-cyan-400",
    href: "/file-cdn",
    type: "PaaS"
  }
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
  }
];

export default function HomePage() {
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);

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
    fetch('/api/portfolio')
      .then(res => res.json())
      .then(data => {
        if (!data.error && Array.isArray(data)) {
          setPortfolioProjects(data.slice(0, 4)); // Get 4 projects
        }
      })
      .catch(err => console.error("Error fetching portfolio:", err));

    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSettings(data);
      })
      .catch(err => console.error("Error fetching settings:", err));

    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        if (!data.error && Array.isArray(data)) {
          setLatestPosts(data.slice(0, 3));
        }
      })
      .catch(err => console.error("Error fetching posts:", err));

    fetch('/api/testimonials')
      .then(res => res.json())
      .then(data => {
        if (!data.error && Array.isArray(data) && data.length > 0) {
          setTestimonials(data);
        } else {
          setTestimonials(DEFAULT_TESTIMONIALS);
        }
      })
      .catch(err => {
        console.error("Error fetching testimonials:", err);
        setTestimonials(DEFAULT_TESTIMONIALS);
      });
  }, []);

  // Auto-scroll logic for Testimonials
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let animationId: number;
    let accumulatedScroll = 0;
    const scrollSpeed = 0.6;
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

  ReactDOM.preload('/masdika.png', { as: 'image', fetchPriority: 'high' });

  const typingSequence = useMemo(() => {
    const rawText = settings?.hero_typing_text || "Cloud Engineer, DevOps Expert, SysAdmin Pro, Backend Dev";
    const parts = rawText.split(',').map((s: string) => s.trim()).filter(Boolean);
    const seq: any[] = [];
    parts.forEach((part: string) => {
      seq.push(part);
      seq.push(2500);
    });
    if (seq.length === 0) {
      seq.push("DevOps Engineer", 2500, "Cloud Engineer", 2500, "SysAdmin Pro", 2500, "Backend Dev", 2500);
    }
    return seq;
  }, [settings?.hero_typing_text]);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 overflow-x-hidden bg-transparent">

      {/* 1. HERO SECTION */}
      <section className="relative pt-10 pb-16 lg:pb-24 flex items-center">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl relative z-30"
            >
              <div className={cn("inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6", isDark ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border border-cyan-200 text-cyan-700 shadow-sm")}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isDark ? "bg-cyan-400" : "bg-cyan-500")}></span>
                  <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isDark ? "bg-cyan-500" : "bg-cyan-600")}></span>
                </span>
                Available for New Projects
              </div>

              <div className="mb-6">
                <h1 className="text-5xl md:text-6xl lg:text-[76px] font-black tracking-tight text-white leading-[1.1] mb-2">
                  {settings?.hero_title || "Hi, I'm Masdika,"}
                </h1>
                <div className="min-h-[50px] sm:min-h-[60px] md:min-h-[90px] relative flex items-center">
                  <TypeAnimation
                    key={typingSequence.join(',')}
                    sequence={typingSequence}
                    wrapper="span"
                    speed={50}
                    repeat={Infinity}
                    className={cn(
                      "bg-gradient-to-r bg-clip-text text-transparent font-black text-3xl sm:text-5xl md:text-[68px] tracking-tight leading-tight pb-2 block drop-shadow-sm",
                      isDark ? "from-cyan-400 via-cyan-500 to-cyan-400" : "from-cyan-600 via-cyan-500 to-cyan-600"
                    )}
                  />
                </div>
              </div>

              <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-xl leading-relaxed font-medium">
                {settings?.hero_description || "Specializing in highly available cloud infrastructure, CI/CD automation, and scalable backend services. I build robust systems that power modern digital businesses."}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <MagneticButton intensity={20}>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all gap-2 w-full sm:w-auto"
                  >
                    Start a Project
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </MagneticButton>

                <MagneticButton intensity={15}>
                  <Link
                    href="/resume"
                    className="relative inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-transparent border border-white/10 text-white font-bold hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all transform-gpu duration-300 gap-3 group backdrop-blur-md transform hover:-translate-y-1"
                  >
                    <FileText className="relative z-10 w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                    <span className="relative z-10 tracking-wide">View Resume</span>
                  </Link>
                </MagneticButton>
              </div>
            </motion.div>

            {/* Right Content - Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative lg:py-0 flex items-center justify-center pointer-events-none mt-10 lg:mt-0"
            >
              {/* Animated Outline Text Background */}
              <div
                className="absolute top-[40%] left-0 -translate-y-1/2 w-[150%] overflow-hidden z-0 flex"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 100%)'
                }}
              >
                <div className="flex whitespace-nowrap animate-marquee-half">
                  <h2 className="text-[100px] md:text-[140px] font-black leading-none opacity-80 select-none px-4" style={{ WebkitTextStroke: '2px rgba(6, 182, 212, 0.6)', color: 'rgba(6, 182, 212, 0.05)' }}>
                    MASDIKA • CLOUD • DEVOPS • SYSTEMS •
                  </h2>
                </div>
              </div>

              {/* Foreground Image & Floating Badges */}
              <div className="relative z-10 w-full max-w-[340px] h-[420px] sm:max-w-[400px] sm:h-[480px] lg:max-w-[500px] lg:h-[620px] xl:max-w-[560px] xl:h-[680px] mx-auto flex items-end justify-center pointer-events-auto">
                <Image
                  referrerPolicy="no-referrer"
                  src="/masdika.png"
                  alt="Masdika - Cloud Engineer"
                  width={583}
                  height={875}
                  priority={true}
                  fetchPriority="high"
                  unoptimized={true}
                  className="w-full h-full object-contain object-bottom relative z-20 origin-bottom filter drop-shadow-2xl"
                />

                {/* 1. AWS Certified Badge (Top Left - placed high up clear above pointing hand) */}
                <div
                  className={cn(
                    "absolute top-[12%] sm:top-[14%] lg:top-[16%] -left-3 sm:-left-8 lg:-left-16 xl:-left-24 backdrop-blur-md p-2.5 sm:p-3.5 xl:p-4 rounded-2xl flex items-center gap-2.5 sm:gap-3 z-30 animate-float transform-gpu",
                    isDark
                      ? "bg-slate-900/85 border border-cyan-500/25 shadow-[0_8px_30px_rgba(6,182,212,0.18)]"
                      : "bg-white/95 border border-slate-200/80 shadow-xl"
                  )}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className={cn("text-[8px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>
                      AWS Certified
                    </div>
                    <div className={cn("font-black text-[11px] sm:text-sm whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                      Cloud Expert
                    </div>
                  </div>
                </div>

                {/* 2. CI/CD Pipeline Badge (Bottom Left - placed low down clear below pointing hand/arm) */}
                <div
                  className={cn(
                    "absolute bottom-[10%] sm:bottom-[12%] lg:bottom-[14%] -left-3 sm:-left-8 lg:-left-16 xl:-left-24 backdrop-blur-md p-2.5 sm:p-3.5 xl:p-4 rounded-2xl flex items-center gap-2.5 sm:gap-3 z-30 animate-float-delayed transform-gpu",
                    isDark
                      ? "bg-slate-900/85 border border-cyan-500/25 shadow-[0_8px_30px_rgba(6,182,212,0.18)]"
                      : "bg-white/95 border border-slate-200/80 shadow-xl"
                  )}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className={cn("text-[8px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>
                      CI/CD Pipeline
                    </div>
                    <div className={cn("font-black text-[11px] sm:text-sm whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                      Automation
                    </div>
                  </div>
                </div>

                {/* 3. High Availability DB Badge (Top Right - placed clear to the right of head/shoulder) */}
                <div
                  className={cn(
                    "absolute top-[12%] sm:top-[14%] lg:top-[16%] -right-3 sm:-right-8 lg:-right-16 xl:-right-24 backdrop-blur-md p-2.5 sm:p-3.5 xl:p-4 rounded-2xl flex items-center gap-2.5 sm:gap-3 z-30 animate-float-reverse-delayed transform-gpu",
                    isDark
                      ? "bg-slate-900/85 border border-cyan-500/25 shadow-[0_8px_30px_rgba(6,182,212,0.18)]"
                      : "bg-white/95 border border-slate-200/80 shadow-xl"
                  )}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className={cn("text-[8px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>
                      High Availability
                    </div>
                    <div className={cn("font-black text-[11px] sm:text-sm whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                      DB Architect
                    </div>
                  </div>
                </div>

                {/* 4. Kubernetes Mastery Badge (Bottom Right - placed clear to the right of tablet) */}
                <div
                  className={cn(
                    "absolute bottom-[20%] sm:bottom-[22%] lg:bottom-[24%] -right-3 sm:-right-8 lg:-right-16 xl:-right-24 backdrop-blur-md p-2.5 sm:p-3.5 xl:p-4 rounded-2xl flex items-center gap-2.5 sm:gap-3 z-30 animate-float-reverse transform-gpu",
                    isDark
                      ? "bg-slate-900/85 border border-cyan-500/25 shadow-[0_8px_30px_rgba(6,182,212,0.18)]"
                      : "bg-white/95 border border-slate-200/80 shadow-xl"
                  )}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <SiKubernetes className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className={cn("text-[8px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Kubernetes
                    </div>
                    <div className={cn("font-black text-[11px] sm:text-sm whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                      Mastery
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 1.5 SLANTED MARQUEE BANNER */}
      <section className={cn(
        "relative z-30 py-6 backdrop-blur-md -rotate-2 transform origin-left w-[110%] -ml-[5%] overflow-hidden",
        isDark ? "bg-gradient-to-r from-cyan-950/50 via-slate-900/50 to-cyan-950/50 border-y border-cyan-500/10" : "bg-gradient-to-r from-cyan-50/90 via-cyan-100/80 to-cyan-50/90 border-y border-cyan-200 shadow-sm"
      )}>
        <div className="flex whitespace-nowrap overflow-hidden">
          <div className="flex items-center animate-marquee-half" style={{ animationDuration: '35s' }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className={cn("flex items-center font-black text-xl lg:text-2xl tracking-[0.2em] px-8", isDark ? "text-zinc-300" : "text-slate-800")}>
                <span className={cn("mr-3", isDark ? "text-cyan-400" : "text-cyan-600")}>★</span> CLOUD ARCHITECTURE
                <span className={cn("mx-8", isDark ? "text-cyan-500/40" : "text-cyan-600/40")}>{"//"}</span> DEVOPS
                <span className={cn("mx-8", isDark ? "text-cyan-500/40" : "text-cyan-600/40")}>{"//"}</span> SYSADMIN
                <span className={cn("mx-8", isDark ? "text-cyan-500/40" : "text-cyan-600/40")}>{"//"}</span> KUBERNETES
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. ABOUT ME SECTION */}
      <section className="py-10 lg:py-16 relative z-20 w-full overflow-hidden">
        <div className={cn("absolute inset-0", isDark ? "bg-gradient-to-b from-[#050B14] via-[#09152a]/50 to-[#050B14]" : "bg-transparent")} />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Column - Stats */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 flex flex-col gap-6"
            >
              <div className={cn(
                "backdrop-blur-md rounded-3xl p-12 flex flex-col items-center justify-center text-center relative overflow-hidden group transition-colors shadow-2xl",
                isDark ? "bg-gradient-to-br from-[#0e172a] to-[#0a1324] border border-slate-700/80 ring-1 ring-white/5 hover:border-cyan-500/50 shadow-black/40" : "bg-white border border-black/5 hover:border-cyan-500/30"
              )}>
                <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <h2 className={cn(
                  "text-7xl font-black bg-gradient-to-r bg-clip-text text-transparent mb-2 relative z-10 drop-shadow-sm",
                  isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400"
                )}>4+</h2>
                <p className="text-xl font-bold text-zinc-300 relative z-10 tracking-wide uppercase">Years Of<br />Experience</p>
              </div>

              <div className={cn(
                "backdrop-blur-md rounded-3xl p-6 flex items-center gap-6 transition-colors shadow-xl",
                isDark ? "bg-[#0d1629] border border-slate-700/80 ring-1 ring-white/5 hover:border-cyan-500/50 shadow-black/40" : "bg-white border border-black/5 hover:border-cyan-500/30"
              )}>
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <Server className={cn("w-7 h-7", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <div>
                  <h3 className={cn("text-lg font-black mb-1", isDark ? "text-white" : "text-slate-900")}>Infrastructure</h3>
                  <p className={cn("text-sm font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>50+ Deployments</p>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Text */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              <span className={cn(
                "font-black tracking-[0.2em] text-xs mb-4 block uppercase px-3 py-1.5 rounded-lg w-fit",
                isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border border-cyan-200"
              )}>About Me</span>
              <h2 className={cn("text-4xl md:text-5xl font-black mb-6 leading-[1.2]", isDark ? "text-white" : "text-slate-900")}>
                Boost Business with <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Modern Cloud</span>
              </h2>
              <p className={cn("text-lg mb-10 leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                As a dedicated DevOps and Cloud Engineer, I specialize in automating workflows, managing multi-cloud deployments, and scaling organizational infrastructure. I ensure your environments are secure, efficient, and highly available.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className={cn(
                  "backdrop-blur-md rounded-3xl p-6 transition-colors shadow-xl",
                  isDark ? "bg-[#0d1629] border border-slate-700/80 ring-1 ring-white/5 hover:bg-[#111f38] hover:border-cyan-500/50 shadow-black/40" : "bg-white border border-black/5 shadow-lg hover:border-cyan-500/30"
                )}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                      <Layout className="w-5 h-5" />
                    </div>
                    <h3 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Architecture</h3>
                  </div>
                  <p className={cn("text-sm leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>Designing resilient, scalable, and cost-effective cloud architectures tailored to your needs.</p>
                </div>

                <div className={cn(
                  "backdrop-blur-md rounded-3xl p-6 transition-colors shadow-xl",
                  isDark ? "bg-[#0d1629] border border-slate-700/80 ring-1 ring-white/5 hover:bg-[#111f38] hover:border-cyan-500/50 shadow-black/40" : "bg-white border border-black/5 shadow-lg hover:border-cyan-500/30"
                )}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                      <Code className="w-5 h-5" />
                    </div>
                    <h3 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Automation</h3>
                  </div>
                  <p className={cn("text-sm leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>Implementing robust CI/CD pipelines and infrastructure as code for rapid deployments.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. WORKING PROCESS SECTION */}
      <section className="py-10 lg:py-16 relative z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <span className={cn(
              "font-black tracking-[0.2em] text-xs mb-4 block uppercase px-3 py-1.5 rounded-lg w-fit mx-auto",
              isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border border-cyan-200"
            )}>Workflow</span>
            <h2 className={cn("text-4xl md:text-5xl font-black mb-6 leading-tight", isDark ? "text-white" : "text-slate-900")}>
              My <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Working Process</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-14 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 z-0" />

            {[
              { title: "Consultation", desc: "Understanding your business needs and current infrastructure.", icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30" },
              { title: "Architecture", desc: "Designing a highly scalable, secure, and resilient cloud solution.", icon: Layout, color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30" },
              { title: "Implementation", desc: "Building the infrastructure as code using modern tools.", icon: Code, color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30" },
              { title: "Optimization", desc: "Continuous monitoring, scaling, and cost optimization.", icon: CheckCircle, color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30" }
            ].map((step, idx) => (
              <FadeIn key={idx} delay={idx * 0.1} direction="up" className="relative z-10 flex flex-col items-center text-center group">
                <TiltCard intensity={15} className={cn(
                  "w-28 h-28 rounded-3xl backdrop-blur-sm border-2 flex items-center justify-center mb-8 relative group-hover:-translate-y-2 transition-colors transform-gpu duration-300 shadow-xl",
                  isDark ? `${step.bg} ${step.border}` : "bg-white border-cyan-100 shadow-cyan-500/5 hover:border-cyan-300 hover:shadow-cyan-500/10"
                )}>
                  <div className={cn(
                    "absolute -top-4 -right-4 w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm shadow-lg",
                    isDark ? "bg-[#050B14] border-white/10 text-white" : "bg-cyan-50 border-cyan-200 text-cyan-800 shadow-cyan-500/20"
                  )}>
                    0{idx + 1}
                  </div>
                  <step.icon className={cn("w-10 h-10", isDark ? step.color : "text-cyan-600")} />
                </TiltCard>
                <h3 className={cn("text-xl font-bold mb-3", isDark ? "text-white" : "text-slate-900")}>{step.title}</h3>
                <p className={cn("text-sm leading-relaxed font-medium max-w-[250px]", isDark ? "text-zinc-400" : "text-slate-600")}>{step.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 3.5. PRODUCTS & SERVICES SECTION */}
      <section className="py-16 lg:py-24 relative z-20">
        <div className={cn("absolute inset-0", isDark ? "bg-gradient-to-b from-transparent via-cyan-950/20 to-transparent" : "bg-transparent")} />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className={cn(
              "font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full",
              isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]" : "text-cyan-700 bg-cyan-50 border border-cyan-200 shadow-sm"
            )}>
              Our Products
            </span>
            <h2 className={cn("text-4xl md:text-5xl font-black mb-6 leading-tight", isDark ? "text-white" : "text-slate-900")}>
              Power Your Apps with <br className="hidden sm:block" />
              <span className={cn("bg-gradient-to-r bg-clip-text text-transparent drop-shadow-sm", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Cloud Platform</span>
            </h2>
            <p className={cn("text-lg md:text-xl leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
              Deploy, scale, and manage your applications effortlessly with our high-performance cloud infrastructure and fully managed services. We provide comprehensive IaaS, PaaS, and SaaS solutions.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 relative z-10"
          >
            {PRODUCTS.map((prod, i) => (
              <motion.div variants={item} key={i} className="h-full">
                <Link href={prod.href} className="block group h-full">
                  <TiltCard intensity={10} className={cn(
                    "relative h-full backdrop-blur-xl rounded-2xl p-8 flex flex-col border-2 overflow-hidden transition-all duration-500 hover:-translate-y-2 group",
                    isDark
                      ? "border-cyan-500/20 bg-gradient-to-br from-slate-900/95 via-cyan-950/30 to-slate-900/95 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)]"
                      : "border-black/5 bg-white shadow-xl hover:border-cyan-500/30 hover:shadow-2xl"
                  )}>


                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:-translate-y-1",
                        isDark ? "bg-cyan-500/15 border-cyan-500/30 group-hover:bg-cyan-500/25 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]" : "bg-cyan-50 border-cyan-200 group-hover:bg-cyan-100 group-hover:border-cyan-300 group-hover:shadow-md"
                      )}>
                        {prod.title === "Managed K3s" ? (
                          <prod.icon className={cn("w-7 h-7 transition-colors", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-700")} />
                        ) : (
                          <prod.icon className={cn("w-7 h-7 transition-colors", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-700")} strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 justify-end shrink-0">
                        {prod.type && (
                          <div className={cn(
                            "px-3 py-1.5 rounded-full border flex items-center transition-all",
                            isDark ? "bg-cyan-950/60 border-cyan-500/20 group-hover:border-cyan-400/40 group-hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 group-hover:border-cyan-300 group-hover:bg-cyan-100"
                          )}>
                            <span className={cn(
                              "text-[10px] font-black tracking-widest uppercase transition-colors",
                              isDark ? "text-cyan-300/80 group-hover:text-cyan-200" : "text-cyan-700 group-hover:text-cyan-800"
                            )}>{prod.type}</span>
                          </div>
                        )}
                        <div className={cn(
                          "px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all",
                          isDark ? "bg-cyan-950/60 border-cyan-500/20 group-hover:border-cyan-400/40 group-hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 group-hover:border-cyan-300 group-hover:bg-cyan-100"
                        )}>
                          <span className="relative flex h-2 w-2">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isDark ? "bg-cyan-400" : "bg-cyan-500")}></span>
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", isDark ? "bg-cyan-400" : "bg-cyan-500")}></span>
                          </span>
                          <span className={cn(
                            "text-[10px] font-black tracking-widest uppercase transition-colors",
                            isDark ? "text-cyan-300/80 group-hover:text-cyan-200" : "text-cyan-700 group-hover:text-cyan-800"
                          )}>98.99% SLA</span>
                        </div>
                      </div>
                    </div>

                    <h3 className={cn(
                      "text-2xl font-black transition-colors leading-tight mb-3 relative z-10",
                      isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"
                    )}>
                      {prod.title}
                    </h3>

                    <p className={cn(
                      "leading-relaxed font-medium text-sm flex-grow mb-6 relative z-10",
                      isDark ? "text-zinc-300/70" : "text-slate-600"
                    )}>
                      {prod.description}
                    </p>

                    <div className="flex items-center gap-3 mt-auto relative z-10">
                      <div className={cn(
                        "w-9 h-9 rounded-xl border flex items-center justify-center transition-all",
                        isDark ? "bg-cyan-500/15 border-cyan-500/30 group-hover:bg-cyan-500/25 group-hover:border-cyan-400/50" : "bg-cyan-50 border-cyan-200 group-hover:bg-cyan-100 group-hover:border-cyan-300"
                      )}>
                        <ArrowRight className={cn("w-4 h-4 transform group-hover:translate-x-0.5 transition-transform", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      </div>
                      <span className={cn(
                        "font-bold text-sm transition-colors",
                        isDark ? "text-cyan-400/80 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-700"
                      )}>View Details</span>
                    </div>
                  </TiltCard>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. MY EXPERTS AREAS SECTION */}
      <section className="py-10 lg:py-16 relative z-20 overflow-hidden">
        <div className={cn("absolute inset-0", isDark ? "bg-white/[0.02]" : "bg-black/[0.01]")} />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <span className={cn(
                "font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-3 py-1.5 rounded-lg",
                isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border border-cyan-200"
              )}>
                Expertise
              </span>
              <h2 className={cn("text-4xl md:text-5xl font-black mb-6 leading-[1.2]", isDark ? "text-white" : "text-slate-900")}>
                Tools & <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Technologies</span>
              </h2>
              <p className={cn("text-lg leading-relaxed font-medium mb-10", isDark ? "text-zinc-400" : "text-slate-600")}>
                Leveraging industry-standard tools to build, deploy, and scale robust applications. My technology stack is focused on high-performance cloud environments.
              </p>
            </motion.div>

            <TechStackMarquee />

            <div className="flex justify-center mt-12 relative z-20">
              <Link href="/skills" className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all gap-2 w-fit shrink-0">
                Explore All Skills <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SERVICES SECTION */}
      <section className="py-10 lg:py-16 relative z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <span className={cn(
              "font-black tracking-[0.2em] text-xs mb-4 block uppercase px-3 py-1.5 rounded-lg w-fit mx-auto",
              isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border border-cyan-200"
            )}>Solutions</span>
            <h2 className={cn("text-4xl md:text-5xl font-black mb-6 leading-tight", isDark ? "text-white" : "text-slate-900")}>
              Premium <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>IT Services</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: Server, title: "Cloud Migration", desc: "Seamlessly move your on-premise infrastructure to AWS or GCP with zero downtime.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { icon: Database, title: "Database Optimization", desc: "Scale and tune your SQL and NoSQL databases for high performance and reliability.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { icon: Lock, title: "Security & DevSecOps", desc: "Implementing robust security policies and automated vulnerability scanning in pipelines.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { icon: Cloud, title: "Cloud Architecture", desc: "Designing scalable, resilient, and cost-effective cloud architectures tailored to your needs.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { icon: Terminal, title: "Infrastructure as Code", desc: "Automate provisioning with Terraform and Ansible for consistent, repeatable environments.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { icon: Activity, title: "Monitoring & Logging", desc: "Implement comprehensive observability with Prometheus, Grafana, and ELK stack.", color: "text-cyan-400", bg: "bg-cyan-500/10" }
            ].map((srv, idx) => (
              <Link href="/services" key={idx} className="block h-full group">
                <TiltCard intensity={5} className={cn(
                  "backdrop-blur-md p-8 md:p-10 rounded-3xl border transition-colors duration-300 transform-gpu h-full flex flex-col shadow-xl",
                  isDark ? "bg-[#0d1629] border-slate-700/80 group-hover:bg-[#111f38] group-hover:border-cyan-500/50 shadow-black/40 ring-1 ring-white/5" : "bg-white border-black/5 group-hover:bg-slate-50 group-hover:border-cyan-500/30"
                )}>
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110", isDark ? srv.bg : "bg-cyan-50 border border-cyan-100")}>
                    <srv.icon className={cn("w-8 h-8", isDark ? srv.color : "text-cyan-600")} />
                  </div>
                  <h3 className={cn("text-2xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>{srv.title}</h3>
                  <p className={cn("font-medium leading-relaxed mb-8 flex-1", isDark ? "text-zinc-400" : "text-slate-600")}>{srv.desc}</p>
                  <div className={cn(
                    "font-bold flex items-center gap-2 group-hover:gap-4 transition-all mt-auto text-sm uppercase tracking-wider",
                    isDark ? "text-white" : "text-cyan-600"
                  )}>
                    Learn More <ArrowRight className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                </TiltCard>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. PORTFOLIO HIGHLIGHT SECTION */}
      <section className={cn("py-10 lg:py-16 relative z-20", isDark ? "bg-[#09152a]/30" : "bg-slate-50/50")}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
          >
            <div>
              <span className={cn(
                "font-black tracking-[0.2em] text-xs mb-4 block uppercase px-3 py-1.5 rounded-lg w-fit",
                isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border border-cyan-200"
              )}>Projects</span>
              <h2 className={cn("text-4xl md:text-5xl font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>
                Featured <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Work</span>
              </h2>
            </div>
            <MagneticButton intensity={20}>
              <Link href="/portfolio" className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all gap-2 w-fit shrink-0">
                View All <ArrowRight className="w-5 h-5" />
              </Link>
            </MagneticButton>
          </motion.div>

          {portfolioProjects.length === 0 ? (
            <div className={cn(
              "text-center py-20 px-6 sm:px-8 rounded-3xl border backdrop-blur-sm shadow-xl",
              isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5" : "bg-white border-slate-200"
            )}>
              <div className={cn(
                "w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 border",
                isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200 shadow-sm"
              )}>
                <FolderOpen className={cn("w-10 h-10", isDark ? "text-zinc-500" : "text-slate-400")} />
              </div>
              <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No projects yet</h3>
              <p className={cn("max-w-sm mx-auto font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>Projects will appear here once they are added to the database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {portfolioProjects.map((project, index) => (
                <FadeIn key={project.id} delay={index * 0.1} direction="up" className="h-full">
                  <TiltCard intensity={8} className={cn(
                    "group relative rounded-3xl overflow-hidden border hover:border-cyan-500/50 transition-colors transform-gpu shadow-2xl h-[350px] sm:h-[400px] md:h-[450px]",
                    isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5" : "bg-white border-black/5"
                  )}>
                    <Link href={project.slug ? `/portfolio/${project.slug}` : "#"} className="block w-full h-full relative">
                      <Image referrerPolicy="no-referrer" src={project.image || "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?q=80&w=800&auto=format&fit=crop"}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized={true}
                        className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                      />
                      <div className={cn(
                        "absolute inset-0 opacity-90 group-hover:opacity-80 transition-opacity",
                        isDark ? "bg-gradient-to-t from-[#050B14] via-[#050B14]/60 to-transparent" : "bg-gradient-to-t from-[#050B14]/90 via-[#050B14]/50 to-transparent"
                      )} />

                      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end h-full">
                        <span className="font-black tracking-widest text-xs uppercase mb-3 block transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 px-3 py-1 rounded-lg w-fit backdrop-blur-md text-cyan-400 bg-cyan-500/20 border border-cyan-500/20">
                          {project.category?.name || project.category || "Uncategorized"}
                        </span>
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75 mb-4 leading-tight text-[#ffffff] drop-shadow-md">
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-150 text-[#ffffff]">
                          View Case Study <ArrowRight className="w-4 h-4 text-cyan-400" />
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. TESTIMONIALS SECTION */}
      <section className="py-10 lg:py-16 relative z-20 overflow-hidden">
        <div className="max-w-[1400px] mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16 px-4"
          >
            <span className={cn(
              "font-black tracking-[0.2em] text-xs mb-4 block uppercase px-3 py-1.5 rounded-lg w-fit mx-auto",
              isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border border-cyan-200"
            )}>Feedback</span>
            <h2 className={cn("text-4xl md:text-5xl font-black mb-6 leading-tight", isDark ? "text-white" : "text-slate-900")}>
              What Clients <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Say</span>
            </h2>
          </motion.div>

          <div className="relative w-full overflow-hidden flex">
            {/* Left fade gradient */}
            <div className={cn("absolute top-0 left-0 w-12 md:w-24 h-full z-10 pointer-events-none", isDark ? "bg-gradient-to-r from-[#050B14] to-transparent" : "bg-gradient-to-r from-white to-transparent")} />

            <div
              ref={scrollRef}
              className={`flex gap-6 md:gap-8 px-6 md:px-10 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
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
                  className={cn(
                    "p-8 md:p-10 rounded-3xl border relative w-[85vw] sm:w-[450px] min-w-[85vw] sm:min-w-[450px] flex-shrink-0 transition-all duration-300 flex flex-col shadow-2xl",
                    isDark 
                      ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 hover:border-cyan-500/50 hover:bg-[#111f38] shadow-black/50" 
                      : "bg-white border-slate-200 hover:border-cyan-500/30 hover:bg-slate-50/50 shadow-lg hover:shadow-xl"
                  )}
                >
                  <div className="flex gap-1.5 mb-8">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-5 h-5",
                          i < (testi.rating || 5)
                            ? (isDark ? "text-cyan-400 fill-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]" : "text-cyan-600 fill-cyan-600")
                            : (isDark ? "text-white/10 fill-transparent" : "text-slate-200 fill-transparent")
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn("text-lg md:text-xl font-medium mb-10 leading-relaxed flex-1", isDark ? "text-zinc-300" : "text-slate-700")}>"{testi.text}"</p>
                  <div className={cn("flex items-center gap-4 pt-6 mt-auto border-t", isDark ? "border-white/10" : "border-slate-200")}>
                    {testi.image ? (
                      <div className={cn("w-14 h-14 rounded-full overflow-hidden border flex-shrink-0 shadow-inner", isDark ? "border-white/10 bg-[#050B14]" : "border-slate-200 bg-slate-100")}>
                        <img referrerPolicy="no-referrer" src={testi.image} alt={testi.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0">
                        {testi.name[0]}
                      </div>
                    )}
                    <div>
                      <p className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-900")}>{testi.name}</p>
                      <p className={cn("font-medium text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>{testi.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Right fade gradient */}
            <div className={cn("absolute top-0 right-0 w-12 md:w-24 h-full z-10 pointer-events-none", isDark ? "bg-gradient-to-l from-[#050B14] to-transparent" : "bg-gradient-to-l from-white to-transparent")} />
          </div>
        </div>
      </section>

      {/* 8. LATEST BLOG POSTS SECTION */}
      <section className={cn("py-10 lg:py-16 relative z-20", isDark ? "bg-[#050B14]" : "bg-transparent")}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
          >
            <div>
              <span className={cn(
                "font-black tracking-[0.2em] text-xs mb-4 block uppercase px-3 py-1.5 rounded-lg w-fit",
                isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border border-cyan-200"
              )}>Blog</span>
              <h2 className={cn("text-4xl md:text-5xl font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>
                Latest <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Insights</span>
              </h2>
            </div>
            <MagneticButton intensity={20}>
              <Link href="/blog" className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all gap-2 w-fit shrink-0">
                Read All <ArrowRight className="w-5 h-5" />
              </Link>
            </MagneticButton>
          </motion.div>

          {latestPosts.length === 0 ? (
            <div className={cn(
              "text-center py-20 px-6 sm:px-8 rounded-3xl border backdrop-blur-sm shadow-xl",
              isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5" : "bg-white border-slate-200"
            )}>
              <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No posts yet</h3>
              <p className={cn("max-w-sm mx-auto font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>Articles will appear here once published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {latestPosts.map((post, index) => (
                <FadeIn key={post.id || index} delay={index * 0.1} direction="up" className="h-full">
                  <TiltCard intensity={8} className={cn(
                    "group relative rounded-[2rem] overflow-hidden border hover:border-cyan-500/50 transition-colors transform-gpu flex flex-col h-full shadow-2xl",
                    isDark ? "border-slate-700/80 bg-[#0d1629] ring-1 ring-white/5 shadow-black/40" : "border-black/5 bg-white"
                  )}>
                    <Link href={`/blog/${post.slug || '#'}`} className="flex flex-col h-full w-full">
                      <div className="relative h-56 sm:h-64 w-full overflow-hidden shrink-0">
                        <Image referrerPolicy="no-referrer" src={post.image || "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?q=80&w=800&auto=format&fit=crop"}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized={true}
                          className="object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                        {post.category && (
                          <div className={cn(
                            "absolute top-5 left-5 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl z-20 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30 transition-colors",
                            isDark ? "bg-[#0b1120]/70 border-white/10 text-cyan-400 group-hover:text-cyan-300" : "bg-white/90 border-cyan-200 text-cyan-700 group-hover:text-cyan-800 group-hover:bg-cyan-50"
                          )}>
                            {post.category.name || post.category}
                          </div>
                        )}
                        {/* Smooth gradient blending into the card body */}
                        <div className={cn(
                          "absolute inset-x-0 bottom-0 h-32 z-10",
                          isDark ? "bg-gradient-to-t from-[#0d1629] via-[#0d1629]/80 to-transparent" : "bg-gradient-to-t from-white via-white/20 to-transparent"
                        )} />

                        {/* Hover glow effect */}
                        <div className="absolute inset-0 bg-cyan-500/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                      </div>

                      <div className="p-8 pt-6 flex flex-col flex-grow relative z-20">
                        {/* Meta info: Date & Read Time */}
                        <div className={cn("flex items-center gap-4 text-xs font-bold uppercase tracking-wider mb-4", isDark ? "text-zinc-500" : "text-slate-500")}>
                          <div className="flex items-center gap-1.5">
                            <Calendar className={cn("w-3.5 h-3.5", isDark ? "text-cyan-500" : "text-cyan-600")} />
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className={cn("w-3.5 h-3.5", isDark ? "text-cyan-500" : "text-cyan-600")} />
                            {post.readTime || Math.max(2, Math.ceil((post.content?.length || post.excerpt?.length || 2000) / 1000))} Min Read
                          </div>
                        </div>

                        <h3 className={cn(
                          "text-xl lg:text-2xl font-black mb-4 transition-colors line-clamp-2 leading-tight",
                          isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"
                        )}>
                          {post.title}
                        </h3>
                        <p className={cn("text-sm font-medium line-clamp-3 mb-8 flex-grow leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                          {post.excerpt}
                        </p>

                        <div className={cn(
                          "flex items-center font-bold uppercase tracking-wider text-xs gap-3 mt-auto group-hover:text-cyan-400 transition-colors",
                          isDark ? "text-white" : "text-slate-700"
                        )}>
                          <div className={cn(
                            "w-10 h-10 rounded-full border flex items-center justify-center group-hover:border-cyan-500/30 transition-all transform group-hover:scale-110 shadow-lg",
                            isDark ? "bg-white/5 border-white/10 group-hover:bg-cyan-500/20" : "bg-black/5 border-black/10 group-hover:bg-cyan-50/80"
                          )}>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                          <span className="transform group-hover:translate-x-1 transition-transform">Read Article</span>
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 9. CTA SECTION - ULTRA PREMIUM */}
      <section className="py-12 lg:py-24 relative z-20 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn(
              "relative rounded-3xl md:rounded-[3rem] overflow-hidden px-6 py-12 sm:p-10 md:p-16 lg:p-20 text-center shadow-2xl group border-2 transition-all duration-300",
              isDark ? "bg-gradient-to-br from-[#0e172a] to-[#0a1324] border-slate-700/80 ring-1 ring-white/5 hover:border-cyan-500/50 shadow-[0_15px_60px_rgba(0,0,0,0.6)]" : "bg-white border-slate-200 shadow-2xl"
            )}
          >
            {/* Top Cyan Accent Line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

            <div className="relative z-10">
              <div className={cn(
                "inline-flex items-center gap-3 px-6 py-2.5 rounded-full border text-sm font-bold tracking-widest uppercase mb-10 shadow-lg transition-colors",
                isDark ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                Let's Build Together
              </div>

              <h2 className={cn(
                "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 tracking-tight leading-[1.15] drop-shadow-md",
                isDark ? "text-white" : "text-slate-900"
              )}>
                Ready to Scale Your<br />Infrastructure?
              </h2>

              <p className={cn("text-base md:text-lg lg:text-xl mb-8 md:mb-10 max-w-3xl mx-auto font-medium leading-relaxed px-2", isDark ? "text-zinc-300" : "text-slate-600")}>
                Elevate your digital presence with enterprise-grade cloud architectures, zero-downtime migrations, and bulletproof security.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-5">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold transition-all gap-2 w-full sm:w-auto bg-cyan-600 text-white hover:bg-cyan-500 shadow-md hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  Let's Talk
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/services"
                  className={cn(
                    "inline-flex items-center justify-center px-8 py-4 md:px-10 md:py-4 rounded-xl border font-bold transition-all duration-300 gap-2 transform hover:-translate-y-1 w-full sm:w-auto text-base",
                    isDark ? "bg-slate-800/80 border-slate-700 text-white hover:bg-slate-800 hover:border-cyan-500/40 shadow-sm" : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 shadow-sm"
                  )}
                >
                  <span className="tracking-wide">View Pricing</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
