"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Maximize2, Power, RefreshCw, ArrowLeft, Monitor } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

function ConsoleContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const rfbRef = useRef<any>(null);

  const vmid = searchParams.get("vmid");
  const hostname = searchParams.get("hostname") || "VPS Console";
  const ticket = searchParams.get("ticket") || "";
  const proxmoxHost = searchParams.get("host") || "";
  const node = searchParams.get("node") || "";
  const port = searchParams.get("port") || "5900";
  const tokenId = searchParams.get("tokenId") || "";
  const tokenSecret = searchParams.get("tokenSecret") || "";

  useEffect(() => {
    if (!ticket || !proxmoxHost || !vmid) {
      setStatus("error");
      setErrorMsg("Missing VNC connection parameters.");
      return;
    }
    loadAndConnect();
    return () => {
      if (rfbRef.current) {
        try { rfbRef.current.disconnect(); } catch {}
      }
    };
  }, []);

  const loadAndConnect = async () => {
    try {
      setStatus("loading");
      if (!containerRef.current) return;

      // Load noVNC from public folder (browser-only ES module, bypass bundler)
      // @ts-ignore
      const { default: RFB } = await import(/* webpackIgnore: true */ "/novnc/core/rfb.js");

      // Connect to our Next.js custom server VNC proxy (avoids CORS and port issues)
      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProto}//${window.location.host}/api/ws/vnc?` + new URLSearchParams({
        proxmoxHost, node: node!, vmid: vmid!, port, ticket, tokenId, tokenSecret
      }).toString();

      const rfb = new RFB(containerRef.current, wsUrl, {
        // Pass the API token so Proxmox WS endpoint can authenticate us
        wsProtocols: [],
        credentials: { password: ticket },
      });



      rfb.addEventListener("connect", () => {
        console.log("VNC Connected!");
        setStatus("connected");
      });

      rfb.addEventListener("disconnect", (e: any) => {
        console.log("Disconnect:", e.detail);
        if (!e.detail.clean) {
          setStatus("error");
          setErrorMsg("VNC connection lost. Session may have expired. Click Reconnect.");
        }
      });

      rfb.scaleViewport = true;
      rfb.resizeSession = true;
      rfbRef.current = rfb;
    } catch (e: any) {
      console.error("VNC connection error:", e);
      setStatus("error");
      setErrorMsg(e.message || "Failed to establish VNC connection.");
    }
  };

  const reconnect = () => {
    if (rfbRef.current) {
      try { rfbRef.current.disconnect(); } catch {}
      rfbRef.current = null;
    }
    window.location.reload();
  };

  const fullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050a10] flex flex-col" style={{ zIndex: 9999 }}>
      <div className={cn("flex items-center justify-between px-4 bg-[#0d1825] border-b shrink-0", isDark ? "border-white/10" : "border-slate-200")} style={{ height: "44px" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => window.close()} className={cn("flex items-center gap-1.5 hover:text-white transition-colors text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <ArrowLeft className="w-4 h-4" />
            Close
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span className={cn("font-medium text-sm", isDark ? "text-white" : "text-slate-900")}>{decodeURIComponent(hostname)}</span>
            {vmid && <span className={cn("text-xs font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>VMID: {vmid}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${status === "connected" ? "text-cyan-400" : status === "error" ? "text-red-400" : "text-zinc-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === "connected" ? "bg-cyan-500 animate-pulse" : status === "error" ? "bg-red-500" : "bg-zinc-500 animate-pulse"}`} />
            {status === "connected" ? "Connected" : status === "error" ? "Error" : "Connecting..."}
          </span>
          <button onClick={reconnect} className={cn("p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")} title="Reconnect">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={fullscreen} className={cn("p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")} title="Fullscreen">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black">
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050a10] z-10">
            <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Connecting to VPS console...</p>
            <p className={cn("text-xs mt-1", isDark ? "text-zinc-600" : "text-slate-900")}>Establishing secure VNC session</p>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050a10] z-10">
            <div className="text-center max-w-md px-6">
              <Power className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className={cn("font-bold text-xl mb-2", isDark ? "text-white" : "text-slate-900")}>Console Unavailable</h2>
              <p className={cn("text-sm mb-3", isDark ? "text-zinc-400" : "text-slate-500")}>{errorMsg}</p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-left mb-6">
                <p className="text-amber-400 text-xs font-medium mb-1">Tips:</p>
                <ul className={cn("text-xs space-y-1 list-disc list-inside", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <li>VNC tickets expire in ~10 min — close and reopen console from My VPS.</li>
                  <li>Make sure your VPS is in <strong>Running</strong> state.</li>
                  <li>Check browser DevTools (F12) Console tab for detailed error.</li>
                </ul>
              </div>
              <button onClick={reconnect} className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" />
                Reconnect
              </button>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" style={{ display: status === "error" ? "none" : "block" }} />
      </div>
    </div>
  );
}

export default function VpsConsolePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#050a10] flex items-center justify-center"><RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" /></div>}>
      <ConsoleContent />
    </Suspense>
  );
}