"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Cloud, 
  Zap, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Globe, 
  CheckCircle2, 
  Server, 
  Layers, 
  RefreshCw, 
  Lock, 
  Sparkles, 
  Terminal, 
  Copy, 
  Check, 
  HardDrive, 
  Activity, 
  Rocket
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

const CDN_LOGS = [
  { time: "00:01", module: "INGEST", message: "Receiving multipart file payload via File CDN gateway..." },
  { time: "00:02", module: "ENCRYPT", message: "Applying AES-256 at-rest encryption & TLS 1.3 session..." },
  { time: "00:03", module: "BUCKET", message: "Provisioning isolated CDN space & generating REST API key..." },
  { time: "00:04", module: "EDGE", message: "Propagating edge delivery routes on Sidoarjo & IIX nodes..." },
  { time: "00:05", module: "READY", message: "curl -I https://www.masdika.id/api/v1/cdn/files/b8f9e0a2", isCommand: true },
];

const CDN_STATS = [
  { value: "<15ms", label: "MEDIAN TTFB" },
  { value: "AES-256", label: "AT-REST CIPHER" },
  { value: "PAYG", label: "HOURLY BILLING" },
  { value: "REST API", label: "BUCKET & KEYS" },
];

const CDN_FAQS = [
  {
    q: "How does Masdika File CDN work?",
    a: "Deploy an isolated File CDN space in seconds, upload static assets or files via dashboard or REST API, and distribute instant delivery links backed by enterprise SSD storage and low-latency Indonesian peering."
  },
  {
    q: "What encryption standards protect my uploaded assets?",
    a: "Every asset is protected in-transit using TLS 1.3 with forward secrecy, and encrypted at-rest using AES-256 bit keys inside your isolated CDN space."
  },
  {
    q: "Can I use Masdika File CDN as an image & static asset CDN for my web app?",
    a: "Yes! Our File CDN plans support persistent static asset hosting, instant delivery links, and direct IIX/OpenIX peering for sub-15ms delivery across Indonesia."
  },
  {
    q: "Is there a REST API for automated uploads?",
    a: "Absolutely. You can generate scoped File CDN API keys in your dashboard and upload files programmatically via standard multipart HTTP requests (cURL, fetch, Python, or Go) to /api/v1/cdn/upload."
  },
  {
    q: "How does Pay-As-You-Go (PAYG) billing work for File CDN?",
    a: "Your wallet is billed hourly based on your selected File CDN storage tier starting from Rp 15.000/month. You only pay for active hours and can scale or terminate anytime."
  },
  {
    q: "Why is local Indonesian peering beneficial for media delivery?",
    a: "Direct peering with the Indonesia Internet Exchange (IIX) and OpenIX guarantees ultra-low ping (<15ms) and fast local throughput for users across Java, Sumatra, Bali, and eastern Indonesia."
  }
];

const RAW_CODE = {
  curl: `curl -X POST https://www.masdika.id/api/v1/cdn/upload \\
  -H "x-api-key: YOUR_CDN_API_KEY" \\
  -F "file=@asset.png"`,
  javascript: `const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('https://www.masdika.id/api/v1/cdn/upload', {
  method: 'POST',
  headers: { 'x-api-key': 'YOUR_CDN_API_KEY' },
  body: formData
});

const { url, token } = await response.json();
console.log('CDN Link:', url);`,
  python: `import requests

url = "https://www.masdika.id/api/v1/cdn/upload"
headers = {"x-api-key": "YOUR_CDN_API_KEY"}

with open("asset.png", "rb") as f:
    response = requests.post(url, headers=headers, files={"file": f})

print("CDN Link:", response.json()["url"])`,
  go: `package main

import "fmt"

func main() {
    // Stream multipart payload directly to Masdika File CDN
    fmt.Println("Upload completed -> https://www.masdika.id/api/v1/cdn/files/b8f9e0a2")
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

export default function FileCdnClient({ 
  isEnabled = true, 
  initialPlans = [] 
}: { 
  isEnabled?: boolean; 
  initialPlans?: PlanItem[];
}) {
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "javascript" | "python" | "go">("curl");
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(RAW_CODE[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlanSpecs = (plan: PlanItem) => {
    try {
      if (!plan.limits) return [];
      const limits = typeof plan.limits === "string" ? JSON.parse(plan.limits) : plan.limits;
      const specs: string[] = [];
      if (limits.storageGB) specs.push(`${limits.storageGB} GB Edge Storage`);
      if (limits.transferGB) specs.push(`${limits.transferGB} GB Monthly Bandwidth`);
      if (limits.requests && limits.requests !== "unlimited") {
        specs.push(`${limits.requests.toString().toUpperCase()} Monthly Requests`);
      } else {
        specs.push("Unlimited Ingestion Requests");
      }
      return specs;
    } catch {
      return ["Edge CDN Caching", "Global Anycast Delivery"];
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-28 sm:pt-36 md:pt-40 pb-10 sm:pb-14 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Home Page, Vacancies & design.md) ────────── */}
        <section className="relative pt-0 pb-8 sm:pb-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start w-full">
            
            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30 lg:pt-20">
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  GLOBAL EDGE FILE CDN &amp; ASSET DELIVERY
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page & design.md) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Fast File Delivery <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  &amp; Edge File CDN.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Deploy isolated File CDN spaces with AES-256 encrypted edge storage, instant delivery links, and scoped REST API keys across Indonesia with sub-15ms IIX peering.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href={isEnabled ? "/dashboard/cdn/new" : "#pricing"}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isEnabled ? "Deploy File CDN" : "View CDN Plans"}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#pricing"
                  leftIcon={<Cloud className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  View Pricing
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar (file-cdn.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0 lg:self-center">
              <HeroAvatarFrame
                imageSrc="/images/mascots/file-cdn.webp"
                imageAlt="Masdika Edge CDN & Temporary Storage"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Globe, label: "Anycast Edge", value: "Sub-15ms Edge Ping" },
                  { icon: ShieldCheck, label: "Data Privacy", value: "AES-256 & TLS 1.3" },
                  { icon: Clock, label: "Auto-Scrubbing", value: "Zero-Trace Expiry" },
                  { icon: Zap, label: "Fast Ingestion", value: "100MB Direct Ingest" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights, Equal Height & Native CSS Variables) ────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { 
                icon: Globe, 
                title: "Sub-15ms Indonesia Edge", 
                desc: "Direct peering with IIX and OpenIX guarantees instant media delivery with zero foreign transit hops." 
              },
              { 
                icon: Clock, 
                title: "Zero-Trace Auto-Scrub", 
                desc: "Set granular link lifetimes. Expired payloads are automatically shredded at disk level with zero residue." 
              },
              { 
                icon: Terminal, 
                title: "Developer REST & cURL", 
                desc: "Upload files with a single command or API call. Receive structured JSON responses with signed URLs." 
              },
              { 
                icon: ShieldCheck, 
                title: "Enterprise Shielding", 
                desc: "DDoS-mitigated infrastructure backed by redundant enterprise SSD arrays and high-availability Anycast." 
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
        <section className="py-10 sm:py-14 relative z-10">
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
                        bash — upload.sh
                      </span>
                    </div>

                    {/* Copy Button in Header Bar - Never overlaps code on mobile */}
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
                      POST /api/v1/upload
                    </span>
                  </div>

                  {/* Code Body with Sleek Subtle Scrollbar & Zero Overlap */}
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
                          </>
                        )}
                      </div>

                      {/* Code Content */}
                      <div className="flex-1 min-w-0 font-mono text-slate-100 selection:bg-cyan-500/30 whitespace-pre">
                        {activeCodeTab === "curl" && (
                          <div>
                            <div><span className="text-cyan-400 font-bold">curl</span> <span className="text-amber-300 font-bold">-X</span> <span className="text-emerald-400 font-black">POST</span> <span className="text-sky-300 font-semibold underline underline-offset-4 decoration-cyan-500/40">https://cdn.masdika.id/api/v1/upload</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">-H</span> <span className="text-emerald-300 font-semibold">&quot;Authorization: Bearer YOUR_API_KEY&quot;</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">-F</span> <span className="text-emerald-300 font-semibold">&quot;file=@asset.png&quot;</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">-F</span> <span className="text-emerald-300 font-semibold">&quot;expires_in=24h&quot;</span></div>
                          </div>
                        )}
                        {activeCodeTab === "javascript" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">const</span> <span className="text-slate-100 font-semibold">formData</span> = <span className="text-purple-400 font-bold">new</span> <span className="text-sky-300 font-bold">FormData</span>();</div>
                            <div><span className="text-slate-100">formData</span>.<span className="text-blue-300 font-semibold">append</span>(<span className="text-emerald-300 font-medium">&apos;file&apos;</span>, fileInput.files[<span className="text-amber-300 font-bold">0</span>]);</div>
                            <div><span className="text-slate-100">formData</span>.<span className="text-blue-300 font-semibold">append</span>(<span className="text-emerald-300 font-medium">&apos;expires_in&apos;</span>, <span className="text-emerald-300 font-medium">&apos;24h&apos;</span>);</div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">const</span> <span className="text-slate-100 font-semibold">res</span> = <span className="text-purple-400 font-bold">await</span> <span className="text-blue-300 font-semibold">fetch</span>(<span className="text-emerald-300 font-medium">&apos;https://cdn.masdika.id/api/v1/upload&apos;</span>, &#123;</div>
                            <div>{"  "}method: <span className="text-emerald-400 font-bold">&apos;POST&apos;</span>,</div>
                            <div>{"  "}headers: &#123; <span className="text-emerald-300 font-medium">&apos;Authorization&apos;</span>: <span className="text-emerald-300 font-medium">&apos;Bearer YOUR_API_KEY&apos;</span> &#125;,</div>
                            <div>{"  "}body: <span className="text-slate-100">formData</span></div>
                            <div>&#125;);</div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">const</span> &#123; <span className="text-cyan-300 font-semibold">downloadUrl</span> &#125; = <span className="text-purple-400 font-bold">await</span> <span className="text-slate-100">res</span>.<span className="text-blue-300 font-semibold">json</span>();</div>
                            <div>console.<span className="text-blue-300 font-semibold">log</span>(<span className="text-emerald-300 font-medium">&apos;CDN Link:&apos;</span>, <span className="text-cyan-300 font-semibold">downloadUrl</span>);</div>
                          </div>
                        )}
                        {activeCodeTab === "python" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">import</span> <span className="text-sky-300 font-bold">requests</span></div>
                            <div>&nbsp;</div>
                            <div><span className="text-slate-100 font-semibold">url</span> = <span className="text-emerald-300 font-medium">&quot;https://cdn.masdika.id/api/v1/upload&quot;</span></div>
                            <div><span className="text-slate-100 font-semibold">headers</span> = &#123;<span className="text-emerald-300 font-medium">&quot;Authorization&quot;</span>: <span className="text-emerald-300 font-medium">&quot;Bearer YOUR_API_KEY&quot;</span>&#125;</div>
                            <div><span className="text-slate-100 font-semibold">data</span> = &#123;<span className="text-emerald-300 font-medium">&quot;expires_in&quot;</span>: <span className="text-emerald-300 font-medium">&quot;24h&quot;</span>&#125;</div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">with</span> <span className="text-blue-300 font-semibold">open</span>(<span className="text-emerald-300 font-medium">&quot;asset.png&quot;</span>, <span className="text-emerald-300 font-medium">&quot;rb&quot;</span>) <span className="text-purple-400 font-bold">as</span> <span className="text-slate-100">f</span>:</div>
                            <div>{"  "}<span className="text-slate-100 font-semibold">res</span> = requests.<span className="text-blue-300 font-semibold">post</span>(url, headers=headers, files=&#123;<span className="text-emerald-300 font-medium">&quot;file&quot;</span>: f&#125;, data=data)</div>
                            <div>&nbsp;</div>
                            <div><span className="text-blue-300 font-semibold">print</span>(<span className="text-emerald-300 font-medium">&quot;CDN Link:&quot;</span>, res.<span className="text-blue-300 font-semibold">json</span>()[<span className="text-emerald-300 font-medium">&quot;downloadUrl&quot;</span>])</div>
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
                            <div>{"  "}<span className="text-slate-400 italic">// Stream multipart payload directly to Sidoarjo edge</span></div>
                            <div>{"  "}fmt.<span className="text-blue-300 font-semibold">Println</span>(<span className="text-emerald-300 font-medium">&quot;Upload completed -&gt; https://cdn.masdika.id/dl/b8f9e0a2&quot;</span>)</div>
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
                      <span className="text-slate-300">24h Auto-Expiry</span>
                    </div>

                    <div className="text-slate-200 font-medium flex items-center gap-1.5 overflow-x-auto text-[11px] sm:text-xs">
                      <span className="text-slate-400 shrink-0">Payload:</span>
                      <span className="text-cyan-300 font-bold bg-[#060d19] px-2 py-0.5 rounded border border-cyan-800/60 truncate max-w-[260px] sm:max-w-none">
                        &#123;&quot;status&quot;: 200, &quot;link&quot;: &quot;cdn.masdika.id/dl/...&quot;&#125;
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
                    Instant Ingestion, Zero Complexity
                  </h2>
                  <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 font-normal">
                    Designed for developers who need robust temporary media hosting, automated CI/CD artifact sharing, and high-performance edge CDN delivery without configuring complex cloud storage buckets.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Edge Hit Ratio", value: "99.4%", sub: "Cached at Sidoarjo DC" },
                    { label: "Median TTFB", value: "<12ms", sub: "Direct IIX Peering" },
                    { label: "Max File Size", value: "100 MB", sub: "Per Direct Upload" },
                    { label: "Link Expiration", value: "Custom", sub: "Auto-Scrubbed TTL" },
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
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Engineered for Speed &amp; Privacy
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Everything you need to deliver content across Indonesia with maximum security and zero bandwidth limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {[
              {
                icon: Globe,
                title: "Anycast Edge Routing",
                desc: "Incoming requests are automatically routed to the nearest Indonesian edge point of presence, eliminating latency and packet drops."
              },
              {
                icon: Lock,
                title: "Granular Access Security",
                desc: "Protect sensitive files with optional passcodes, download quotas, and automatic single-use link invalidation."
              },
              {
                icon: Sparkles,
                title: "Automated Optimization",
                desc: "Images and static payloads are served with Gzip & Brotli compression and intelligent caching headers for peak client performance."
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
        {initialPlans && initialPlans.length > 0 && (
          <section id="pricing" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                TRANSPARENT PRICING
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                Simple, Predictable CDN Tiers
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                Start with free temporary sharing, or unlock persistent storage and unmetered edge delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
              {initialPlans.map((plan, index) => {
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
                          {plan.description || "High-speed edge CDN content distribution."}
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
                              Sub-15ms Indonesia Anycast
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

                      {isEnabled ? (
                        <Button
                          variant={isPopular ? "primary" : "secondary"}
                          href={`/dashboard/checkout?service=CDN&plan=${plan.id}`}
                          className="w-full justify-center"
                          leftIcon={<Rocket className="w-4 h-4" />}
                        >
                          Deploy CDN Node
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled
                          className="w-full justify-center opacity-60 cursor-not-allowed"
                        >
                          Coming Soon
                        </Button>
                      )}
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 5. THREE-STEP WORKFLOW ────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              DISTRIBUTION WORKFLOW
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Go Live in 3 Simple Steps
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Zero configuration required. Ingest your asset and let our distributed edge cache handle the rest.
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
                title: "Upload Payload",
                desc: "Upload media or temporary files up to 100MB via browser UI, cURL, or our REST API with custom TTL."
              },
              {
                step: "02",
                title: "Edge Replication",
                desc: "Your payload is encrypted with AES-256 and instantaneously propagated to local Indonesian Anycast edge nodes."
              },
              {
                step: "03",
                title: "Instant Secure Delivery",
                desc: "Receive an accelerated download link with sub-15ms TTFB that auto-destructs upon window expiration."
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
          title="Instant File CDN Distribution"
          description="Deploy isolated File CDN spaces and instantly distribute assets with encrypted edge storage, delivery links, and REST API keys."
          buttonText="Deploy File CDN"
          buttonHref="/dashboard/cdn/new"
          logs={CDN_LOGS}
          stats={CDN_STATS}
          iconType="file-cdn"
          terminalTitle="FILE CDN CLUSTER"
          targetServer="Edge CDN Cluster • Sidoarjo DC"
          provisionEstimate="Backend: Encrypted SSD Edge Storage (< 5 Sec)"
        />

        <FaqSection faqs={CDN_FAQS} />

      </div>
    </div>
  );
}
