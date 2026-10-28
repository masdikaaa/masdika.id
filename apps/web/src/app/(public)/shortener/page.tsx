"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Link2, 
  Sparkles, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Shield, 
  Zap, 
  ArrowRight, 
  Activity, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  LayoutDashboard, 
  Globe, 
  Rocket, 
  Cloud,
  Check,
  Terminal,
  Clock,
  Server,
  Layers,
  BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { formatRupiah } from "@/lib/billing";
import { cn } from "@/lib/utils";

const SHORTENER_LOGS = [
  { time: "00:01", module: "CONFIG", message: "Validating target destination & custom alias..." },
  { time: "00:02", module: "DNS", message: "Propagating Anycast edge routing & TLS cert..." },
  { time: "00:03", module: "ROUTER", message: "Configuring sub-5ms 301/302 edge redirect rules..." },
  { time: "00:04", module: "ANALYTICS", message: "Attaching geo-IP & click stream telemetry tracker..." },
  { time: "00:05", module: "READY", message: "curl -I https://masdika.id/s/quick-link", isCommand: true },
];

const SHORTENER_STATS = [
  { value: "<5ms", label: "EDGE REDIRECT" },
  { value: "Unlimited", label: "CUSTOM DOMAINS" },
  { value: "Real-time", label: "LIVE TELEMETRY" },
  { value: "Permanent", label: "LINK LIFESPAN" },
];

const SHORTENER_FAQS = [
  {
    q: "Can I connect my own branded custom domain?",
    a: "Yes! You can connect your custom domains (e.g., link.yourbrand.com) with automatic zero-configuration SSL certificates and full DNS routing controls."
  },
  {
    q: "How fast is the redirect performance?",
    a: "All short links are distributed via our global Anycast edge network with direct IIX peering in Indonesia, achieving redirect latencies under 5 milliseconds."
  },
  {
    q: "What telemetry and analytics are tracked for each click?",
    a: "We capture real-time visitor telemetry including country, city, referring website, browser, operating system, and UTM marketing campaign parameters without violating user privacy."
  },
  {
    q: "Do generated short links ever expire?",
    a: "By default, your short links are permanent and will never expire unless you configure an optional expiration schedule or manually deactivate them in your dashboard."
  },
  {
    q: "Is there a REST API for automated link shortening?",
    a: "Yes. Our enterprise REST API lets you shorten URLs, generate QR codes, inspect analytics, and manage custom domains programmatically via cURL, JavaScript, Python, or Go."
  },
  {
    q: "How does anti-phishing protection work?",
    a: "Every destination URL is continuously validated against global threat feeds, anti-malware databases, and real-time destination health monitors to preserve your brand's reputation."
  }
];

const RAW_SHORTENER_CODE = {
  curl: `curl -X POST https://masdika.id/api/v1/shorten \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/very-long-marketing-url",
    "alias": "summer-promo"
  }'`,
  javascript: `const response = await fetch('https://masdika.id/api/v1/shorten', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/very-long-marketing-url',
    alias: 'summer-promo'
  })
});

const { shortUrl, qrCode } = await response.json();
console.log('Short Link:', shortUrl);`,
  python: `import requests

url = "https://masdika.id/api/v1/shorten"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "url": "https://example.com/very-long-marketing-url",
    "alias": "summer-promo"
}

response = requests.post(url, headers=headers, json=payload)
print("Short Link:", response.json()["shortUrl"])`,
  go: `package main

import (
    "fmt"
    "net/http"
)

func main() {
    // Shorten URL with sub-5ms Anycast routing
    fmt.Println("Created -> https://masdika.id/summer-promo")
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

export default function ShortenerPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "javascript" | "python" | "go">("curl");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/public/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const shortenerPlans = data.data.filter((p: any) => p.service === 'SHORTENER');
          setPlans(shortenerPlans);
        }
      })
      .catch(() => { });
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(RAW_SHORTENER_CODE[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlanSpecs = (plan: PlanItem) => {
    try {
      if (!plan.limits) return [];
      const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
      let specs = [];
      if (limits.links && limits.links !== 'unlimited') specs.push(`${limits.links.toString().toUpperCase()} Custom Short Links`);
      if (limits.links === 'unlimited') specs.push(`Unlimited Custom Links`);
      return specs;
    } catch (e) {
      return ["Branded Short Links", "Global Anycast Redirection"];
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
                  FAST EDGE REDIRECT &amp; ANALYTICS PLATFORM
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Shorten. Share. <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Track Everything.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Create custom branded short links, analyze real-time visitor telemetry, and route traffic across global edge nodes with sub-5ms redirect latency.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy Short Link
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#pricing"
                  leftIcon={<Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  View Pricing
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (url-shortener.webp) with 4 Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-6 lg:mt-0"
            >
              <HeroAvatarFrame
                imageSrc="/url-shortener.webp"
                imageAlt="Masdika URL Shortener Mascot"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Link2, label: "Edge Redirect", value: "< 5ms Latency" },
                  { icon: Globe, label: "Custom Domain", value: "Branded Short Links" },
                  { icon: Activity, label: "Live Analytics", value: "Real-Time Telemetry" },
                  { icon: ShieldCheck, label: "Link Security", value: "Anti-Phishing & SSL" },
                ]}
              />
            </motion.div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights, Equal Height & Native CSS Variables) ────────── */}
        <section className="py-12 border-y border-[var(--border-primary)] mb-16 lg:mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { 
                icon: Zap, 
                title: "Sub-5ms Edge Routing", 
                desc: "Global DNS and edge proxies deliver instant 301/302 redirects with minimal latency for every visitor worldwide." 
              },
              { 
                icon: Globe, 
                title: "Custom Domain Integration", 
                desc: "Connect unlimited custom brand domains with automatic free SSL provisioning and full DNS routing control." 
              },
              { 
                icon: Activity, 
                title: "Deep Real-Time Analytics", 
                desc: "Track geo-location, referrers, device telemetry, and conversion UTM parameters updated in real time." 
              },
              { 
                icon: ShieldCheck, 
                title: "Phishing & Bot Mitigation", 
                desc: "Real-time destination verification, SSL encryption, and high-frequency rate limiting to protect your brand." 
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
                        bash — shorten.sh
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
                      POST /api/v1/shorten
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
                            <div>4</div>
                            <div>5</div>
                            <div>6</div>
                            <div>7</div>
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
                            <div>11</div>
                            <div>12</div>
                            <div>13</div>
                            <div>14</div>
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
                            <div>10</div>
                            <div>11</div>
                            <div>12</div>
                            <div>13</div>
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
                            <div><span className="text-cyan-400 font-bold">curl</span> <span className="text-amber-300 font-bold">-X</span> <span className="text-emerald-400 font-black">POST</span> <span className="text-sky-300 font-semibold underline underline-offset-4 decoration-cyan-500/40">https://masdika.id/api/v1/shorten</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">-H</span> <span className="text-emerald-300 font-semibold">&quot;Authorization: Bearer YOUR_API_KEY&quot;</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">-H</span> <span className="text-emerald-300 font-semibold">&quot;Content-Type: application/json&quot;</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">-d</span> <span className="text-purple-300 font-semibold">&apos;&#123;</span></div>
                            <div>{"    "}<span className="text-sky-300">&quot;url&quot;</span>: <span className="text-emerald-300">&quot;https://example.com/very-long-marketing-url&quot;</span>,</div>
                            <div>{"    "}<span className="text-sky-300">&quot;alias&quot;</span>: <span className="text-emerald-300">&quot;summer-promo&quot;</span></div>
                            <div>{"  "}<span className="text-purple-300 font-semibold">&#125;&apos;</span></div>
                          </div>
                        )}
                        {activeCodeTab === "javascript" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">const</span> <span className="text-slate-100 font-semibold">res</span> = <span className="text-purple-400 font-bold">await</span> <span className="text-blue-300 font-semibold">fetch</span>(<span className="text-emerald-300 font-medium">&apos;https://masdika.id/api/v1/shorten&apos;</span>, &#123;</div>
                            <div>{"  "}method: <span className="text-emerald-400 font-bold">&apos;POST&apos;</span>,</div>
                            <div>{"  "}headers: &#123;</div>
                            <div>{"    "}<span className="text-emerald-300 font-medium">&apos;Authorization&apos;</span>: <span className="text-emerald-300 font-medium">&apos;Bearer YOUR_API_KEY&apos;</span>,</div>
                            <div>{"    "}<span className="text-emerald-300 font-medium">&apos;Content-Type&apos;</span>: <span className="text-emerald-300 font-medium">&apos;application/json&apos;</span></div>
                            <div>{"  "}&#125;,</div>
                            <div>{"  "}body: JSON.<span className="text-blue-300 font-semibold">stringify</span>(&#123;</div>
                            <div>{"    "}url: <span className="text-emerald-300 font-medium">&apos;https://example.com/very-long-marketing-url&apos;</span>,</div>
                            <div>{"    "}alias: <span className="text-emerald-300 font-medium">&apos;summer-promo&apos;</span></div>
                            <div>{"  "}&#125;)</div>
                            <div>&#125;);</div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">const</span> &#123; <span className="text-cyan-300 font-semibold">shortUrl</span>, <span className="text-cyan-300 font-semibold">qrCode</span> &#125; = <span className="text-purple-400 font-bold">await</span> <span className="text-slate-100">res</span>.<span className="text-blue-300 font-semibold">json</span>();</div>
                            <div>console.<span className="text-blue-300 font-semibold">log</span>(<span className="text-emerald-300 font-medium">&apos;Short Link:&apos;</span>, <span className="text-cyan-300 font-semibold">shortUrl</span>);</div>
                          </div>
                        )}
                        {activeCodeTab === "python" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">import</span> <span className="text-sky-300 font-bold">requests</span></div>
                            <div>&nbsp;</div>
                            <div><span className="text-slate-100 font-semibold">url</span> = <span className="text-emerald-300 font-medium">&quot;https://masdika.id/api/v1/shorten&quot;</span></div>
                            <div><span className="text-slate-100 font-semibold">headers</span> = &#123;</div>
                            <div>{"    "}<span className="text-emerald-300 font-medium">&quot;Authorization&quot;</span>: <span className="text-emerald-300 font-medium">&quot;Bearer YOUR_API_KEY&quot;</span>,</div>
                            <div>{"    "}<span className="text-emerald-300 font-medium">&quot;Content-Type&quot;</span>: <span className="text-emerald-300 font-medium">&quot;application/json&quot;</span></div>
                            <div>&#125;</div>
                            <div><span className="text-slate-100 font-semibold">payload</span> = &#123;<span className="text-emerald-300 font-medium">&quot;url&quot;</span>: <span className="text-emerald-300 font-medium">&quot;https://example.com/long-url&quot;</span>, <span className="text-emerald-300 font-medium">&quot;alias&quot;</span>: <span className="text-emerald-300 font-medium">&quot;summer-promo&quot;</span>&#125;</div>
                            <div>&nbsp;</div>
                            <div><span className="text-slate-100 font-semibold">res</span> = requests.<span className="text-blue-300 font-semibold">post</span>(url, headers=headers, json=payload)</div>
                            <div><span className="text-blue-300 font-semibold">print</span>(<span className="text-emerald-300 font-medium">&quot;Short Link:&quot;</span>, res.<span className="text-blue-300 font-semibold">json</span>()[<span className="text-emerald-300 font-medium">&quot;shortUrl&quot;</span>])</div>
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
                            <div>{"  "}<span className="text-slate-400 italic">// Shorten URL with sub-5ms Anycast routing</span></div>
                            <div>{"  "}fmt.<span className="text-blue-300 font-semibold">Println</span>(<span className="text-emerald-300 font-medium">&quot;Created -&gt; https://masdika.id/summer-promo&quot;</span>)</div>
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
                      <span className="font-bold text-emerald-400">HTTP 201 Created</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">&lt;5ms Edge Routing</span>
                    </div>

                    <div className="text-slate-200 font-medium flex items-center gap-1.5 overflow-x-auto text-[11px] sm:text-xs">
                      <span className="text-slate-400 shrink-0">Payload:</span>
                      <span className="text-cyan-300 font-bold bg-[#060d19] px-2 py-0.5 rounded border border-cyan-800/60 truncate max-w-[260px] sm:max-w-none">
                        &#123;&quot;status&quot;: 200, &quot;shortUrl&quot;: &quot;https://masdika.id/summer-promo&quot;&#125;
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
                    Instant Link Routing, Zero Friction
                  </h2>
                  <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 font-normal">
                    Designed for marketers and engineers who require high-concurrency redirect pipelines, automated custom domain provisioning, and detailed click telemetry without maintenance overhead.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Median Ping", value: "<5ms", sub: "Global Anycast Edge" },
                    { label: "Custom Domains", value: "Unlimited", sub: "Auto Free TLS Certs" },
                    { label: "Click Telemetry", value: "Real-time", sub: "Geo & UTM Tracking" },
                    { label: "Link Durability", value: "100%", sub: "Zero Unplanned Expiry" },
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

        {/* ── 3. ENTERPRISE CAPABILITIES (3 Equal Cards with Native Theme Variables) ────────── */}
        <section className="mb-20 lg:mb-28">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Engineered for Speed, Scale &amp; Trust
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Everything required to scale marketing campaigns, protect customer links, and integrate URL generation into production pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {[
              {
                icon: Zap,
                title: "Ultra-Fast Edge Redirects",
                desc: "Distributed routing nodes return instantaneous 301/302 headers to visitors, preserving SEO equity and ensuring zero load delay."
              },
              {
                icon: ShieldCheck,
                title: "Phishing & Bot Shielding",
                desc: "Real-time destination malware scanning, intelligent rate limiters, and TLS encryption protect visitors and preserve domain reputation."
              },
              {
                icon: BarChart2,
                title: "Deep Audience Analytics",
                desc: "Inspect visitor countries, device types, operating systems, and campaign UTM performance in real-time with zero sampling lag."
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

        {/* ── 4. PRICING PLANS SECTION (Consistent Native Theme Cards) ────────── */}
        {plans && plans.length > 0 && (
          <section id="pricing" className="mb-20 lg:mb-28 pt-10">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                TRANSPARENT PRICING
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                Simple, Predictable Link Tiers
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                Start with free link management, or unlock custom domains, unmetered redirects, and dedicated API keys.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
              {plans.map((plan, index) => {
                const isPopular = plan.isPopular;
                const specs = getPlanSpecs(plan);

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
                          {plan.description || "High-speed edge URL shortening & link routing."}
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
                          {specs.map((spec, i) => (
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
                              Sub-5ms Edge Redirects
                            </span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              Real-Time Click Telemetry
                            </span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              24/7 Monitoring &amp; Anti-DDoS
                            </span>
                          </li>
                        </ul>
                      </div>

                      <Button
                        variant={isPopular ? "primary" : "secondary"}
                        href={`/dashboard/checkout?service=SHORTENER&plan=${plan.id}`}
                        className="w-full justify-center"
                        leftIcon={<Rocket className="w-4 h-4" />}
                      >
                        Deploy Shortener
                      </Button>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 5. THREE-STEP WORKFLOW ────────── */}
        <section className="mb-20 lg:mb-28">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              DEPLOYMENT PROCESS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Go Live in 3 Simple Steps
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Create branded links or integrate API endpoints seamlessly with zero complex setup.
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
                title: "Input Destination URL",
                desc: "Paste your destination URL or API payload and specify a custom brand alias."
              },
              {
                step: "02",
                title: "Edge DNS Routing",
                desc: "Our Anycast edge network provisions automated routing records and fast SSL handshakes."
              },
              {
                step: "03",
                title: "Share & Track Live",
                desc: "Deploy your branded short link and observe real-time click telemetry in your dashboard."
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

        {/* ── 6. PROVISIONING TERMINAL & FAQ ────────── */}
        <ProvisioningSection 
          title="Instant Link Generation"
          description="Create branded short links in seconds. We automatically configure fast edge redirects and real-time analytics tracking."
          buttonText="Shorten a Link"
          buttonHref="/dashboard"
          logs={SHORTENER_LOGS}
          stats={SHORTENER_STATS}
          iconType="shortener"
        />

        <FaqSection faqs={SHORTENER_FAQS} />
      </div>
    </div>
  );
}
