"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Server, 
  Globe, 
  Download, 
  Activity, 
  ChevronRight, 
  Play, 
  Terminal, 
  Code2, 
  UploadCloud, 
  Link2, 
  FlaskConical, 
  Copy, 
  Check, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Radio,
  Cpu
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { cn } from "@/lib/utils";

export default function LookingGlassPage() {
  const [testType, setTestType] = useState<"ping" | "mtr" | "traceroute">("ping");
  const [host, setHost] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleCopyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const [clientIp, setClientIp] = useState("Loading...");

  useEffect(() => {
    // Fetch user's public IP natively from client side
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => setClientIp(data.ip))
      .catch(() => setClientIp("Unknown"));
  }, []);

  useEffect(() => {
    // Auto scroll terminal to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const handleRunTest = async () => {
    if (!host.trim()) return;
    
    setIsRunning(true);
    setOutput(`Running ${testType.toUpperCase()} to ${host}...\n\n`);
    
    try {
      const res = await fetch("/api/lg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: testType, host: host.trim() }),
      });
      
      if (!res.body) throw new Error("No response body");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (error: any) {
      setOutput((prev) => prev + `\nError: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const productLinks = [
    { title: "API Hub", desc: "Discover and test public REST APIs for your projects.", path: "/api-hub", icon: FlaskConical },
    { title: "File CDN", desc: "Securely upload temporary files up to 100MB.", path: "/file-cdn", icon: UploadCloud },
    { title: "URL Shortener", desc: "Create premium short links with custom aliases.", path: "/shortener", icon: Link2 },
    { title: "Cloud VPS", desc: "High-performance virtual private servers with SSD.", path: "/vps", icon: Terminal },
    { title: "Kubernetes (K3s)", desc: "Lightweight, fully managed Kubernetes clusters.", path: "/k3s", icon: SiKubernetes },
    { title: "Reseller API", desc: "Integrate our cloud provisioning programmatically.", path: "/reseller-api", icon: Code2 },
  ];

  const testFiles = [
    { size: "50MB", val: 50 },
    { size: "100MB", val: 100 },
    { size: "500MB", val: 500 },
    { size: "1000MB", val: 1000 },
  ];

  const peeringLocations = [
    { name: "OpenIXP (Jakarta)", type: "Direct Peering", latency: "< 8ms", status: "Active" },
    { name: "CDIX (Surabaya)", type: "Local Peering", latency: "< 1ms", status: "Active" },
    { name: "IIX (APJII)", type: "National IXP", latency: "< 6ms", status: "Active" },
    { name: "Equinix SG1", type: "Tier-1 Transit", latency: "< 18ms", status: "Active" },
  ];

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 font-sans">
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">
        
        {/* ── 0. HERO (Identik Patokan SLA, Terms, Privacy, Events, Vacancies & design.md) ────────── */}
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
                <Badge variant="brand" dot dotColor="bg-cyan-400" size="md" className="font-mono uppercase">
                  NETWORK ROUTEGLASS &amp; BGP
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page, SLA, Privacy, Terms) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Network Routing &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Looking Glass.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Inspect our global routing paths, test live BGP latency, and benchmark real-time download performance directly from our Sidoarjo Edge Datacenter.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#lg-tools"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Run Diagnostics
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="https://bgp.he.net/AS63859"
                  target="_blank"
                  rel="noopener noreferrer"
                  leftIcon={<Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  AS63859 BGP Peering
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (looking-glass.webp) with Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-6 lg:mt-0"
            >
              <HeroAvatarFrame
                imageSrc="/looking-glass.webp"
                imageAlt="Masdika – Network Routing & Looking Glass"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Activity, label: "Direct JX Edge", value: "< 1ms Latency" },
                  { icon: Globe, label: "BGP Peering", value: "AS63859 Direct" },
                  { icon: Zap, label: "Backbone Uplink", value: "10 Gbps Redundant" },
                  { icon: Server, label: "Datacenter PoP", value: "Sidoarjo, ID" },
                ]}
              />
            </motion.div>

          </div>
        </section>

        {/* ── 1. DIAGNOSTICS & TELEMETRY SUITE ──────────────────── */}
        <section id="lg-tools" className="scroll-mt-28 pt-8 sm:pt-12 mb-20">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              LIVE NETWORK TELEMETRY
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight leading-[1.15] mb-4">
              Real-Time Edge Diagnostic Suite
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] font-normal leading-relaxed">
              Execute live ICMP ping tests, trace BGP routing hops, and benchmark file throughput directly from our primary Sidoarjo, ID edge router.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8 Cols – Info Cards + Interactive Diagnostic Terminal */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Quick Info Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                
                {/* 1. Server Info */}
                <div className="sm:col-span-2 xl:col-span-1 bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-5 sm:p-6 shadow-sm hover:border-cyan-500/40 hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <Server className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Core Node Info
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--text-secondary)] shrink-0 font-medium">Location:</span>
                        <span className="text-right font-bold text-[var(--text-primary)] truncate">Sidoarjo, ID</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--text-secondary)] shrink-0 font-medium">ASN:</span>
                        <a 
                          href="https://bgp.he.net/AS63859" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-right font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline transition-colors"
                        >
                          AS63859
                        </a>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--text-secondary)] shrink-0 font-medium">Test IPv4:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">45.198.149.134</span>
                          <button 
                            onClick={() => handleCopy("45.198.149.134")} 
                            className="p-1 rounded-md text-[var(--text-muted)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-[var(--surface-secondary)] transition-all shrink-0" 
                            title="Copy IPv4"
                          >
                            {copiedIp === "45.198.149.134" ? <Check className="w-3.5 h-3.5 text-cyan-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--text-secondary)] shrink-0 font-medium">Test IPv6:</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[11px] font-bold text-[var(--text-primary)] truncate max-w-[130px] sm:max-w-none">2402:8780:1600::237</span>
                          <button 
                            onClick={() => handleCopy("2402:8780:1600::237:8000:e4")} 
                            className="p-1 rounded-md text-[var(--text-muted)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-[var(--surface-secondary)] transition-all shrink-0" 
                            title="Copy IPv6"
                          >
                            {copiedIp === "2402:8780:1600::237:8000:e4" ? <Check className="w-3.5 h-3.5 text-cyan-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Client IP Address */}
                <div className="sm:col-span-1 bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-5 sm:p-6 shadow-sm hover:border-cyan-500/40 hover:shadow-md transition-all flex flex-col justify-between text-center">
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Your Connection IP
                      </h3>
                    </div>

                    <div className="my-3 flex items-center justify-center gap-2">
                      <p className="text-lg sm:text-xl font-mono font-black text-cyan-600 dark:text-cyan-400 tracking-tight truncate">
                        {clientIp}
                      </p>
                      {clientIp !== "Loading..." && clientIp !== "Unknown" && (
                        <button 
                          onClick={() => handleCopy(clientIp)} 
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-[var(--surface-secondary)] transition-all shrink-0" 
                          title="Copy Your IP"
                        >
                          {copiedIp === clientIp ? <Check className="w-4 h-4 text-cyan-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    Detected via real-time client TCP handshake.
                  </p>
                </div>
                  
                {/* 3. Download Benchmark Files */}
                <div className="sm:col-span-1 bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-5 sm:p-6 shadow-sm hover:border-cyan-500/40 hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Speedtest Files
                      </h3>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                      Benchmark direct download throughput:
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {testFiles.map((file) => (
                        <a
                          key={file.size}
                          href={`/api/lg/test-file?size=${file.val}`}
                          className="py-2 px-3 rounded-xl bg-[var(--surface-secondary)] hover:bg-cyan-500/10 text-[var(--text-primary)] hover:text-cyan-600 dark:hover:text-cyan-400 border border-[var(--border-subtle)] hover:border-cyan-500/30 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm group"
                        >
                          <Download className="w-3 h-3 text-[var(--text-muted)] group-hover:text-cyan-500 transition-colors" />
                          <span>{file.size}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Network Test Terminal Module */}
              <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6 w-full max-w-full overflow-hidden">
                
                {/* Module Header with Live Status Indicator */}
                <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-[var(--border-primary)] pb-4 sm:pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-xl font-black text-[var(--text-primary)] tracking-tight">
                        Interactive Diagnostic Probe
                      </h3>
                      <p className="text-[11px] sm:text-sm text-[var(--text-secondary)]">
                        Test ICMP ping reachability, traceroute hops, and MTR telemetry.
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)]">
                    <span className={cn("w-2 h-2 rounded-full", isRunning ? "bg-cyan-400 animate-pulse" : output ? "bg-cyan-400" : "bg-slate-400")} />
                    <span>{isRunning ? "DIAGNOSTIC IN PROGRESS" : output ? "COMMAND COMPLETED" : "AWAITING TARGET"}</span>
                  </div>
                </div>
                
                {/* Protocol Tabs (Ping, MTR, Traceroute) */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] w-full sm:max-w-md">
                  {(["ping", "mtr", "traceroute"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTestType(type)}
                      className={cn(
                        "flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-mono font-bold rounded-lg uppercase tracking-wider transition-all text-center",
                        testType === type 
                          ? "bg-[var(--surface)] text-cyan-600 dark:text-cyan-400 shadow-sm border border-[var(--border-primary)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Target Input and Action Button */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Globe className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <input 
                      type="text" 
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRunTest()}
                      placeholder="e.g. 1.1.1.1, google.com, or your IP"
                      className="w-full bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-xs sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 font-mono transition-all shadow-inner"
                      disabled={isRunning}
                    />
                  </div>
                  <Button 
                    onClick={handleRunTest}
                    disabled={isRunning || !host.trim()}
                    loading={isRunning}
                    variant="primary"
                    size="md"
                    leftIcon={<Play className="w-4 h-4 fill-current" />}
                    className="w-full sm:w-auto shrink-0 font-mono font-bold"
                  >
                    Run Test
                  </Button>
                </div>

                {/* Developer Terminal Box */}
                <div 
                  className="relative rounded-2xl overflow-hidden border border-slate-700/60 dark:border-slate-800 shadow-2xl w-full"
                  style={{ backgroundColor: "#060d19" }}
                >
                  {/* Terminal Header Bar */}
                  <div 
                    className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800/60 text-xs font-mono select-none gap-2"
                    style={{ backgroundColor: "#0c1425" }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                      </div>
                      <span className="ml-1 text-slate-200 font-mono font-medium text-[11px] sm:text-sm tracking-tight truncate">
                        masdika@sidoarjo-edge:~$ {testType} {host ? host : "8.8.8.8"}
                      </span>
                    </div>

                    {output && (
                      <button
                        onClick={handleCopyOutput}
                        title={copiedOutput ? "Copied to clipboard" : "Copy terminal output"}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-mono font-bold !text-white bg-slate-800 hover:bg-slate-700 border border-slate-600/80 hover:border-cyan-400/60 transition-all shrink-0 active:scale-95 shadow-md group"
                        style={{ color: "#ffffff" }}
                      >
                        {copiedOutput ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" style={{ color: "#34d399" }} />
                            <span className="font-bold hidden sm:inline !text-emerald-400" style={{ color: "#34d399" }}>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 shrink-0" style={{ color: "#22d3ee" }} />
                            <span className="font-bold tracking-wide hidden sm:inline !text-white group-hover:!text-cyan-200" style={{ color: "#ffffff" }}>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Terminal Content Screen */}
                  <div 
                    ref={terminalRef}
                    className="p-3.5 sm:p-6 h-[340px] sm:h-[400px] overflow-y-auto overflow-x-auto font-mono text-[11px] sm:text-xs md:text-sm text-slate-100 leading-relaxed selection:bg-cyan-500/30 custom-scrollbar"
                  >
                    {!output && (
                      <div className="space-y-1.5 sm:space-y-2 text-slate-400 font-mono text-[11px] sm:text-xs md:text-sm">
                        <p className="text-cyan-400 font-bold"># Masdika Looking Glass Telemetry v2.4 (AS63859)</p>
                        <p># Edge Router Location: Sidoarjo Datacenter, East Java, Indonesia</p>
                        <p># Enter a remote IP or domain above and click &quot;Run Test&quot;.</p>
                        <p className="text-cyan-300 mt-4">$ _</p>
                      </div>
                    )}
                    <pre className="font-mono text-[11px] sm:text-xs md:text-sm text-slate-100 leading-relaxed whitespace-pre font-normal inline-block min-w-full">{output}</pre>
                    {isRunning && <span className="animate-pulse inline-block w-2 h-4 bg-cyan-400 ml-1 translate-y-0.5" />}
                  </div>
                </div>
                
              </div>
            </div>

            {/* Right 4 Cols – Sticky Sidebar (Product Ecosystem & Direct Peering) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
              
              {/* Product Ecosystem Card */}
              <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-[var(--border-primary)] pb-4 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Masdika Cloud Products
                  </h3>
                </div>

                <div className="space-y-1.5">
                  {productLinks.map((product, idx) => (
                    <Link 
                      key={idx}
                      href={product.path}
                      className="group flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg border border-cyan-200/80 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <product.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                            {product.title}
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {product.desc}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Direct Peering & Upstream Telemetry Card */}
              <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-[var(--border-primary)] pb-4 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    IXP &amp; Upstream Telemetry
                  </h3>
                </div>

                <div className="space-y-3">
                  {peeringLocations.map((loc) => (
                    <div key={loc.name} className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{loc.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{loc.type}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{loc.latency}</span>
                        <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold flex items-center justify-end gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                          <span>{loc.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
