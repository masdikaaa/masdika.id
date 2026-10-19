"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  ChevronRight, 
  ChevronDown, 
  Zap, 
  Code, 
  Shield, 
  Cpu, 
  Image as ImageIcon, 
  MessageSquare, 
  Download, 
  CheckCircle2, 
  Rocket, 
  Cloud, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  Key, 
  FlaskConical, 
  Terminal, 
  Check, 
  Copy, 
  Globe, 
  Lock, 
  Sparkles, 
  Layers, 
  Server, 
  RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { formatRupiah } from "@/lib/billing";
import { cn } from "@/lib/utils";

const API_HUB_LOGS = [
  { time: "00:01", module: "CONFIG", message: "Validating API schema, routes & token rate-limits..." },
  { time: "00:02", module: "ENV", message: "Configuring isolated containerized sandbox runtime..." },
  { time: "00:03", module: "GATEWAY", message: "Mounting high-concurrency API Gateway proxy..." },
  { time: "00:04", module: "CACHE", message: "Attaching distributed Redis edge caching cluster..." },
  { time: "00:05", module: "READY", message: "curl https://api.masdika.id/v1/health", isCommand: true },
];

const API_HUB_STATS = [
  { value: "Unlimited", label: "API KEYS" },
  { value: "<10ms", label: "MEDIAN TTFB" },
  { value: "Redis", label: "EDGE CACHING" },
  { value: "99.99%", label: "UPTIME SLA" },
];

const API_HUB_FAQS = [
  {
    q: "How does the Masdika API Hub work?",
    a: "The API Hub is a curated directory where you can explore, test, and integrate public REST APIs. Once subscribed or registered, you receive instant API tokens with granular rate-limits and access to our live browser testing lab."
  },
  {
    q: "Is there a limit on API requests?",
    a: "Limits vary depending on the plan you select. Every plan includes a monthly request quota with built-in Redis edge caching to maximize throughput and minimize latency for repeated queries."
  },
  {
    q: "How secure are API keys and authentication?",
    a: "All tokens support HMAC cryptographic signatures and Bearer authorization delivered over TLS 1.3. You can restrict keys by IP address, origin domain, or revoke them instantly with zero downtime."
  },
  {
    q: "Can I test endpoints before deploying to production?",
    a: "Yes! Every API project features an interactive sandbox lab where you can send test payloads, inspect request headers, view formatted JSON responses, and copy ready-to-use cURL commands."
  },
  {
    q: "What programming languages and SDKs are supported?",
    a: "Because all endpoints adhere to strict OpenAPI/REST conventions, you can integrate them using standard HTTP clients in cURL, JavaScript/TypeScript, Python, Go, PHP, Java, or Rust."
  },
  {
    q: "What happens if my application exceeds the monthly quota?",
    a: "You will receive automated usage alerts when reaching 80% and 95% of your quota. You can seamlessly upgrade your tier or enable overage burst protection directly from your dashboard."
  }
];

const RAW_API_HUB_CODE = {
  curl: `curl -X GET "https://api.masdika.id/v1/projects" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Accept: application/json"`,
  javascript: `const response = await fetch('https://api.masdika.id/v1/projects', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Accept': 'application/json'
  }
});

const { data, status } = await response.json();
console.log('Available Endpoints:', data);`,
  python: `import requests

url = "https://api.masdika.id/v1/projects"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)
print("Endpoints:", response.json()["data"])`,
  go: `package main

import (
    "fmt"
    "net/http"
)

func main() {
    // Query API Hub endpoints with global Redis edge caching
    fmt.Println("Connected to Masdika API Gateway")
}`
};

interface PlanItem {
  id: number;
  name: string;
  service: string;
  description: string | null;
  price: number;
  hourlyPrice: number;
  limits: string;
  isPopular: boolean;
  isActive: boolean;
}

export default function ApiHubClient({ 
  initialProjects = [], 
  initialPlans = [] 
}: { 
  initialProjects: any[]; 
  initialPlans: PlanItem[];
}) {
  const [projects] = useState<any[]>(initialProjects);
  const [plans] = useState<PlanItem[]>(initialPlans);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activePricingTab, setActivePricingTab] = useState<string>(
    initialPlans.length > 0 ? Array.from(new Set(initialPlans.map((p: any) => p.service)))[0] as string : ""
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "javascript" | "python" | "go">("curl");
  const [copied, setCopied] = useState(false);

  const categories = ["All", ...Array.from(new Set(projects.map((p: any) => p.category)))];
  const filteredProjects = activeCategory === "All"
    ? projects
    : projects.filter(p => p.category === activeCategory);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(RAW_API_HUB_CODE[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = (iconStr: string) => {
    switch (iconStr) {
      case 'echo': return <Code className="w-5 h-5" />;
      case 'key': return <Shield className="w-5 h-5" />;
      case 'bot': return <Cpu className="w-5 h-5" />;
      case 'instagram': return <ImageIcon className="w-5 h-5" />;
      case 'whatsapp': return <MessageSquare className="w-5 h-5" />;
      case 'download': return <Download className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Home Page, File CDN & design.md) ────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl relative z-30"
            >
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  PUBLIC REST API DIRECTORY &amp; GATEWAY
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Discover Powerful <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  REST APIs
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Explore, test, and integrate enterprise-grade REST APIs in the Masdika API Hub directory. Built for ultra-low latency, secure token authorization, and rapid developer workflows.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/api-hub"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Browse Endpoints
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#pricing"
                  leftIcon={<Code className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  View Pricing
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (api-hub.webp) with 4 Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-10 lg:mt-0"
            >
              <div className="relative w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] h-[380px] sm:h-[440px] lg:h-[480px] mx-auto flex items-end justify-center">
                {/* Subtle ambient depth bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[300px] sm:w-[440px] sm:h-[360px] bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left (REST API Directory) */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-blue-500/40 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Code className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      REST API Directory
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Instant Endpoints
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right (Interactive Lab) */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-blue-500/40 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <FlaskConical className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Interactive Lab
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Real-Time Testing
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left (API Security) */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-blue-500/40 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Key className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      API Security
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      HMAC &amp; Bearer Auth
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right (High Availability) */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-blue-500/40 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      High Availability
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      99.99% Uptime SLA
                    </div>
                  </div>
                </div>

                {/* Karakter api-hub.webp utuh & proporsional */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                  }}
                >
                  <Image
                    src="/api-hub.webp"
                    alt="Masdika API Hub Mascot"
                    width={1536}
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

        {/* ── 1. VALUE PILLARS (4 Trust Highlights, Equal Height & Native CSS Variables) ────────── */}
        <section className="py-12 border-y border-[var(--border-primary)] mb-16 lg:mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { 
                icon: Code, 
                title: "Curated Public Endpoints", 
                desc: "Direct access to REST APIs for AI, developer utilities, and web services with comprehensive schema documentation." 
              },
              { 
                icon: FlaskConical, 
                title: "Interactive Sandboxes", 
                desc: "Test endpoints and inspect response schemas directly in your browser with real-time payload debugging." 
              },
              { 
                icon: Key, 
                title: "Granular API Tokens", 
                desc: "Generate isolated API keys with fine-grained rate limits, domain restrictions, and instant one-click revocation." 
              },
              { 
                icon: Zap, 
                title: "Redis Edge Acceleration", 
                desc: "Global caching layer delivers sub-10ms response times for high-throughput client applications and microservices." 
              },
            ].map((pillar, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200 p-6 flex flex-col justify-between h-full group shadow-sm">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                      <pillar.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
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

        {/* ── 2. DEVELOPER CODE & INTEGRATION SHOWCASE (High Contrast Terminal in Both Themes) ────────── */}
        <section className="mb-20 lg:mb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Dedicated High-Contrast Code Terminal */}
            <div className="lg:col-span-7">
              <FadeIn direction="up">
                <div 
                  className="rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden"
                  style={{ backgroundColor: "#060d19" }}
                >
                  
                  {/* Row 1: Window Controls + Title + Copy Button (Fixed Header) */}
                  <div 
                    className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-800"
                    style={{ backgroundColor: "#0c1425" }}
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                      <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                      <span className="text-xs font-mono font-bold text-slate-200 ml-1.5 tracking-wide">
                        bash — api-request.sh
                      </span>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
                      title="Copy code snippet"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-sans text-xs">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-sans text-slate-100 text-xs">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Row 2: Language Switcher Tabs Sub-bar */}
                  <div 
                    className="px-4 sm:px-6 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    style={{ backgroundColor: "#080f1d" }}
                  >
                    <div className="flex items-center gap-1 p-0.5 rounded-xl border border-slate-800 shadow-inner bg-[#040810]">
                      {(["curl", "javascript", "python", "go"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveCodeTab(tab)}
                          className={cn(
                            "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0",
                            activeCodeTab === tab
                              ? "bg-cyan-500 text-slate-950 shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                          )}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      GET /v1/projects
                    </span>
                  </div>

                  {/* Code Body */}
                  <div className="relative p-4 sm:p-6 font-mono text-xs sm:text-[14px] md:text-[15px] leading-relaxed overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="flex">
                      {/* Line Numbers Column */}
                      <div className="select-none text-right pr-4 mr-4 border-r border-slate-800 text-slate-500 font-mono text-xs sm:text-sm leading-relaxed space-y-0.5">
                        {activeCodeTab === "curl" && (
                          <>
                            <div>1</div>
                            <div>2</div>
                            <div>3</div>
                          </>
                        )}
                        {activeCodeTab === "javascript" && (
                          <>
                            <div>1</div>
                            <div>2</div>
                            <div>3</div>
                            <div>4</div>
                            <div>5</div>
                            <div>6</div>
                            <div>7</div>
                            <div>8</div>
                            <div>9</div>
                            <div>10</div>
                          </>
                        )}
                        {activeCodeTab === "python" && (
                          <>
                            <div>1</div>
                            <div>2</div>
                            <div>3</div>
                            <div>4</div>
                            <div>5</div>
                            <div>6</div>
                            <div>7</div>
                            <div>8</div>
                            <div>9</div>
                          </>
                        )}
                        {activeCodeTab === "go" && (
                          <>
                            <div>1</div>
                            <div>2</div>
                            <div>3</div>
                            <div>4</div>
                            <div>5</div>
                            <div>6</div>
                            <div>7</div>
                            <div>8</div>
                            <div>9</div>
                            <div>10</div>
                            <div>11</div>
                          </>
                        )}
                      </div>

                      {/* Code Content */}
                      <div className="flex-1 min-w-0 font-mono text-slate-100 selection:bg-cyan-500/30 whitespace-pre">
                        {activeCodeTab === "curl" && (
                          <div>
                            <div><span className="text-cyan-400 font-bold">curl</span> <span className="text-amber-300 font-bold">-X</span> <span className="text-emerald-400 font-black">GET</span> <span className="text-sky-300 font-semibold underline underline-offset-4 decoration-cyan-500/40">&quot;https://api.masdika.id/v1/projects&quot;</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">-H</span> <span className="text-emerald-300 font-semibold">&quot;Authorization: Bearer YOUR_API_KEY&quot;</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">-H</span> <span className="text-emerald-300 font-semibold">&quot;Accept: application/json&quot;</span></div>
                          </div>
                        )}
                        {activeCodeTab === "javascript" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">const</span> <span className="text-slate-100 font-semibold">res</span> = <span className="text-purple-400 font-bold">await</span> <span className="text-blue-300 font-semibold">fetch</span>(<span className="text-emerald-300 font-medium">&apos;https://api.masdika.id/v1/projects&apos;</span>, &#123;</div>
                            <div>{"  "}method: <span className="text-emerald-400 font-bold">&apos;GET&apos;</span>,</div>
                            <div>{"  "}headers: &#123;</div>
                            <div>{"    "}<span className="text-emerald-300 font-medium">&apos;Authorization&apos;</span>: <span className="text-emerald-300 font-medium">&apos;Bearer YOUR_API_KEY&apos;</span>,</div>
                            <div>{"    "}<span className="text-emerald-300 font-medium">&apos;Accept&apos;</span>: <span className="text-emerald-300 font-medium">&apos;application/json&apos;</span></div>
                            <div>{"  "}&#125;</div>
                            <div>&#125;);</div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">const</span> &#123; <span className="text-cyan-300 font-semibold">data</span> &#125; = <span className="text-purple-400 font-bold">await</span> <span className="text-slate-100">res</span>.<span className="text-blue-300 font-semibold">json</span>();</div>
                            <div>console.<span className="text-blue-300 font-semibold">log</span>(<span className="text-emerald-300 font-medium">&apos;Endpoints:&apos;</span>, <span className="text-cyan-300 font-semibold">data</span>);</div>
                          </div>
                        )}
                        {activeCodeTab === "python" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">import</span> <span className="text-sky-300 font-bold">requests</span></div>
                            <div>&nbsp;</div>
                            <div><span className="text-slate-100 font-semibold">url</span> = <span className="text-emerald-300 font-medium">&quot;https://api.masdika.id/v1/projects&quot;</span></div>
                            <div><span className="text-slate-100 font-semibold">headers</span> = &#123;</div>
                            <div>{"    "}<span className="text-emerald-300 font-medium">&quot;Authorization&quot;</span>: <span className="text-emerald-300 font-medium">&quot;Bearer YOUR_API_KEY&quot;</span>,</div>
                            <div>{"    "}<span className="text-emerald-300 font-medium">&quot;Accept&quot;</span>: <span className="text-emerald-300 font-medium">&quot;application/json&quot;</span></div>
                            <div>&#125;</div>
                            <div>&nbsp;</div>
                            <div><span className="text-slate-100 font-semibold">res</span> = requests.<span className="text-blue-300 font-semibold">get</span>(url, headers=headers)</div>
                            <div><span className="text-blue-300 font-semibold">print</span>(<span className="text-emerald-300 font-medium">&quot;Endpoints:&quot;</span>, res.<span className="text-blue-300 font-semibold">json</span>()[<span className="text-emerald-300 font-medium">&quot;data&quot;</span>])</div>
                          </div>
                        )}
                        {activeCodeTab === "go" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">package</span> <span className="text-sky-300 font-bold">main</span></div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">import</span> (</div>
                            <div>{"  "}<span className="text-emerald-300 font-medium">&quot;fmt&quot;</span></div>
                            <div>{"  "}<span className="text-emerald-300 font-medium">&quot;net/http&quot;</span></div>
                            <div>)</div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">func</span> <span className="text-blue-300 font-semibold">main</span>() &#123;</div>
                            <div>{"  "}<span className="text-slate-400 italic">// Query API Hub endpoints with global Redis edge caching</span></div>
                            <div>{"  "}fmt.<span className="text-blue-300 font-semibold">Println</span>(<span className="text-emerald-300 font-medium">&quot;Connected to Masdika API Gateway&quot;</span>)</div>
                            <div>&#125;</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Code Box Footer: Response Preview */}
                  <div 
                    className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                    style={{ backgroundColor: "#0c1425" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="font-bold text-emerald-400">HTTP 200 OK</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">Redis Edge Cache Hit</span>
                    </div>

                    <div className="text-slate-200 font-medium flex items-center gap-1.5 overflow-x-auto text-[11px] sm:text-xs">
                      <span className="text-slate-400 shrink-0">Payload:</span>
                      <span className="text-cyan-300 font-bold bg-[#060d19] px-2 py-0.5 rounded border border-cyan-800/60 truncate max-w-[260px] sm:max-w-none">
                        &#123;&quot;status&quot;: 200, &quot;endpoints&quot;: 14&#125;
                      </span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Right: Architectural Highlights */}
            <div className="lg:col-span-5 space-y-6">
              <FadeIn direction="up" delay={0.2}>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                    DEVELOPER ARCHITECTURE
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                    High-Throughput, Low-Latency APIs
                  </h2>
                  <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 font-normal">
                    Designed for engineers who build data pipelines, bot integrations, and web services. Accelerate delivery with automated caching and zero cold-start penalties.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Cache Hit Ratio", value: "99.8%", sub: "Distributed Redis Edge" },
                    { label: "Median TTFB", value: "<10ms", sub: "Direct IIX Peering" },
                    { label: "Security", value: "HMAC", sub: "SHA-256 Signatures" },
                    { label: "Interactive Lab", value: "Ready", sub: "Live Browser Sandbox" },
                  ].map((stat, i) => (
                    <div 
                      key={i} 
                      className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-sm"
                    >
                      <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                        {stat.value}
                      </div>
                      <div className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                        {stat.label}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        {stat.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

          </div>
        </section>

        {/* ── 3. PUBLIC API DIRECTORY (Categories + Live Project Cards) ────────── */}
        <section className="mb-20 lg:mb-28">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
                EXPLORE DIRECTORY
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
                {activeCategory === "All" ? "Featured REST APIs" : `${activeCategory} Endpoints`}
              </h2>
            </div>

            {/* Categories filter pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    activeCategory === cat
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:border-cyan-500/40 hover:text-[var(--text-primary)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map(project => (
                <ApiCard key={project.id} project={project} getIcon={getIcon} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-12 text-center shadow-sm">
              <Code className="w-12 h-12 text-cyan-500/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No APIs found in this category</h3>
              <p className="text-sm text-[var(--text-secondary)]">Check back soon as new endpoints are continuously added.</p>
            </div>
          )}
        </section>

        {/* ── 4. ENTERPRISE CAPABILITIES (3 Equal Cards with Native Theme Variables) ────────── */}
        <section className="mb-20 lg:mb-28">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Engineered for Speed, Scale &amp; Trust
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Production-ready infrastructure with automatic horizontal scaling, edge caching, and strict authentication controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {[
              {
                icon: Zap,
                title: "Ultra-Low Latency Routing",
                desc: "All endpoints are fronted by Anycast edge proxies and regional Redis clusters for sub-10ms response delivery."
              },
              {
                icon: ShieldCheck,
                title: "Granular Token Security",
                desc: "Generate scoped API keys with rate-limit quotas, domain restrictions, and instant single-click revocation."
              },
              {
                icon: FlaskConical,
                title: "Interactive Sandbox Lab",
                desc: "Inspect JSON request/response payloads in real-time directly inside your browser before deploying code."
              }
            ].map((cap, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200 p-8 h-full flex flex-col justify-between shadow-sm group">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                      <cap.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 5. PRICING PLANS SECTION (Consistent Native Theme Cards) ────────── */}
        {plans.length > 0 && (
          <section id="pricing" className="mb-20 lg:mb-28 pt-10">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                TRANSPARENT PRICING
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                Simple, Predictable API Tiers
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                Subscribe to individual APIs as you need them. No hidden fees or complex usage tiers.
              </p>
            </div>

            {/* Service Filter Dropdown */}
            <div className="flex justify-center mb-16 w-full px-4">
              <div className="relative w-full max-w-sm">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-6 py-4 rounded-2xl flex items-center justify-between border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] shadow-md transition-all font-bold hover:border-cyan-500/50"
                >
                  <span className="truncate">{activePricingTab.replace(/_/g, ' ')}</span>
                  <ChevronDown className={cn("w-5 h-5 shrink-0 transition-transform text-cyan-500", isDropdownOpen && "rotate-180")} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto border border-[var(--border-primary)] bg-[var(--surface)] shadow-2xl">
                    {Array.from(new Set(plans.map((p: any) => p.service))).map((service) => (
                      <button
                        key={service as string}
                        onClick={() => {
                          setActivePricingTab(service as string);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-6 py-3.5 text-sm font-bold transition-all border-l-2",
                          activePricingTab === service
                            ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] border-transparent"
                        )}
                      >
                        {(service as string).replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
              {plans.filter((p: any) => p.service === activePricingTab).map((plan, index) => {
                const isPopular = plan.isPopular;

                let specs = [];
                try {
                  if (plan.limits) {
                    const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
                    if (limits.requests && limits.requests !== 'unlimited') specs.push(`${limits.requests.toString().toUpperCase()} API Requests`);
                    if (limits.requests === 'unlimited') specs.push(`Unlimited API Requests`);
                  }
                } catch (e) { }

                return (
                  <FadeIn key={plan.id} delay={index * 0.1} direction="up" className="h-full">
                    <div
                      className={cn(
                        "relative rounded-2xl p-8 h-full flex flex-col justify-between transition-all duration-300",
                        isPopular
                          ? "border-2 border-cyan-500 dark:border-cyan-400 bg-[var(--surface)] shadow-xl shadow-cyan-500/10 md:-translate-y-2"
                          : "border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 shadow-sm"
                      )}
                    >
                      {isPopular && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-white text-[11px] font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md select-none">
                          Most Popular
                        </div>
                      )}

                      <div>
                        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 min-h-[36px]">
                          {plan.description || "High-concurrency REST API subscription tier."}
                        </p>

                        <div className="mb-6 pb-6 border-b border-[var(--border-primary)]">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                              {formatRupiah(plan.price)}
                            </span>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">
                              /month
                            </span>
                          </div>
                        </div>

                        <ul className="space-y-3.5 mb-8">
                          {specs.map((spec: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                              <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                              <span className="text-sm text-[var(--text-primary)] font-medium">
                                {spec}
                              </span>
                            </li>
                          ))}
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              Redis Edge Caching
                            </span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              99.99% Uptime Guarantee
                            </span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              Dedicated Token Support
                            </span>
                          </li>
                        </ul>
                      </div>

                      <Button
                        variant={isPopular ? "primary" : "secondary"}
                        href={`/dashboard/checkout?service=${plan.service.toLowerCase()}&plan=${plan.id}`}
                        className="w-full justify-center"
                        leftIcon={<Rocket className="w-4 h-4" />}
                      >
                        Subscribe Now
                      </Button>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 6. THREE-STEP WORKFLOW ────────── */}
        <section className="mb-20 lg:mb-28">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              INTEGRATION PROCESS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Go Live in 3 Simple Steps
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              From endpoint discovery to production requests with comprehensive docs and sandbox testing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            {/* Connecting Line Container */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-slate-200 dark:bg-white/10 overflow-hidden rounded-full">
              <AnimatedBeam />
            </div>

            {[
              {
                step: "01",
                title: "Browse API Directory",
                desc: "Discover available REST endpoints across categories and inspect request schemas."
              },
              {
                step: "02",
                title: "Generate API Tokens",
                desc: "Configure granular tokens with custom rate limits and domain whitelist protection."
              },
              {
                step: "03",
                title: "Integrate & Test Live",
                desc: "Use ready-to-use cURL and SDK snippets to deploy high-concurrency requests instantly."
              }
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

        {/* ── 7. PROVISIONING TERMINAL & FAQ ────────── */}
        <ProvisioningSection
          title="Instant API Deployment"
          description="Deploy and manage your APIs globally in seconds. Enjoy built-in edge caching and scalable infrastructure instantly."
          buttonText="Start Using API Hub"
          buttonHref="/dashboard"
          logs={API_HUB_LOGS}
          stats={API_HUB_STATS}
          iconType="api-hub"
        />

        <FaqSection faqs={API_HUB_FAQS} />
      </div>
    </div>
  );
}

function ApiCard({ project, getIcon }: { project: any, getIcon: (str: string) => any }) {
  return (
    <Link href={`/api-hub/${project.slug}/lab`} className="group block h-full">
      <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 p-6 transition-all duration-200 h-full flex flex-col justify-between shadow-sm group hover:-translate-y-1 relative overflow-hidden">
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
            {getIcon(project.icon)}
          </div>
          <button className="text-[var(--text-muted)] hover:text-cyan-400 transition-colors">
            <Star className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col">
          <h3 className="text-lg font-bold mb-2 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors text-[var(--text-primary)] flex items-center gap-2">
            {project.name}
          </h3>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-6">
            {project.description}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between relative z-10 pt-4 border-t border-[var(--border-primary)]">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] uppercase">
            {project.method}
          </span>
          <span className="text-cyan-600 dark:text-cyan-400 flex items-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0">
            Open Lab <ChevronRight className="w-4 h-4 ml-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
