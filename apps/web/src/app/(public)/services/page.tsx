"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Server, Cloud, Shield, Database, Network, Activity, Terminal, ArrowRight, Code, Link2, HardDrive } from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/animations/TiltCard";
import { useTheme } from "@/components/ThemeProvider";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
} as const;

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export default function ServicesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const PRODUCTS = [
    {
      icon: Code,
      title: "API Hub",
      type: "SAAS",
      percentage: 99,
      description: "A centralized hub to discover, manage, and consume high-performance APIs with seamless integration and monitoring.",
      href: "/api-hub"
    },
    {
      icon: SiKubernetes,
      title: "Managed K3s",
      type: "PAAS",
      percentage: 99,
      description: "Lightweight, production-ready Kubernetes clusters optimized for edge and IoT, fully managed for you.",
      href: "/k3s"
    },
    {
      icon: Terminal,
      title: "High-Performance VPS",
      type: "IAAS",
      percentage: 99,
      description: "Blazing fast Virtual Private Servers with dedicated resources, SSD & HDD storage options, and root access for ultimate control.",
      href: "/vps"
    },
    {
      icon: Link2,
      title: "URL Shortener",
      type: "SAAS",
      percentage: 99,
      description: "Fast, reliable, and trackable short links to optimize your marketing campaigns and share URLs gracefully.",
      href: "/shortener"
    },
    {
      icon: Cloud,
      title: "File CDN",
      type: "SAAS",
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
      description: "I specialize in designing and deploying scalable, highly available cloud infrastructures across AWS, GCP, and Azure that align with strict enterprise business goals.",
    },
    {
      icon: Server,
      title: "Kubernetes Orchestration",
      percentage: 90,
      description: "Production-ready Kubernetes clusters setup, maintenance, and orchestration using GitOps workflows with ArgoCD and Helm.",
    },
    {
      icon: Activity,
      title: "DevOps & CI/CD",
      percentage: 85,
      description: "Streamlining development lifecycles with modern automation tools, drastically reducing deployment times and human error.",
    },
    {
      icon: Shield,
      title: "Security & Networking",
      percentage: 80,
      description: "Implementing Zero-Trust architectures, multi-cloud VPN meshes (WireGuard), and comprehensive WAF policies for web applications.",
    },
    {
      icon: Database,
      title: "Database Optimization",
      percentage: 85,
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
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 bg-transparent relative">


      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* EXPERTISE SECTION HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 border-b border-white/5 pb-12 pt-10 relative z-10"
        >
          <div className="max-w-2xl">
            <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
              What I Do
            </span>
            <h1 className={cn("text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
              Elevated Designs <br className="hidden sm:block" />
              <span className={cn("bg-clip-text text-transparent drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>Personalized IT Solutions</span>
            </h1>
            <p className={cn("text-lg md:text-xl leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
              Professional cloud consulting and engineering services providing expert advice to help businesses improve performance, efficiency, and scale seamlessly.
            </p>
          </div>
        </motion.div>

        {/* Expertise List */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-6 lg:space-y-8 relative z-10"
        >
          {EXPERTISE.map((exp, i) => (
            <motion.div
              variants={item}
              key={i}
            >
              <TiltCard intensity={5} className={cn(
                "group relative backdrop-blur-xl rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-xl rounded-bl-xl p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 border transition-all duration-500 overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)]",
                isDark 
                  ? "bg-gradient-to-br from-[#0e172a] to-[#0a1324] hover:from-[#13203c] hover:to-[#0e172a] border-slate-700/80 border-t-2 border-l-2 border-t-cyan-400 border-l-cyan-400 hover:border-t-cyan-300 hover:border-l-cyan-300 shadow-xl shadow-black/40 ring-1 ring-white/5"
                  : "bg-white border-black/5 border-t-2 border-l-2 border-t-cyan-500/30 border-l-cyan-500/30 hover:border-t-cyan-500 hover:border-l-cyan-500 hover:shadow-xl"
              )}>
                {/* Background Glow on Hover */}
                <div className={cn("absolute inset-0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out", isDark ? "bg-gradient-to-r from-transparent via-white/5 to-transparent" : "bg-gradient-to-r from-transparent via-slate-900/5 to-transparent")} />

                {/* Left: Icon & Title */}
                <div className="flex flex-col gap-6 w-full lg:w-1/3 z-10 relative">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner transition-transform duration-500 group-hover:scale-110",
                    isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200"
                  )}>
                    <exp.icon className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} strokeWidth={1.5} />
                  </div>
                  <h3 className={cn("text-3xl font-black transition-colors leading-tight", isDark ? "text-white" : "text-slate-900")}>
                    {exp.title}
                  </h3>
                </div>

                {/* Middle: Percentage Circle */}
                <div className="w-full lg:w-1/4 flex justify-start lg:justify-center z-10 relative mt-4 lg:mt-0">
                  <div className="relative w-28 h-28 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    {/* SVG Ring Background */}
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="4" />
                      {/* SVG Ring Progress */}
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeDasharray="283"
                        initial={{ strokeDashoffset: 283 }}
                        whileInView={{ strokeDashoffset: 283 - (283 * exp.percentage) / 100 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                        className={isDark ? "text-cyan-400" : "text-cyan-600"}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className={cn("text-2xl font-black", isDark ? "text-white" : "text-slate-900")}>{exp.percentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Right: Description */}
                <div className="w-full lg:w-1/3 z-10 relative flex flex-col justify-center">
                  <p className={cn("leading-relaxed font-medium text-lg", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {exp.description}
                  </p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

        {/* PRODUCTS SECTION HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 border-b border-white/5 pb-12 pt-32 relative z-10"
        >
          <div className="max-w-2xl">
            <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
              Our Products
            </span>
            <h2 className={cn("text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
              Enterprise-Grade <br className="hidden sm:block" />
              <span className={cn("bg-clip-text text-transparent drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>Digital Infrastructure</span>
            </h2>
            <p className={cn("text-lg md:text-xl leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
              Discover our suite of high-performance, fully managed digital products designed to help your business scale seamlessly without the operational overhead.
            </p>
          </div>
        </motion.div>

        {/* Products List */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 relative z-10"
        >
          {PRODUCTS.map((prod, i) => (
            <motion.div
              variants={item}
              key={i}
              className="h-full"
            >
              <Link href={prod.href} className="block group h-full">
                <TiltCard intensity={10} className={cn(
                  "relative h-full backdrop-blur-xl rounded-2xl p-8 flex flex-col border transition-all duration-500 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border-b-[6px] hover:-translate-y-2 group",
                  isDark 
                    ? "bg-gradient-to-b from-[#0e172a] to-[#0a1324] border-slate-700/80 border-b-cyan-400 hover:border-b-cyan-300 hover:border-t-cyan-400/50 hover:border-x-cyan-400/50 shadow-xl shadow-black/40 ring-1 ring-white/5"
                    : "bg-white border-black/5 border-b-cyan-500/30 hover:border-b-cyan-500 hover:shadow-xl hover:border-black/10"
                )}>
                  {/* Background Glow on Hover */}
                  <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700", isDark ? "bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent" : "bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent")} />

                  {/* Icon & SLA Badge */}
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:bg-cyan-500/20",
                      isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200"
                    )}>
                      {prod.title === "Managed K3s" ? (
                        <prod.icon className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      ) : (
                        <prod.icon className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {prod.type && (
                        <div className={cn("px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all", isDark ? "bg-cyan-950/60 border-cyan-500/20 group-hover:border-cyan-400/40 group-hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 group-hover:border-cyan-300 group-hover:bg-cyan-100")}>
                          <span className={cn("text-[10px] font-black tracking-widest uppercase", isDark ? "text-cyan-300 group-hover:text-cyan-200" : "text-cyan-700 group-hover:text-cyan-800")}>{prod.type}</span>
                        </div>
                      )}
                      {/* Modern Uptime Badge */}
                      <div className={cn("px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all", isDark ? "bg-cyan-950/60 border-cyan-500/20 group-hover:border-cyan-400/40 group-hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 group-hover:border-cyan-300 group-hover:bg-cyan-100")}>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span className={cn("text-[10px] font-black tracking-widest uppercase", isDark ? "text-cyan-300 group-hover:text-cyan-200" : "text-cyan-700 group-hover:text-cyan-800")}>98.99% SLA</span>
                      </div>
                    </div>
                  </div>

                  <h3 className={cn("text-2xl lg:text-3xl font-black transition-colors leading-tight mb-4 relative z-10", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>
                    {prod.title}
                  </h3>

                  <p className={cn("leading-relaxed font-medium text-sm lg:text-base flex-grow mb-8 relative z-10 line-clamp-4", isDark ? "text-zinc-400" : "text-slate-600")}>
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

        {/* Work Process Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
          className="mt-32 mb-16 text-center relative z-10"
        >
          <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
            Work Process
          </span>
          <h2 className={cn("text-4xl md:text-5xl lg:text-6xl font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>
            How I Deliver Success
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {/* Connection Line */}
          <div className="hidden md:block absolute top-[40%] left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent -translate-y-1/2 z-0"></div>

          {[
            {
              num: 1,
              title: "Discovery & Architecture",
              desc: "We start by analyzing your current infrastructure, identifying bottlenecks, and designing a scalable architecture tailored to your needs.",
            },
            {
              num: 2,
              title: "Implementation",
              desc: "Deploying infrastructure as code (IaC) and setting up CI/CD pipelines to ensure automated, repeatable, and error-free releases.",
            },
            {
              num: 3,
              title: "Optimization",
              desc: "Continuous monitoring, security patching, and cost optimization to keep your cloud environments running at peak performance.",
            }
          ].map((step, idx) => (
            <motion.div
              key={idx}
              variants={item}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.2, ease: "easeOut" }}
            >
              <TiltCard intensity={12} className={cn(
                "relative z-10 backdrop-blur-md rounded-t-[5rem] rounded-b-2xl p-10 pt-14 text-center border transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] group h-full",
                isDark 
                  ? "bg-gradient-to-t from-[#0e172a] to-[#121f38] border-slate-700/80 hover:border-cyan-500/50 hover:from-[#111e38] hover:to-[#172748] shadow-xl shadow-black/40 ring-1 ring-white/5"
                  : "bg-white border-black/5 hover:border-cyan-500/40 hover:shadow-2xl"
              )}>
                <div className={cn(
                  "w-20 h-20 rounded-full border-2 flex items-center justify-center text-3xl font-black mx-auto mb-8 shadow-xl group-hover:scale-110 transition-transform duration-300",
                  isDark ? "bg-[#050B14] text-cyan-400 border-cyan-500/30" : "bg-cyan-50 text-cyan-600 border-cyan-200"
                )}>
                  {step.num}
                </div>
                <h3 className={cn("text-2xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>{step.title}</h3>
                <p className={cn("font-medium leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>{step.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}
