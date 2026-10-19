"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Server, 
  Cloud, 
  Shield, 
  Database, 
  Network, 
  Activity, 
  Terminal, 
  ArrowRight, 
  Code, 
  Link2, 
  MessageSquare,
  Layout,
  CheckCircle,
  FileText
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/animations/FadeIn";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
} as const;

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export default function ServicesPage() {
  const PRODUCTS = [
    {
      icon: Code,
      title: "API Hub",
      type: "SaaS",
      percentage: 99,
      description: "A centralized hub to discover, manage, and consume high-performance APIs with seamless integration and monitoring.",
      href: "/api-hub"
    },
    {
      icon: SiKubernetes,
      title: "Managed K3s",
      type: "PaaS",
      percentage: 99,
      description: "Lightweight, production-ready Kubernetes clusters optimized for edge and IoT, fully managed for you.",
      href: "/k3s"
    },
    {
      icon: Terminal,
      title: "High-Performance VPS",
      type: "IaaS",
      percentage: 99,
      description: "Blazing fast Virtual Private Servers with dedicated resources, SSD & HDD storage options, and root access.",
      href: "/vps"
    },
    {
      icon: Link2,
      title: "URL Shortener",
      type: "SaaS",
      percentage: 99,
      description: "Fast, reliable, and trackable short links to optimize your marketing campaigns and share URLs gracefully.",
      href: "/shortener"
    },
    {
      icon: Cloud,
      title: "File CDN",
      type: "PaaS",
      percentage: 99,
      description: "Global edge network to securely host, manage, and deliver your files and media globally with low latency.",
      href: "/file-cdn"
    }
  ];

  const EXPERTISE = [
    {
      icon: Cloud,
      title: "Cloud Architecture",
      percentage: 95,
      description: "Designing and deploying scalable, highly available cloud infrastructures across AWS, GCP, and Azure aligned with strict enterprise SLAs.",
    },
    {
      icon: Server,
      title: "Kubernetes Orchestration",
      percentage: 92,
      description: "Production-ready Kubernetes clusters setup, maintenance, and orchestration using GitOps workflows with ArgoCD and Helm.",
    },
    {
      icon: Activity,
      title: "DevOps & CI/CD",
      percentage: 88,
      description: "Streamlining development lifecycles with modern automation tools, drastically reducing deployment times and human error.",
    },
    {
      icon: Shield,
      title: "Security & Networking",
      percentage: 85,
      description: "Implementing Zero-Trust architectures, multi-cloud VPN meshes (WireGuard), and comprehensive WAF policies for web applications.",
    },
    {
      icon: Database,
      title: "Database Optimization",
      percentage: 90,
      description: "Optimizing relational and NoSQL databases for high-throughput applications, ensuring sub-millisecond query latency and automated backups.",
    },
    {
      icon: Network,
      title: "Serverless Microservices",
      percentage: 92,
      description: "Designing event-driven architectures and API gateways to break down monoliths into scalable, maintainable serverless microservices.",
    }
  ];

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Home Page) ────────────────────── */}
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
                  ENTERPRISE CLOUD SERVICES &amp; SOLUTIONS
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Elevated Architectures <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  &amp; Cloud Solutions.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Professional cloud consulting, Kubernetes orchestration, and enterprise digital products engineered to maximize performance, scalability, and seamless operations.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
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
                  href="#products-section"
                  leftIcon={<Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Explore Offerings
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (services.png) with Floating Badges */}
            {/* Right – Hero Avatar (services.webp) with 4 Floating Badges (All 4 Visible on Mobile) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="relative flex items-center justify-center mt-10 lg:mt-0"
            >
              <div className="relative w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] h-[380px] sm:h-[440px] lg:h-[480px] mx-auto flex items-end justify-center">
                {/* Subtle ambient bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Cloud className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Enterprise Cloud
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Multi-Cloud
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Shield className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      SLA Guarantee
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      99.9% Uptime
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      DevOps &amp; CI/CD
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Zero Downtime
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2.5 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <SiKubernetes className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Kubernetes
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Managed K8s
                    </div>
                  </div>
                </div>

                {/* Karakter services.webp utuh & proporsional */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                  }}
                >
                  <Image
                    src="/services.webp"
                    alt="Masdika – Services & Solutions"
                    width={1024}
                    height={1024}
                    priority={true}
                    unoptimized={true}
                    className="w-full h-full object-contain object-bottom"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 1. PRODUCTS SECTION (Sama persis patokan Home) ────────────────── */}
        <section id="products-section" className="py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Our Products
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Enterprise-Grade Digital Infrastructure
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              High-performance, fully managed digital products engineered to help your applications scale seamlessly with uncompromising reliability.
            </p>
          </motion.div>

          {/* Products Grid */}
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
                  className="block group h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.1)] transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <div className="relative h-full p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 group-hover:border-cyan-500/60 group-hover:bg-cyan-500/10 transition-all duration-300">
                        {prod.title === "Managed K3s" ? (
                          <prod.icon className="w-5 h-5" />
                        ) : (
                          <prod.icon className="w-5 h-5" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {prod.type && (
                          <Badge variant="neutral" size="sm">
                            {prod.type}
                          </Badge>
                        )}
                        <Badge variant="success" size="sm" dot>
                          99.9% SLA
                        </Badge>
                      </div>
                    </div>

                    <h3 className="text-base font-bold mb-2 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {prod.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-grow mb-5">
                      {prod.description}
                    </p>

                    <div className="flex items-center gap-2 mt-auto text-sm font-semibold text-zinc-500 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-all">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-cyan-500 dark:text-cyan-400" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── 2. TECHNICAL EXPERTISE SECTION (Sama persis patokan Home) ────── */}
        <section className="py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              What I Do
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Architectural Expertise &amp; Consulting
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Deep engineering expertise across multi-cloud infrastructure, container automation, and database tuning to ensure high availability.
            </p>
          </motion.div>

          {/* Expertise Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {EXPERTISE.map((exp, i) => (
              <motion.div variants={item} key={i} className="h-full">
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.1)] transition-all duration-300 hover:-translate-y-1 p-6 flex flex-col justify-between h-full group">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 group-hover:border-cyan-500/60 group-hover:bg-cyan-500/10 transition-all duration-300">
                        <exp.icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>

                      {/* Percentage Ring */}
                      <div className="relative w-11 h-11 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeWidth="3" />
                          <motion.circle
                            cx="18"
                            cy="18"
                            r="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray="94.2"
                            initial={{ strokeDashoffset: 94.2 }}
                            whileInView={{ strokeDashoffset: 94.2 - (94.2 * exp.percentage) / 100 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="text-cyan-500 dark:text-cyan-400"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-[var(--text-primary)]">
                          {exp.percentage}%
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold mb-2 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {exp.title}
                    </h3>

                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {exp.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── 3. WORKING PROCESS SECTION (Sama persis patokan Home) ─────────── */}
        <section className="py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Workflow
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              How I Deliver Success
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              A disciplined, three-stage engineering methodology designed to de-risk projects, automate operations, and scale with confidence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-[var(--border-primary)] z-0" />

            {[
              {
                title: "Discovery & Architecture",
                desc: "We analyze current infrastructure bottlenecks, define workload requirements, and design resilient cloud architectures.",
                icon: Layout,
              },
              {
                title: "Implementation & Automation",
                desc: "Provisioning infrastructure as code (IaC) with Terraform, configuring Kubernetes clusters, and setting up CI/CD pipelines.",
                icon: Code,
              },
              {
                title: "Optimization & Scaling",
                desc: "Continuous observability, automated security patching, performance benchmarks, and proactive cost optimization.",
                icon: CheckCircle,
              }
            ].map((step, idx) => (
              <FadeIn key={idx} delay={idx * 0.1} direction="up" className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-center justify-center mb-6 relative">
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-center text-[11px] font-bold text-[var(--text-muted)]">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <step.icon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[240px]">{step.desc}</p>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 4. CALL TO ACTION ──────────────────────────────────────────────── */}
        <section className="pt-8 pb-12">
          <div className="rounded-3xl bg-gradient-to-b from-cyan-500/5 to-transparent dark:from-cyan-500/10 dark:to-transparent border border-cyan-500/20 p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            <Badge variant="brand" size="md" className="mb-4 font-mono uppercase">
              LET&apos;S COLLABORATE
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
              Ready to Upgrade Your Cloud Infrastructure?
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              Whether you need high-performance compute, managed Kubernetes clusters, or architectural consulting, let&apos;s architect your success today.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Start a Project
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="/portfolio"
              >
                Explore Case Studies
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
