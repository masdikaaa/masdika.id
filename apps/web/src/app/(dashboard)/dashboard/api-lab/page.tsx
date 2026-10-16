'use client';

import { useUrlNumber } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Play, Terminal, Key, Activity, Code2, Copy, CheckCircle2, Check, Upload, AlertCircle, Lock, Loader2, ArrowLeft, ChevronLeft, Cloud, Link as LinkIcon, Radio, CloudRain, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";

const API_CONFIG: Record<string, any> = {
  'CDN': {
    title: 'Masdika CDN',
    desc: 'Secure Content Delivery Network for Masdika platform. Upload via POST, retrieve via GET.',
    methods: ['POST', 'GET'],
    endpoint: 'https://masdika.id/api/public/upload',
    requiresUpload: true,
    icon: Cloud
  },
  'SHORTENER': {
    title: 'Masdika URL Shortener API',
    desc: 'Create and manage shortened URLs programmatically. Accepts a long URL and returns an auto-generated short link.',
    methods: ['POST'],
    endpoint: 'https://masdika.id/api/shortener',
    bodyTemplate: '{\n  "url": "https://example.com"\n}',
    icon: LinkIcon
  },
  'BMKG_EARTHQUAKE': {
    title: 'BMKG Earthquake API',
    desc: 'Get the latest earthquake information (Auto Gempa) and a list of recent earthquakes > 5.0 SR from BMKG.',
    methods: ['GET'],
    endpoint: 'https://masdika.id/api/public/bmkg/earthquake',
    icon: Radio
  },
  'BMKG_WEATHER': {
    title: 'BMKG Weather API',
    desc: 'Get real-time weather forecasts for all regions in Indonesia directly from BMKG.',
    methods: ['GET'],
    endpoint: 'https://masdika.id/api/public/bmkg/weather',
    icon: CloudRain
  }
};

export default function ApiLabPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";


  const [keys, setKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [activeService, setActiveService] = useState<string | null>(null);
  
  const [method, setMethod] = useState("GET");
  const [apiKey, setApiKey] = useState("");
  const [useWww, setUseWww] = useState(false);
  
  const [requestBody, setRequestBody] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [cdnToken, setCdnToken] = useState("");
  
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [page, setPage] = useUrlNumber("page", 1);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  const handleSelectService = (service: string, keyToUse: string = "") => {
    setActiveService(service);
    const config = API_CONFIG[service];
    if (config) {
      setMethod(config.methods[0]);
      setApiKey(keyToUse || keys.find((k: any) => k.service === service)?.key || "");
      if (config.bodyTemplate) {
        setRequestBody(config.bodyTemplate);
      } else {
        setRequestBody("");
      }
      setUploadFile(null);
      setCdnToken("");
      setResponse(null);
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/dashboard/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
        if (data.length > 0) {
          const firstValid = data.find((k: any) => API_CONFIG[k.service]);
          if (firstValid) {
            handleSelectService(firstValid.service, firstValid.key);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    
    const handleResize = () => {
      setItemsPerPage(window.innerWidth < 768 ? 2 : 4);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const uniqueServices = Array.from(new Set(keys.map(k => k.service))).filter(s => !!API_CONFIG[s as string]);
  const totalPages = Math.ceil(uniqueServices.length / itemsPerPage);
  const paginatedServices = uniqueServices.slice((page - 1) * itemsPerPage, page * itemsPerPage);



  const handleSend = async () => {
    if (!apiKey) {
      toast.error("Please provide an API key.");
      return;
    }

    setLoading(true);
    setResponse(null);
    try {
      const config = activeService ? API_CONFIG[activeService] : null;
      let targetUrl = config.endpoint.replace("https://masdika.id", ""); 
      
      let options: RequestInit = { 
        method,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      };

      if (method === "GET") {
        if (activeService === "CDN") {
          if (!cdnToken) {
            toast.error("Please provide a file token");
            setLoading(false);
            return;
          }
          window.open(`${targetUrl}?apikey=${apiKey}&token=${cdnToken}`, '_blank');
          setResponse({ status: 200, time: 0, data: { message: "Download started in new tab." } });
          setLoading(false);
          return;
        } else {
          targetUrl = `${targetUrl}?apikey=${apiKey}`;
        }
      } else if (method === "POST" || method === "PUT") {
        if (activeService === "CDN") {
          if (!uploadFile) {
            toast.error("Please select a file to upload");
            setLoading(false);
            return;
          }
          const formData = new FormData();
          formData.append("file", uploadFile);

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
            setLoading(false);
            return;
          }
        }
      }

      const startTime = Date.now();
      const res = await fetch(targetUrl, options);
      
      let data;
      try {
        data = await res.json();
      } catch {
        data = { error: "Response was not JSON. Status: " + res.status };
      }

      const timeMs = Date.now() - startTime;
      setResponse({ status: res.status, time: timeMs, data });
    } catch (error: any) {
      setResponse({ status: 500, time: 0, data: { error: error.message || "Network Error" } });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Response copied!");
    }
  };

  const currentConfig = activeService ? API_CONFIG[activeService] : null;
  const projectEndpointPath = (() => {
    if (!currentConfig) return "";
    try { return new URL(currentConfig.endpoint).pathname; }
    catch { return currentConfig.endpoint; }
  })();
  const endpointDisplay = `https://${useWww ? 'www.' : ''}masdika.id${projectEndpointPath}`;

  if (loadingKeys) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex items-center">
        <Link 
          href="/dashboard" 
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
            isDark 
              ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
              : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
          )}
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
      
      <div className={cn("relative overflow-hidden rounded-3xl  border p-6 md:p-8 shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-black/5 shadow-sm")}>
        
        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 tracking-wide", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-slate-100 border-slate-200 text-cyan-700")}>
            <Activity className="w-3 h-3" /> API Testing Facility
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            API <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Lab</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-600")}>Test and interact with your ordered API services directly from this dashboard.</p>
        </div>
      </div>

      {uniqueServices.length === 0 ? (
        <div className={cn("border rounded-3xl p-12 text-center", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-slate-50 border-black/5")}>
          <AlertCircle className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
          <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No APIs Found</h3>
          <p className={cn("mb-6", isDark ? "text-zinc-400" : "text-slate-600")}>You haven't generated any API keys for your ordered services yet.</p>
          <Link href="/dashboard/api-keys" className="bg-cyan-500 text-[#011627] px-6 py-3 rounded-xl font-bold hover:bg-cyan-400 transition-colors inline-block">
            Generate API Key
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {paginatedServices.map((serviceId) => {
              const serviceStr = serviceId as string;
              const conf = API_CONFIG[serviceStr];
              const isActive = activeService === serviceStr;
              return (
                <button
                  key={serviceStr}
                  onClick={() => handleSelectService(serviceStr, keys.find(k => k.service === serviceStr)?.key)}
                  className={cn(
                    "text-left p-5 rounded-2xl border transition-all shadow-sm relative cursor-pointer",
                    isActive
                      ? (isDark ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30" : "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20")
                      : (isDark ? "bg-[#060b14] border-slate-800 hover:border-slate-700 hover:bg-[#0a1222]" : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md")
                  )}
                >
                  <div className="flex justify-between items-start mb-2 pr-6">
                    <div className="flex items-center gap-2.5">
                      {conf?.icon && <conf.icon className={`w-4 h-4 ${isActive ? "text-cyan-500" : "text-cyan-600"}`} />}
                      <h3 className={cn("font-bold text-sm", isActive ? (isDark ? "text-cyan-400" : "text-cyan-900") : (isDark ? "text-white" : "text-slate-900"))}>
                        {conf?.title || serviceStr}
                      </h3>
                    </div>
                  </div>
                  {/* Radio check */}
                  <div className={cn(
                    "absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                    isActive
                      ? "bg-cyan-600 border-cyan-600 text-white shadow-sm"
                      : isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-300 bg-slate-50"
                  )}>
                    {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <p className={cn("text-xs line-clamp-2 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {conf?.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-2 mb-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}

          {currentConfig && (
            <div className="flex flex-col lg:flex-row gap-8 mt-8">
              {/* Sidebar Params */}
              <div className="w-full lg:w-64 shrink-0 space-y-2">
                {currentConfig.methods.includes("POST") && (
                  <div
                    onClick={() => setMethod("POST")}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all border font-medium text-sm shadow-sm",
                      method === "POST"
                        ? (isDark ? "bg-[#0b162c] border-cyan-500 text-cyan-400 shadow-md ring-1 ring-cyan-500/30 font-bold" : "bg-white border-cyan-600 text-cyan-900 shadow-md ring-2 ring-cyan-600/20 font-bold")
                        : (isDark ? "bg-[#060b14] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white" : "bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-900")
                    )}
                  >
                    <span className="font-bold">POST</span> Using POST Method
                  </div>
                )}
                {currentConfig.methods.includes("GET") && (
                  <div
                    onClick={() => setMethod("GET")}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all border font-medium text-sm shadow-sm",
                      method === "GET"
                        ? (isDark ? "bg-[#0b162c] border-cyan-500 text-cyan-400 shadow-md ring-1 ring-cyan-500/30 font-bold" : "bg-white border-cyan-600 text-cyan-900 shadow-md ring-2 ring-cyan-600/20 font-bold")
                        : (isDark ? "bg-[#060b14] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white" : "bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-900")
                    )}
                  >
                    <span className="font-bold">GET</span> Using Query Parameter
                  </div>
                )}
              </div>

              {/* Main Lab Area */}
              <div className="flex-1 space-y-6 min-w-0 w-full">
                
                {/* API Key Banner */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-cyan-300">
                      <Key className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-medium">API Key loaded successfully.</span>
                    </div>
                    <div className={cn("bg-[#011627] border px-4 py-2 rounded-lg text-xs font-mono text-cyan-400 truncate max-w-xs shadow-inner", isDark ? "border-white/10" : "border-slate-200")}>
                      {apiKey}
                    </div>
                  </div>
                </div>

                {/* Endpoint Area */}
                <div className={cn("rounded-2xl overflow-hidden shadow-2xl border", isDark ? "bg-[#0d1117] border-white/10" : "bg-white border-black/5")}>
                  <div className={cn("px-5 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", isDark ? "bg-[#161b22] border-white/5" : "bg-slate-50 border-slate-200")}>
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
                    <div className={cn("flex-1 rounded-xl p-3 flex items-center gap-3 overflow-x-auto font-mono text-sm shadow-inner border", isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200")}>
                      <span className={cn("font-bold px-2.5 py-1 rounded-md", isDark ? "bg-white/5 text-cyan-400" : "bg-white text-cyan-600 shadow-sm")}>
                        {method}
                      </span>
                      <span className={cn("whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-700")}>
                        {endpointDisplay}<span className={cn(isDark ? "text-zinc-500" : "text-slate-400")}>?apikey=</span>{apiKey ? <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>{apiKey}</span> : <span className={cn(isDark ? "text-zinc-500" : "text-slate-400")}>{"<KEY>"}</span>}
                      </span>
                    </div>
                    
                    <button
                      onClick={handleSend}
                      disabled={loading || !apiKey}
                      className={cn("shrink-0 px-8 py-3 lg:py-0 h-full min-h-[52px] rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-white shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm hover:shadow-md")}
                    >
                      {loading ? (
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
                {method === "POST" && (
                  <div className="mt-4">
                    {activeService === "CDN" ? (
                      <div className={`relative ${!apiKey ? "opacity-50 cursor-not-allowed" : ""}`}>
                        <label className={`group block ${apiKey ? "cursor-pointer" : "pointer-events-none"}`}>
                          <input
                            type="file"
                            disabled={!apiKey}
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                            <div className={cn("relative rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center gap-4 text-center", uploadFile ? (isDark ? "border-cyan-500/50 bg-[#0b162c] ring-1 ring-cyan-500/30" : "border-cyan-600 bg-white shadow-sm ring-2 ring-cyan-600/20") : (isDark ? "border-slate-800 bg-[#060b14] group-hover:border-slate-700" : "border-slate-300 bg-white group-hover:border-slate-400 group-hover:shadow-sm"))}>
                            {uploadFile ? (
                              <>
                                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                  <Upload className="w-7 h-7 text-cyan-400" />
                                </div>
                                <div>
                                  <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>{uploadFile.name}</p>
                                  <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>{(uploadFile.size / 1024).toFixed(2)} KB</p>
                                </div>
                                <span className="text-xs text-cyan-400/70 border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 rounded-full">
                                  Click to change file
                                </span>
                              </>
                            ) : (
                              <>
                                <div className={cn("w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300", isDark ? "bg-white/5 border-white/10 group-hover:border-cyan-500/20 group-hover:bg-cyan-500/5" : "bg-white border-slate-200 group-hover:border-slate-300 group-hover:bg-slate-50")}>
                                  <Upload className={cn("w-7 h-7 transition-colors duration-300", isDark ? "text-zinc-500 group-hover:text-cyan-400/70" : "text-slate-400 group-hover:text-slate-600")} />
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
                      <div className={cn("rounded-2xl overflow-hidden shadow-2xl border mt-6", isDark ? "bg-[#0d1117] border-white/10" : "bg-white border-black/5")}>
                        <div className={cn("px-5 py-3 flex items-center justify-between border-b", isDark ? "bg-[#161b22] border-white/5" : "bg-slate-50 border-slate-200")}>
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

                {method === "GET" && activeService === "CDN" && (
                  <div className={cn("rounded-xl overflow-hidden shadow-2xl border mt-4", isDark ? "bg-[#0d1117] border-white/5" : "bg-white border-black/5")}>
                    <div className={cn("px-4 py-3 flex items-center justify-between", isDark ? "bg-[#161b22]" : "bg-slate-50 border-b border-slate-200")}>
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
                          className={cn("flex-1 border rounded-lg px-4 py-2 text-sm font-mono focus:outline-none", isDark ? "bg-black/40 border-white/10 text-cyan-300 focus:border-cyan-500/50" : "bg-slate-50 border-slate-200 text-cyan-700 focus:border-cyan-400")}
                        />
                      </div>
                      <p className={cn("text-xs ml-16 mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                        * Get the file token from the JSON response after successfully uploading a file via POST.
                      </p>
                    </div>
                  </div>
                )}

                {/* Response Area */}
                <div className={cn("rounded-2xl overflow-hidden shadow-2xl border mt-6 relative", isDark ? "bg-[#0d1117] border-white/10" : "bg-white border-black/5")}>
                  <div className={cn("px-5 py-3 flex items-center justify-between border-b", isDark ? "bg-[#161b22] border-white/5" : "bg-slate-50 border-slate-200")}>
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-cyan-500" />
                      <span className={cn("text-xs font-mono tracking-wider", isDark ? "text-zinc-300" : "text-slate-600")}>Response</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {response && (
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className={`px-2 py-1 rounded-md ${response.status >= 200 && response.status < 300 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            Status: {response.status}
                          </span>
                          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded-md">
                            Time: {response.time}ms
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={cn("relative min-h-[250px] max-h-[500px] flex flex-col w-full", isDark ? "bg-black/20" : "bg-slate-50")}>
                    {loading ? (
                      <div className={cn("absolute inset-0 flex flex-col items-center justify-center  z-10", isDark ? "bg-[#0d1117]/80" : "bg-white/80")}>
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-cyan-500 animate-pulse" />
                          </div>
                        </div>
                        <p className="mt-4 text-sm font-mono text-cyan-400 animate-pulse">Awaiting response...</p>
                      </div>
                    ) : response ? (
                      <div className="flex-1 overflow-auto hide-scrollbar w-full relative group">
                        <button 
                          onClick={copyToClipboard}
                          className={cn("absolute top-4 right-4 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 border", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-white" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600")}
                          title="Copy Response"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <SyntaxHighlighter
                          language="json"
                          style={isDark ? vscDarkPlus : vs}
                          customStyle={{
                            margin: 0,
                            padding: '1.5rem',
                            background: isDark ? 'transparent' : '#f8fafc',
                            color: isDark ? 'inherit' : '#334155',
                            fontSize: '13px',
                            lineHeight: '1.6',
                          }}
                          codeTagProps={{ className: "font-mono" }}
                        >
                          {JSON.stringify(response.data, null, 2)}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <div className={cn("h-full absolute inset-0 flex flex-col items-center justify-center font-mono text-sm py-20", isDark ? "text-zinc-500 bg-gradient-to-b from-transparent to-black/20" : "text-slate-400 bg-gradient-to-b from-transparent to-slate-100/50")}>
                        <div className={cn("w-16 h-16 rounded-2xl border flex items-center justify-center mb-4", isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
                          <Terminal className={cn("w-8 h-8", isDark ? "text-zinc-600" : "text-slate-300")} />
                        </div>
                        <span className="text-center px-4 leading-relaxed">Hit "Send Request" to view the response here</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}