"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, Play, Key, AlertCircle, CheckCircle2, ChevronRight, Terminal, RefreshCw, Loader2, Lock, Activity } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Copy } from 'lucide-react';

export default function ApiLabClient({ project }: { project: any }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [userKeys, setUserKeys] = useState<any[]>([]);
  const [selectedKeyIndex, setSelectedKeyIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestBody, setRequestBody] = useState(() => {
    if (project.slug === "shortener") {
      return '{\n  "url": "https://example.com"\n}';
    } else if (project.slug === "youtube-downloader") {
      return '{\n  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"\n}';
    } else if (project.slug === "tiktok-downloader") {
      return '{\n  "url": "https://www.tiktok.com/@tiktok/video/7106594312292453678"\n}';
    } else if (project.slug === "spotify-downloader") {
      return '{\n  "url": "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"\n}';
    }
    return "{}";
  });
  const [response, setResponse] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("Readme");
  const [selectedMethod, setSelectedMethod] = useState(project.method);
  const [useWww, setUseWww] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cdnToken, setCdnToken] = useState("");
  const [snippetLanguage, setSnippetLanguage] = useState("curl");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);

  // Derive the endpoint base from project
  const projectEndpointPath = (() => {
    try { return new URL(project.endpoint || "https://masdika.id/api/public/upload").pathname; }
    catch { return project.endpoint || "/api/public/upload"; }
  })();
  const endpointDisplay = `https://${useWww ? 'www.' : ''}masdika.id${projectEndpointPath}`;
  const endpointFetch = projectEndpointPath;

  const fetchUserApiKey = async () => {
    try {
      const res = await fetch("/api/dashboard/keys");
      if (res.ok) {
        const allKeys = await res.json();
        if (allKeys && allKeys.length > 0) {
          const getServiceFromSlug = (slug: string) => {
            switch (slug) {
              case 'shortener': return 'SHORTENER';
              case 'youtube-downloader': return 'YOUTUBE';
              case 'tiktok-downloader': return 'TIKTOK';
              case 'spotify-downloader': return 'SPOTIFY';
              case 'cdn': return 'CDN';
              default: return slug.toUpperCase().replace('-', '_');
            }
          };
          const requiredService = getServiceFromSlug(project.slug);

          // Only allow keys that belong to this specific service
          const validKeys = allKeys.filter((k: any) => k.service === requiredService);

          if (validKeys.length > 0) {
            setUserKeys(validKeys);
            setSelectedKeyIndex(0);
            setApiKey(validKeys[0].key);
          } else {
             setUserKeys([]);
             setApiKey("");
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch API key automatically", err);
    }
  };

  useEffect(() => {
    fetchUserApiKey();
  }, [project.id]);



  const generateKey = () => {
    window.location.href = '/dashboard/api-keys';
  };

  const testEndpoint = async () => {
    if (!apiKey) {
      toast.error("Please generate an API key first.");
      return;
    }
    setIsTesting(true);
    setResponse(null);
    try {
      let fetchUrl = endpointFetch;
      let displayUrl = endpointDisplay;

      const options: RequestInit = {
        method: selectedMethod,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      };

      if (selectedMethod === "GET") {
        if (project.slug === "cdn") {
          if (!cdnToken) {
            toast.error("Please provide a file token");
            setIsTesting(false);
            return;
          }
          window.open(`${fetchUrl}?apikey=${apiKey}&token=${cdnToken}`, '_blank');
          setResponse({ status: 200, time: 0, data: { message: "Download started in new tab." } });
          setIsTesting(false);
          return;
        } else {
          fetchUrl = `${fetchUrl}?apikey=${apiKey}`;
        }
      } else if (selectedMethod === "POST" || selectedMethod === "PUT") {
        if (project.slug === "cdn") {
          if (!selectedFile) {
            toast.error("Please select a file to upload");
            setIsTesting(false);
            return;
          }
          const formData = new FormData();
          formData.append("file", selectedFile);

          // Let browser set the Content-Type with boundary automatically
          const headers = { ...options.headers } as any;
          delete headers["Content-Type"];
          options.headers = headers;

          options.body = formData;
        } else {
          try {
            JSON.parse(requestBody);
            options.body = requestBody;
          } catch {
            toast.error("Invalid JSON body");
            setIsTesting(false);
            return;
          }
        }
      }

      const startTime = Date.now();
      const res = await fetch(fetchUrl, options);

      let data;
      try {
        data = await res.json();
      } catch {
        data = { error: "Response was not JSON. Status: " + res.status };
      }

      const timeMs = Date.now() - startTime;

      setResponse({
        status: res.status,
        time: timeMs,
        data: data
      });

    } catch (error: any) {
      setResponse({
        status: 500,
        time: 0,
        data: { error: error.message || "Network Error" }
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={cn("min-h-screen pt-28 md:pt-32 pb-32 lg:pb-40 px-4 relative overflow-hidden bg-transparent", isDark ? "text-white" : "text-slate-900")}>
      <div className="max-w-6xl mx-auto relative z-10 pt-10">

        <div className="flex items-center mb-8">
          <Link 
            href="/api-hub" 
            className={cn(
              "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
              isDark 
                ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
                : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
            )}
          >
            <ChevronLeft className="w-4 h-4" /> Back to API Hub
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className={cn("text-4xl md:text-5xl font-bold mb-4 leading-tight drop-shadow-sm inline-block", isDark ? "bg-gradient-to-br from-cyan-400 to-cyan-200 bg-clip-text text-transparent" : "text-slate-900")}>
            {project.name}
          </h1>
          <p className={cn("text-base md:text-lg leading-relaxed max-w-3xl", isDark ? "text-zinc-400" : "text-slate-600")}>
            {project.description}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-white/10 mb-8">
          {["Readme", "Lab API", "Dashboards"].map(tab => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "Dashboards") {
                  router.push(apiKey ? "/dashboard" : "/login");
                } else {
                  setActiveTab(tab);
                }
              }}
              className={cn("pb-4 text-sm font-bold transition-colors relative", activeTab === tab ? "text-cyan-500" : (isDark ? "text-zinc-500 hover:text-white" : "text-slate-500 hover:text-slate-800"))}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="tab" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 rounded-t-full shadow-[0_-2px_10px_rgba(34,211,238,0.5)]" />
              )}
            </button>
          ))}
        </div>

        {activeTab === "Lab API" && (
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar Params */}
            <div className="w-full lg:w-64 shrink-0 space-y-2">
              {project.method === "POST" && (
                <div
                  onClick={() => setSelectedMethod("POST")}
                  className={cn("p-4 rounded-xl cursor-pointer transition-colors border font-medium text-sm", selectedMethod === "POST" ? (isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600") : (isDark ? "border-transparent hover:bg-white/5 text-zinc-400" : "border-transparent hover:bg-slate-50 text-slate-600"))}
                >
                  <span className="font-bold">POST</span> Using POST Method
                </div>
              )}
              {(project.method === "GET" || project.slug === "cdn") && (
                <div
                  onClick={() => setSelectedMethod("GET")}
                  className={cn("p-4 rounded-xl cursor-pointer transition-colors border font-medium text-sm", selectedMethod === "GET" ? (isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600") : (isDark ? "border-transparent hover:bg-white/5 text-zinc-400" : "border-transparent hover:bg-slate-50 text-slate-600"))}
                >
                  <span className="font-bold">GET</span> {project.slug === "blog" ? "Fetch Posts" : "Using Query Parameter"}
                </div>
              )}
              {project.slug === "blog" && (
                <div className={cn("px-4 py-3 text-xs space-y-2 border rounded-xl", isDark ? "text-zinc-500 border-white/5 bg-white/[0.02]" : "text-slate-500 border-slate-200 bg-slate-50")}>
                  <p className={cn("font-semibold mb-2", isDark ? "text-zinc-400" : "text-slate-600")}>Query Params</p>
                  {[
                    { name: "slug", desc: "Single post by slug" },
                    { name: "page", desc: "Page number (default: 1)" },
                    { name: "limit", desc: "Posts per page (max 50)" },
                    { name: "category", desc: "Filter by category slug" },
                    { name: "tag", desc: "Filter by tag slug" },
                    { name: "search", desc: "Search in title/excerpt" },
                  ].map(p => (
                    <div key={p.name}>
                      <code className="text-cyan-400">{p.name}</code>
                      <p className="text-zinc-600 text-[10px]">{p.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Main Lab Area */}
            <div className="flex-1 space-y-6 min-w-0 w-full">

              <div className={cn("border rounded-xl p-4", isDark ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]" : "bg-cyan-50 border-cyan-200 shadow-sm")}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className={cn("flex items-center gap-3", isDark ? "text-cyan-300" : "text-cyan-700")}>
                    <Key className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">
                      {apiKey ? "API Key loaded successfully." : "Log in or register to generate an API key."}
                    </span>
                  </div>

                  {apiKey ? (
                    <div className="relative w-full sm:w-auto">
                      {userKeys.length > 1 ? (
                        <>
                          <button
                            onClick={() => setShowKeyDropdown(v => !v)}
                            className={cn("w-full sm:w-auto flex items-center gap-2 border px-4 py-2 rounded-lg text-xs font-mono transition-colors", isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)] text-cyan-400 hover:border-cyan-500/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:border-cyan-400")}
                          >
                            <span className="truncate max-w-[180px]">{apiKey}</span>
                            <svg className={`w-4 h-4 shrink-0 transition-transform ${showKeyDropdown ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                          {showKeyDropdown && (
                            <div className={cn("absolute top-full right-0 mt-2 z-50 border rounded-xl shadow-2xl overflow-hidden min-w-[280px]", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-slate-200")}>
                              {userKeys.map((k, i) => (
                                <button
                                  key={k.id}
                                  onClick={() => { setApiKey(k.key); setSelectedKeyIndex(i); setShowKeyDropdown(false); }}
                                  className={cn("w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors border-b last:border-0", i === selectedKeyIndex ? (isDark ? "bg-cyan-500/10" : "bg-cyan-50") : (isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-slate-50 border-slate-100"))}
                                >
                                  <span className={cn("text-xs font-semibold", isDark ? "text-white" : "text-slate-900")}>{k.name || `Key #${i + 1}`}</span>
                                  <span className={cn("text-[10px] font-mono truncate", isDark ? "text-cyan-400" : "text-cyan-600")}>{k.key}</span>
                                  {k.project && <span className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-slate-500")}>Project: {k.project.name}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={cn("border px-4 py-2 rounded-lg text-xs font-mono truncate max-w-xs shadow-inner", isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)] text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                          {apiKey}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={generateKey}
                      className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                    >
                      Go to Dashboard
                    </button>
                  )}
                </div>
              </div>

              {/* Endpoint Area */}
              <div className={cn("rounded-2xl overflow-hidden shadow-2xl border", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-black/5")}>
                <div className={cn("px-5 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)]" : "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                      <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    </div>
                    <span className={cn("text-xs font-mono ml-2", isDark ? "text-zinc-400" : "text-slate-500")}>Request URL</span>
                  </div>
                  <button
                    onClick={() => setUseWww(!useWww)}
                    className={cn("text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2", isDark ? "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10" : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200")}
                  >
                    <div className={`w-2 h-2 rounded-full ${useWww ? 'bg-cyan-400' : 'bg-zinc-500'}`} />
                    Use 'www' prefix
                  </button>
                </div>
                
                <div className="p-5 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                  <div className={cn("flex-1 border rounded-xl p-3 flex items-center gap-3 overflow-x-auto font-mono text-sm shadow-inner", isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200")}>
                    <span className={cn("font-bold px-2.5 py-1 rounded-md", isDark ? "bg-white/5 text-cyan-400" : "bg-white text-cyan-600 shadow-sm")}>
                      {selectedMethod}
                    </span>
                    <span className={cn("whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-700")}>
                      {endpointDisplay}<span className={cn(isDark ? "text-zinc-500" : "text-slate-400")}>?apikey=</span>{apiKey ? <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>{apiKey}</span> : <span className={cn(isDark ? "text-zinc-500" : "text-slate-400")}>{"<KEY>"}</span>}
                    </span>
                  </div>
                  
                  <button
                    onClick={testEndpoint}
                    disabled={isTesting || !apiKey}
                    className={cn(
                      "shrink-0 px-8 py-3 lg:py-0 h-full min-h-[52px] rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      (isTesting || !apiKey)
                        ? (isDark ? "bg-white/5 text-zinc-500 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed")
                        : "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                    )}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Request Body Area (If POST/PUT) */}
              {(selectedMethod === "POST" || selectedMethod === "PUT") && (
                <div className="mt-4">
                  {project.slug === "cdn" ? (
                    <div className={`relative ${!apiKey ? "opacity-50 cursor-not-allowed" : ""}`}>
                      {!apiKey && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a1929]/80 backdrop-blur-sm rounded-2xl border border-white/10">
                          <Lock className="w-8 h-8 text-cyan-400 mb-2" />
                          <p className="text-sm font-semibold text-white">Login required to test upload</p>
                        </div>
                      )}
                      <label className={`group block ${apiKey ? "cursor-pointer" : "pointer-events-none"}`}>
                        <input
                          type="file"
                          disabled={!apiKey}
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <div className={cn("relative rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center gap-4 text-center", selectedFile ? (isDark ? "border-cyan-500/50 bg-cyan-500/5" : "border-cyan-500/50 bg-cyan-50") : (isDark ? "border-white/10 bg-white/[0.02] group-hover:border-cyan-500/30 group-hover:bg-cyan-500/[0.03]" : "border-slate-300 bg-slate-50 group-hover:border-cyan-400 group-hover:bg-cyan-50/50"))}>
                          {selectedFile ? (
                            <>
                              {/* File selected state */}
                              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-cyan-400">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                </svg>
                              </div>
                              <div>
                                <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>{selectedFile.name}</p>
                                <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>{(selectedFile.size / 1024).toFixed(2)} KB · {selectedFile.type || "unknown type"}</p>
                              </div>
                              <span className="text-xs text-cyan-400/70 border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 rounded-full">
                                Click to change file
                              </span>
                            </>
                          ) : (
                            <>
                              {/* Empty state */}
                              <div className={cn("w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300", isDark ? "bg-white/5 border-white/10 group-hover:border-cyan-500/20 group-hover:bg-cyan-500/5" : "bg-white border-slate-200 group-hover:border-cyan-300 group-hover:bg-cyan-50")}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cn("w-7 h-7 transition-colors duration-300", isDark ? "text-zinc-500 group-hover:text-cyan-400/70" : "text-slate-400 group-hover:text-cyan-600")}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                              </div>
                              <div>
                                <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>Drop your file here</p>
                                <p className={cn("text-xs mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>or <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>click to browse</span> from your device</p>
                              </div>
                              <div className={cn("flex items-center gap-2 text-[11px]", isDark ? "text-zinc-600" : "text-slate-500")}>
                                <span className={cn("px-2 py-0.5 rounded border", isDark ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-200")}>Images</span>
                                <span className={cn("px-2 py-0.5 rounded border", isDark ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-200")}>Videos</span>
                                <span className={cn("px-2 py-0.5 rounded border", isDark ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-200")}>Documents</span>
                                <span className={cn("px-2 py-0.5 rounded border", isDark ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-200")}>Any file</span>
                              </div>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className={cn("rounded-2xl overflow-hidden shadow-2xl border mt-6", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-black/5")}>
                      <div className={cn("px-5 py-3 flex items-center justify-between border-b", isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)]" : "bg-slate-50 border-slate-200")}>
                        <div className="flex gap-2 w-16">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                        </div>
                        <div className="flex-1 flex justify-center items-center gap-2">
                          <span className={cn("text-xs font-mono tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Request Body (JSON)</span>
                        </div>
                        <div className="w-16"></div>
                      </div>
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        className={cn("w-full p-5 font-mono text-sm outline-none resize-none min-h-[150px] leading-relaxed", isDark ? "bg-black/20 text-cyan-300" : "bg-slate-50 text-cyan-700")}
                        spellCheck={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedMethod === "GET" && project.slug === "cdn" && (
                <div className={cn("rounded-xl overflow-hidden shadow-2xl border mt-4", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-black/5")}>
                  <div className={cn("px-4 py-3 flex items-center justify-between", isDark ? "bg-[var(--surface-secondary)]" : "bg-slate-50 border-b border-slate-200")}>
                    <span className={cn("text-xs font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>Query Parameter</span>
                  </div>
                  <div className="p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <span className={cn("text-sm font-bold whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>token =</span>
                      <input
                        type="text"
                        value={cdnToken}
                        onChange={(e) => setCdnToken(e.target.value)}
                        placeholder="e.g. 123e4567-e89b-12d3..."
                        className={cn("flex-1 border rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500/50", isDark ? "bg-black/40 border-white/10 text-cyan-300" : "bg-slate-50 border-slate-200 text-cyan-700 focus:border-cyan-400")}
                      />
                    </div>
                    <p className={cn("text-xs ml-16 mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                      * Get the file token from the JSON response after successfully uploading a file via POST.
                    </p>
                  </div>
                </div>
              )}

              {/* Response Area */}
              <div className={cn("rounded-2xl overflow-hidden shadow-2xl border mt-6 relative", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-black/5")}>
                <div className={cn("px-5 py-3 flex items-center justify-between border-b", isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)]" : "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-cyan-500" />
                    <span className={cn("text-xs font-mono tracking-wider", isDark ? "text-zinc-300" : "text-slate-600")}>Response</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {response && (
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className={cn("px-2 py-1 rounded-md border", response.status >= 200 && response.status < 300 ? (isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200') : (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200'))}>
                          Status: {response.status}
                        </span>
                        <span className={cn("border px-2 py-1 rounded-md", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                          Time: {response.time}ms
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={cn("relative min-h-[250px] max-h-[500px] flex flex-col w-full", isDark ? "bg-black/20" : "bg-slate-50")}>
                  {isTesting ? (
                    <div className={cn("absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10", isDark ? "bg-[var(--surface)]/80" : "bg-white/80")}>
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Activity className="w-6 h-6 text-cyan-500 animate-pulse" />
                        </div>
                      </div>
                      <p className="mt-4 text-sm font-mono text-cyan-500 animate-pulse">Awaiting response...</p>
                    </div>
                  ) : response ? (
                    <div className="flex-1 overflow-auto hide-scrollbar w-full relative group">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
                          toast.success("Response copied!");
                        }}
                        className={cn("absolute top-4 right-4 p-2 border rounded-lg transition-colors opacity-0 group-hover:opacity-100", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-white" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800")}
                        title="Copy Response"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <SyntaxHighlighter
                        language="json"
                        style={isDark ? vscDarkPlus : oneLight}
                        customStyle={{
                          margin: 0,
                          padding: '1.5rem',
                          background: 'transparent',
                          fontSize: '13px',
                          lineHeight: '1.6',
                        }}
                        codeTagProps={{ className: "font-mono" }}
                      >
                        {JSON.stringify(response.data, null, 2)}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <div className={cn("h-full absolute inset-0 flex flex-col items-center justify-center font-mono text-sm py-20 bg-gradient-to-b", isDark ? "text-zinc-500 from-transparent to-black/20" : "text-slate-500 from-transparent to-slate-100/50")}>
                      <div className={cn("w-16 h-16 rounded-2xl border flex items-center justify-center mb-4", isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200")}>
                        <Terminal className={cn("w-8 h-8", isDark ? "text-zinc-600" : "text-slate-400")} />
                      </div>
                      <span className="text-center px-4 leading-relaxed">Hit "Send Request" to view the response here</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === "Readme" && (
          <div className={cn("border rounded-[2rem] mt-8 p-8 md:p-12 shadow-[0_20px_60px_-15px_rgba(34,211,238,0.1)] relative overflow-hidden group", isDark ? "border-white/10 bg-gradient-to-b from-[#0a1f33]/40 to-black/60 backdrop-blur-sm text-white ring-1 ring-white/5" : "border-black/5 bg-white text-slate-900 ring-1 ring-black/5")}>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3 group-hover:bg-cyan-500/20 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3 group-hover:bg-cyan-600/20 transition-all duration-700" />
            
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-black mb-8 tracking-tight">{project.name} User Guide</h2>
              <div className={cn("prose max-w-none hover:prose-a:text-cyan-300 prose-strong:text-cyan-400/90", isDark ? "prose-invert text-zinc-300 prose-headings:text-white prose-a:text-cyan-400" : "text-slate-600 prose-headings:text-slate-900 prose-a:text-cyan-600")}>
              <p className="mb-6 leading-relaxed">
                {project.slug === "blog"
                  ? `${project.name} allows you to fetch published blog posts. You can retrieve a list of posts with pagination and filtering, or fetch a single post by its slug.`
                  : `${project.name} provides a fast and secure storage solution. You can upload files (such as images, videos, and documents) using the POST method, and retrieve them anytime using the GET method.`
                }
              </p>

              <h3 className={cn("text-xl font-bold mb-4 border-b pb-2", isDark ? "text-cyan-400 border-white/10" : "text-cyan-600 border-slate-200")}>1. Authentication</h3>
              <p className="mb-4">All API requests must include your API Key. You can pass the API Key in two ways:</p>
              <ul className="list-disc pl-6 mb-8 space-y-2">
                <li>Via <strong>HTTP Header</strong>: Add <code className={cn("px-2 py-1 rounded break-words", isDark ? "bg-white/10 text-cyan-300" : "bg-slate-100 text-cyan-600")}>Authorization: Bearer &lt;API_KEY&gt;</code></li>
                <li>Via <strong>URL Parameter</strong>: Add <code className={cn("px-2 py-1 rounded break-words", isDark ? "bg-white/10 text-cyan-300" : "bg-slate-100 text-cyan-600")}>?apikey=&lt;API_KEY&gt;</code> to the endpoint URL.</li>
              </ul>

              {project.slug === "cdn" && (
                <>
                  <h3 className={cn("text-xl font-bold mb-4 border-b pb-2", isDark ? "text-cyan-400 border-white/10" : "text-cyan-600 border-slate-200")}>2. Uploading a File (POST)</h3>
                  <p className="mb-4">Send a <strong>POST</strong> request to <code className={cn("px-2 py-1 rounded break-words", isDark ? "bg-white/10 text-cyan-300" : "bg-slate-100 text-cyan-600")}>{`https://${useWww ? 'www.' : ''}masdika.id${new URL(project.endpoint || 'https://masdika.id/api/public/upload').pathname}`}</code> with the request body containing the file you want to upload (form-data). You can also set the expiration time by passing an <code className={cn("px-2 py-1 rounded", isDark ? "bg-white/10 text-cyan-300" : "bg-slate-100 text-cyan-600")}>expiresIn</code> field (options: 1d, 1w, 1m, permanent).</p>
                </>
              )}

              {project.slug === "blog" && (
                <>
                  <h3 className={cn("text-xl font-bold mb-4 border-b pb-2", isDark ? "text-cyan-400 border-white/10" : "text-cyan-600 border-slate-200")}>2. Fetching Posts (GET)</h3>
                  <p className="mb-4">Send a <strong>GET</strong> request to <code className={cn("px-2 py-1 rounded break-words", isDark ? "bg-white/10 text-cyan-300" : "bg-slate-100 text-cyan-600")}>{`https://${useWww ? 'www.' : ''}masdika.id${new URL(project.endpoint || '/api/public/v1/blog').pathname}`}</code>. You can use query parameters to filter results.</p>
                </>
              )}

              {/* Code Snippets Section */}
              <div className="flex flex-col gap-6 mb-8 mt-2">
                {[
                  {
                    id: 'curl',
                    name: 'cURL',
                    icon: 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_shell.svg',
                    desc: 'A simple way to test the API directly from your terminal.',
                    lang: 'bash',
                  },
                  {
                    id: 'node',
                    name: 'Node.js',
                    icon: 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_js.svg',
                    desc: 'Using the native fetch API and form-data library in Node.js.',
                    lang: 'javascript',
                  },
                  {
                    id: 'python',
                    name: 'Python',
                    icon: 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/file_type_python.svg',
                    desc: 'A clean implementation using the popular requests library in Python.',
                    lang: 'python',
                  },
                  {
                    id: 'php',
                    name: 'PHP',
                    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/php/php-original.svg',
                    desc: 'Standard cURL implementation for PHP applications.',
                    lang: 'php',
                  },
                  {
                    id: 'ruby',
                    name: 'Ruby',
                    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ruby/ruby-original.svg',
                    desc: "Uploading multipart form data using Ruby's standard net/http library.",
                    lang: 'ruby',
                  },
                  {
                    id: 'go',
                    name: 'Golang',
                    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/go/go-original.svg',
                    desc: "Using Go's standard library to construct and send multipart requests.",
                    lang: 'go',
                  },
                ].map((snippet, index) => {
                  const endpointPath = project.endpoint?.startsWith('http') ? new URL(project.endpoint).pathname : (project.endpoint || '/api/public/upload');
                  const endpoint = `https://${useWww ? 'www.' : ''}masdika.id${endpointPath}`;
                  let code = '';
                  if (project.slug === "cdn") {
                    switch (snippet.id) {
                      case 'curl': code = `curl -X POST \\\n  ${endpoint} \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -F 'file=@/path/to/image.png' \\\n  -F 'expiresIn=1d'`; break;
                      case 'node': code = `const FormData = require('form-data');\nconst fs = require('fs');\nconst fetch = require('node-fetch');\n\nconst formData = new FormData();\nformData.append('file', fs.createReadStream('/path/to/image.png'));\nformData.append('expiresIn', '1d');\n\nfetch('${endpoint}', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    ...formData.getHeaders()\n  },\n  body: formData\n})\n.then(res => res.json())\n.then(console.log);`; break;
                      case 'python': code = `import requests\n\nurl = "${endpoint}"\nheaders = { "Authorization": "Bearer YOUR_API_KEY" }\ndata = { "expiresIn": "1d" }\nfiles = { "file": open("/path/to/image.png", "rb") }\n\nresponse = requests.post(url, headers=headers, data=data, files=files)\nprint(response.json())`; break;
                      case 'php': code = `<?php\n\n$curl = curl_init();\n\ncurl_setopt_array($curl, array(\n  CURLOPT_URL => '${endpoint}',\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_ENCODING => '',\n  CURLOPT_MAXREDIRS => 10,\n  CURLOPT_TIMEOUT => 0,\n  CURLOPT_FOLLOWLOCATION => true,\n  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\n  CURLOPT_CUSTOMREQUEST => 'POST',\n  CURLOPT_POSTFIELDS => array('file'=> new CURLFILE('/path/to/image.png'), 'expiresIn' => '1d'),\n  CURLOPT_HTTPHEADER => array(\n    'Authorization: Bearer YOUR_API_KEY'\n  ),\n));\n\n$response = curl_exec($curl);\ncurl_close($curl);\necho $response;`; break;
                      case 'ruby': code = `require 'net/http/post/multipart'\n\nurl = URI.parse('${endpoint}')\nFile.open('/path/to/image.png') do |jpg|\n  req = Net::HTTP::Post::Multipart.new url.path,\n    "file" => UploadIO.new(jpg, "image/png", "image.png"),\n    "expiresIn" => "1d"\n  req['Authorization'] = 'Bearer YOUR_API_KEY'\n  res = Net::HTTP.start(url.host, url.port, use_ssl: true) do |http|\n    http.request(req)\n  end\n  puts res.body\nend`; break;
                      case 'go': code = `package main\n\nimport (\n\t"bytes"\n\t"fmt"\n\t"io"\n\t"mime/multipart"\n\t"net/http"\n\t"os"\n)\n\nfunc main() {\n\turl := "${endpoint}"\n\tmethod := "POST"\n\n\tpayload := &bytes.Buffer{}\n\twriter := multipart.NewWriter(payload)\n\twriter.WriteField("expiresIn", "1d")\n\tfile, _ := os.Open("/path/to/image.png")\n\tdefer file.Close()\n\n\tpart, _ := writer.CreateFormFile("file", "/path/to/image.png")\n\tio.Copy(part, file)\n\twriter.Close()\n\n\tclient := &http.Client{}\n\treq, _ := http.NewRequest(method, url, payload)\n\treq.Header.Add("Authorization", "Bearer YOUR_API_KEY")\n\treq.Header.Set("Content-Type", writer.FormDataContentType())\n\n\tres, _ := client.Do(req)\n\tdefer res.Body.Close()\n\n\tbody, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}`; break;
                    }
                  } else if (project.method === "POST" || project.method === "PUT") {
                    let bodyContent = '{}';
                    if (project.slug === "shortener") {
                      bodyContent = '{\n  "url": "https://example.com"\n}';
                    } else if (project.slug === "youtube-downloader") {
                      bodyContent = '{\n  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"\n}';
                    } else if (project.slug === "tiktok-downloader") {
                      bodyContent = '{\n  "url": "https://www.tiktok.com/@tiktok/video/7106594312292453678"\n}';
                    } else if (project.slug === "spotify-downloader") {
                      bodyContent = '{\n  "url": "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"\n}';
                    }

                    switch (snippet.id) {
                      case 'curl': code = `curl -X ${project.method} \\\n  '${endpoint}' \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '${bodyContent}'`; break;
                      case 'node': code = `const fetch = require('node-fetch');\n\nfetch('${endpoint}', {\n  method: '${project.method}',\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify(${bodyContent})\n})\n.then(res => res.json())\n.then(console.log);`; break;
                      case 'python': code = `import requests\n\nurl = "${endpoint}"\nheaders = { \n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n}\npayload = ${bodyContent}\n\nresponse = requests.${project.method.toLowerCase()}(url, json=payload, headers=headers)\nprint(response.json())`; break;
                      case 'php': code = `<?php\n\n$curl = curl_init();\n\ncurl_setopt_array($curl, array(\n  CURLOPT_URL => '${endpoint}',\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_ENCODING => '',\n  CURLOPT_MAXREDIRS => 10,\n  CURLOPT_TIMEOUT => 0,\n  CURLOPT_FOLLOWLOCATION => true,\n  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\n  CURLOPT_CUSTOMREQUEST => '${project.method}',\n  CURLOPT_POSTFIELDS => '${bodyContent}',\n  CURLOPT_HTTPHEADER => array(\n    'Authorization: Bearer YOUR_API_KEY',\n    'Content-Type: application/json'\n  ),\n));\n\n$response = curl_exec($curl);\ncurl_close($curl);\necho $response;`; break;
                      case 'ruby': code = `require 'net/http'\nrequire 'uri'\nrequire 'json'\n\nurl = URI.parse('${endpoint}')\nreq = Net::HTTP::${project.method.charAt(0).toUpperCase() + project.method.slice(1).toLowerCase()}.new(url)\nreq['Authorization'] = 'Bearer YOUR_API_KEY'\nreq['Content-Type'] = 'application/json'\nreq.body = JSON.generate(${bodyContent})\n\nres = Net::HTTP.start(url.hostname, url.port, use_ssl: true) do |http|\n  http.request(req)\nend\nputs res.body`; break;
                      case 'go': code = `package main\n\nimport (\n\t"bytes"\n\t"fmt"\n\t"io"\n\t"net/http"\n)\n\nfunc main() {\n\turl := "${endpoint}"\n\tmethod := "${project.method}"\n\n\tpayload := bytes.NewBuffer([]byte(\`${bodyContent}\`))\n\tclient := &http.Client{}\n\treq, _ := http.NewRequest(method, url, payload)\n\treq.Header.Add("Authorization", "Bearer YOUR_API_KEY")\n\treq.Header.Add("Content-Type", "application/json")\n\n\tres, _ := client.Do(req)\n\tdefer res.Body.Close()\n\n\tbody, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}`; break;
                    }
                  } else {
                    switch (snippet.id) {
                      case 'curl': code = `curl -X GET \\\n  '${endpoint}?page=1&limit=10' \\\n  -H 'Authorization: Bearer YOUR_API_KEY'`; break;
                      case 'node': code = `const fetch = require('node-fetch');\n\nfetch('${endpoint}?page=1&limit=10', {\n  method: 'GET',\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY'\n  }\n})\n.then(res => res.json())\n.then(console.log);`; break;
                      case 'python': code = `import requests\n\nurl = "${endpoint}?page=1&limit=10"\nheaders = { "Authorization": "Bearer YOUR_API_KEY" }\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())`; break;
                      case 'php': code = `<?php\n\n$curl = curl_init();\n\ncurl_setopt_array($curl, array(\n  CURLOPT_URL => '${endpoint}?page=1&limit=10',\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_ENCODING => '',\n  CURLOPT_MAXREDIRS => 10,\n  CURLOPT_TIMEOUT => 0,\n  CURLOPT_FOLLOWLOCATION => true,\n  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\n  CURLOPT_CUSTOMREQUEST => 'GET',\n  CURLOPT_HTTPHEADER => array(\n    'Authorization: Bearer YOUR_API_KEY'\n  ),\n));\n\n$response = curl_exec($curl);\ncurl_close($curl);\necho $response;`; break;
                      case 'ruby': code = `require 'net/http'\nrequire 'uri'\n\nurl = URI.parse('${endpoint}?page=1&limit=10')\nreq = Net::HTTP::Get.new(url)\nreq['Authorization'] = 'Bearer YOUR_API_KEY'\n\nres = Net::HTTP.start(url.hostname, url.port, use_ssl: true) do |http|\n  http.request(req)\nend\nputs res.body`; break;
                      case 'go': code = `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"\n)\n\nfunc main() {\n\turl := "${endpoint}?page=1&limit=10"\n\tmethod := "GET"\n\n\tclient := &http.Client{}\n\treq, _ := http.NewRequest(method, url, nil)\n\treq.Header.Add("Authorization", "Bearer YOUR_API_KEY")\n\n\tres, _ := client.Do(req)\n\tdefer res.Body.Close()\n\n\tbody, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}`; break;
                    }
                  }

                  return (
                    <div key={snippet.id} className="w-full">
                      <div className="mb-4 mt-10 px-1">
                        <h3 className={cn("text-lg font-bold mb-1.5 flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-600")}>
                          <span className={cn("px-2 py-0.5 rounded text-sm border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>{index + 1}</span>
                          {snippet.name}
                        </h3>
                        <p className={cn("text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>{snippet.desc}</p>
                      </div>

                      <div className={cn("rounded-xl overflow-hidden border shadow-2xl", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-black/5")}>
                        {/* Tab Style Header */}
                        <div className={cn("flex items-end justify-between px-4 pt-3 border-b", isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)]" : "bg-slate-50 border-slate-200")}>
                          <div className="flex items-end min-w-0 flex-1 mr-4">
                            {/* macOS buttons */}
                            <div className="flex items-center gap-2 mb-3 mr-6 shrink-0">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                            </div>

                            {/* The Tab */}
                            <div className={cn("flex items-center gap-2 px-4 h-9 rounded-t-lg border-x border-t min-w-0", isDark ? "bg-[var(--surface)] border-[var(--border-primary)] shadow-[0_-2px_10px_rgba(0,0,0,0.2)]" : "bg-white border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]")}>
                              <img referrerPolicy="no-referrer" src={snippet.icon} className="w-4 h-4 object-contain shrink-0" alt={snippet.name} loading="lazy" decoding="async" />
                              <span className={cn("text-sm font-semibold tracking-wide truncate leading-none", isDark ? "text-white" : "text-slate-900")}>
                                {snippet.name}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(code);
                              toast.success(`Copied ${snippet.name} snippet`);
                            }}
                            className={cn("transition-colors mb-3 px-2 shrink-0 flex items-center justify-center", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-700")}
                            aria-label="Copy code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Code Content */}
                        <div className={cn("overflow-x-auto hide-scrollbar", isDark ? "bg-[var(--surface)]" : "bg-white")}>
                          <SyntaxHighlighter
                            language={snippet.lang}
                            style={isDark ? vscDarkPlus : oneLight}
                            showLineNumbers={false}
                            customStyle={{ margin: 0, padding: '1.25rem', background: 'transparent', fontSize: '14px', lineHeight: '1.6' }}
                          >
                            {code}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {project.slug === "cdn" && (
                <>
                  <h3 className={cn("text-xl font-bold mb-4 border-b pb-2", isDark ? "text-cyan-400 border-white/10" : "text-cyan-600 border-slate-200")}>3. Retrieving a File (GET)</h3>
                  <p className="mb-4">Send a <em>request</em> <strong>GET</strong> to the following URL to download or view the file.</p>

                  {/* GET Endpoint Code Block */}
                  <div className={cn("rounded-xl overflow-hidden shadow-2xl mb-8 border", isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-black/5")}>
                    {/* Header */}
                    <div className={cn("flex items-center justify-between px-3 py-2 border-b", isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)]" : "bg-slate-50 border-slate-200")}>
                      <div className="flex items-center gap-1.5 ml-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                        <span className={cn("ml-3 text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>GET Request</span>
                      </div>
                      <button
                        onClick={() => {
                          const url = `https://www.masdika.id${new URL(project.endpoint || 'https://masdika.id/api/public/upload').pathname}?token=<FILE_TOKEN>`;
                          navigator.clipboard.writeText(url);
                          setCopiedSnippet(true);
                          setTimeout(() => setCopiedSnippet(false), 2000);
                        }}
                        className={cn("transition-colors px-2 shrink-0", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-700")}
                        aria-label="Copy URL"
                      >
                        {copiedSnippet ? <CheckCircle2 className="w-4 h-4 text-cyan-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Code Content */}
                    <div className={cn("overflow-x-auto hide-scrollbar", isDark ? "bg-[var(--surface)]" : "bg-white")}>
                      <SyntaxHighlighter
                        language="bash"
                        style={isDark ? vscDarkPlus : oneLight}
                        showLineNumbers={false}
                        wrapLines={false}
                        wrapLongLines={false}
                        customStyle={{
                          margin: 0,
                          padding: '1.25rem',
                          background: 'transparent',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          whiteSpace: 'pre',
                          wordBreak: 'normal',
                          overflowWrap: 'normal',
                        }}
                        codeTagProps={{
                          className: "font-mono",
                          style: { fontFamily: 'inherit', whiteSpace: 'pre', wordBreak: 'normal', overflowWrap: 'normal' }
                        }}
                      >
                        {`https://www.masdika.id${new URL(project.endpoint || 'https://masdika.id/api/public/upload').pathname}?token=<FILE_TOKEN>`}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>
        )}


        {activeTab === "Dashboards" && (
          <div className={cn("py-32 text-center border rounded-[2rem] mt-8 shadow-[0_20px_60px_-15px_rgba(34,211,238,0.1)] relative overflow-hidden group", isDark ? "bg-gradient-to-b from-[#0a1f33]/40 to-black/60 backdrop-blur-sm border-white/10 ring-1 ring-white/5" : "bg-white border-black/5 ring-1 ring-black/5")}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700" />
            <div className="relative z-10 flex flex-col items-center">
              <Terminal className={cn("w-20 h-20 mb-8", isDark ? "text-cyan-500/30" : "text-cyan-500/10")} />
              <h3 className={cn("text-3xl font-black mb-4 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Dashboards Section</h3>
              <p className={cn("max-w-md mx-auto text-lg", isDark ? "text-zinc-400" : "text-slate-500")}>This section is currently under development. Please check back later.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
