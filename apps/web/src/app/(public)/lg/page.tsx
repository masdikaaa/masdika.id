"use client";

import { useState, useRef, useEffect } from "react";
import { Server, Globe, Download, Activity, CheckCircle2, ChevronRight, Play, Terminal, Code2, UploadCloud, Link2, FlaskConical, Copy, Check } from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/animations/FadeIn";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function LookingGlassPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [testType, setTestType] = useState<"ping" | "mtr" | "traceroute">("ping");
  const [host, setHost] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
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
    { title: "API Hub", desc: "Discover and test public REST APIs for your projects.", path: "/dashboard/api-lab", icon: FlaskConical },
    { title: "File CDN", desc: "Securely upload temporary files up to 100MB.", path: "/dashboard/cdn", icon: UploadCloud },
    { title: "URL Shortener", desc: "Create premium short links with custom aliases.", path: "/dashboard/shortener", icon: Link2 },
    { title: "Cloud VPS", desc: "High-performance virtual private servers with high-speed storage.", path: "/dashboard/vps", icon: Terminal },
    { title: "Kubernetes (K3s)", desc: "Lightweight, fully managed Kubernetes clusters.", path: "/dashboard/k3s", icon: SiKubernetes },
    { title: "Reseller API", desc: "Integrate our services into your own platform programmatically.", path: "/dashboard/reseller-api", icon: Code2 },
  ];

  const testFiles = [
    { size: "50MB", val: 50 },
    { size: "100MB", val: 100 },
    { size: "500MB", val: 500 },
    { size: "1000MB", val: 1000 },
  ];

  return (
    <div className={cn("pt-24 md:pt-32 pb-20 px-4 font-sans overflow-hidden relative min-h-screen bg-transparent", isDark ? "text-white selection:bg-cyan-500/30" : "text-slate-900 selection:bg-cyan-100")}>
      <main className="relative z-10 max-w-[1400px] mx-auto">
        
        {/* Hero Section */}
        <section className="pt-10 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center relative z-30">
          <FadeIn direction="up">
            <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-8 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "border-cyan-200 bg-cyan-50 text-cyan-700")}>
              MASDIKA ROUTEGLASS
            </div>
            <h1 className={cn("text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
              Network Routing & <br className="hidden md:block" />
              <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Looking Glass</span>
            </h1>
            <p className={cn("text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              Check our server network latency, routing paths, and download performance in real-time from our Sidoarjo data center.
            </p>
          </FadeIn>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-6">
          {/* Main Content (Left) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Server Info */}
              <div className={cn("sm:col-span-2 xl:col-span-1 border rounded-2xl p-6 flex flex-col justify-center", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-xl shadow-black/40" : "bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow")}>
                <h3 className={cn("text-sm font-bold tracking-widest uppercase mb-4 flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-600")}>
                  <Server className="w-4 h-4" /> Server Info
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>Location:</span>
                    <span className={cn("text-right truncate", isDark ? "text-zinc-300" : "text-slate-700 font-medium")}>Sidoarjo</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>ASN:</span>
                    <a href="https://bgp.he.net/AS63859" target="_blank" rel="noopener noreferrer" className={cn("text-right transition-colors border-b border-dashed", isDark ? "text-zinc-300 border-zinc-600 hover:text-cyan-400 hover:border-cyan-400" : "text-slate-700 border-slate-300 hover:text-cyan-600 hover:border-cyan-600 font-medium")}>AS63859</a>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>Test IPv4:</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-right font-mono text-sm", isDark ? "text-zinc-300" : "text-slate-700 font-medium")}>45.198.149.134</span>
                      <button onClick={() => handleCopy("45.198.149.134")} className={cn("p-1.5 rounded-md opacity-100 transition-all shrink-0", isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-black/5 text-slate-400")} title="Copy IP">
                        {copiedIp === "45.198.149.134" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>Test IPv6:</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("text-right font-mono text-xs sm:text-sm truncate", isDark ? "text-zinc-300" : "text-slate-700 font-medium")}>2402:8780:1600::237:8000:e4</span>
                      <button onClick={() => handleCopy("2402:8780:1600::237:8000:e4")} className={cn("p-1.5 rounded-md opacity-100 transition-all shrink-0", isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-black/5 text-slate-400")} title="Copy IPv6">
                        {copiedIp === "2402:8780:1600::237:8000:e4" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Your IP Address */}
              <div className={cn("sm:col-span-1 border rounded-2xl p-6 flex flex-col items-center justify-center text-center", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-xl shadow-black/40" : "bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow")}>
                <p className={cn("text-sm font-bold mb-2 tracking-widest uppercase", isDark ? "text-zinc-500" : "text-slate-500")}>Your IP Address</p>
                <div className="flex items-center justify-center gap-2 w-full min-w-0">
                  <p className={cn("text-lg sm:text-xl font-mono font-bold truncate", isDark ? "text-cyan-400" : "text-cyan-600")}>{clientIp}</p>
                  {clientIp !== "Loading..." && clientIp !== "Unknown" && (
                    <button onClick={() => handleCopy(clientIp)} className={cn("p-1.5 rounded-md opacity-100 transition-all shrink-0", isDark ? "hover:bg-white/10 text-cyan-400" : "hover:bg-black/5 text-cyan-600")} title="Copy Your IP">
                      {copiedIp === clientIp ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
                
              {/* Test Files */}
              <div className={cn("sm:col-span-1 border rounded-2xl p-6 flex flex-col justify-center", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-xl shadow-black/40" : "bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow")}>
                <h3 className={cn("text-sm font-bold tracking-widest uppercase mb-4 flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-600")}>
                  <Download className="w-4 h-4" /> Test Files
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {testFiles.map((file) => (
                    <a
                      key={file.size}
                      href={`/api/lg/test-file?size=${file.val}`}
                      className={cn("text-xs border py-2.5 rounded-xl transition-all flex items-center justify-center font-bold", isDark ? "bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 border-cyan-500/20 shadow-sm" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}
                    >
                      {file.size}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Network Test Module */}
            <div className={cn("border rounded-2xl p-1", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-xl shadow-black/40" : "bg-white border-slate-200 shadow-sm")}>
              <div className={cn("rounded-xl p-4 sm:p-6 border", isDark ? "bg-[#091122] border-slate-700/60" : "bg-slate-50 border-slate-200")}>
                <h3 className={cn("text-base sm:text-lg font-bold mb-4 sm:mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Activity className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Network Test
                </h3>
                
                {/* Test Tabs */}
                <div className={cn("grid grid-cols-3 gap-1 rounded-lg p-1 mb-4 sm:mb-6 border", isDark ? "bg-black/40 border-white/5" : "bg-white border-black/5 shadow-inner")}>
                  {(["ping", "mtr", "traceroute"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTestType(type)}
                      className={cn("py-2 sm:py-2.5 text-[10px] sm:text-sm font-semibold rounded-md uppercase tracking-wider transition-all truncate px-1", 
                        testType === type 
                          ? "bg-cyan-400 text-slate-950 font-semibold shadow-sm"
                          : (isDark ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <Globe className={cn("w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
                    </div>
                    <input 
                      type="text" 
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRunTest()}
                      placeholder="IP address or hostname"
                      className={cn("w-full border rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-sm sm:text-base focus:outline-none transition-colors", isDark ? "bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 shadow-sm")}
                      disabled={isRunning}
                    />
                  </div>
                  <Button 
                    onClick={handleRunTest}
                    disabled={isRunning || !host.trim()}
                    loading={isRunning}
                    variant="primary"
                    size="md"
                    leftIcon={<Play className="w-4 h-4" />}
                    className="w-full sm:w-auto shrink-0"
                  >
                    Run Test
                  </Button>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border", 
                    isRunning 
                      ? (isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200')
                      : output 
                        ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                        : (isDark ? 'bg-zinc-500/10 text-zinc-400 border-white/5' : 'bg-slate-50 text-slate-500 border-black/10')
                  )}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {isRunning ? "Testing in progress..." : output ? "Ready." : "Awaiting input..."}
                  </div>
                </div>

                {/* Terminal Output */}
                <div className="relative group mt-2">
                  <div className={cn("absolute inset-0 blur-xl opacity-0 transition-opacity duration-500 rounded-xl pointer-events-none", isDark ? "bg-cyan-500/15 group-hover:opacity-100" : "")} />
                  <div 
                    ref={terminalRef}
                    className={cn("relative border rounded-xl p-3 sm:p-5 h-[300px] sm:h-[350px] overflow-y-auto overflow-x-hidden font-mono text-[10px] sm:text-xs md:text-sm shadow-inner", isDark ? "bg-black border-white/10 text-green-400" : "bg-slate-800 border-slate-700 text-green-400")}
                  >
                    {!output && (
                      <div className={cn(isDark ? "text-zinc-600" : "text-slate-400")}>
                        <p># RouteGlass Terminal initialized.</p>
                        <p># Example: ping 8.8.8.8</p>
                        <p># Select a test type above and enter an IP address.</p>
                        <p className="mt-4 animate-pulse">_</p>
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap break-all sm:break-words leading-relaxed">{output}</pre>
                    {isRunning && <span className="animate-pulse inline-block w-2 h-3 sm:h-4 bg-green-400 ml-1 translate-y-1"></span>}
                  </div>
                </div>
                
              </div>
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div className="lg:col-span-4">
            <div className={cn("border rounded-2xl p-6 sticky top-32", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-xl shadow-black/40" : "bg-white border-slate-200 shadow-sm")}>
              <h3 className={cn("text-lg font-bold mb-6 border-b pb-4", isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-200")}>Product Information</h3>
              <div className="space-y-2">
                {productLinks.map((product, idx) => (
                  <Link 
                    key={idx}
                    href={product.path}
                    className={cn("group flex items-center justify-between p-3 rounded-xl border transition-all", isDark ? "hover:bg-white/5 border-transparent hover:border-white/5" : "hover:bg-slate-50 border-transparent hover:border-slate-200")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                        <product.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={cn("text-sm font-bold transition-colors", isDark ? "text-zinc-200 group-hover:text-cyan-400" : "text-slate-700 group-hover:text-cyan-600")}>{product.title}</h4>
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>{product.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-colors", isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600")} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
