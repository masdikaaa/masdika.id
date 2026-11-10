"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  CheckCircle, 
  Terminal, 
  ExternalLink, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  Rocket, 
  Server, 
  Globe, 
  RefreshCw,
  Lock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAppById, getAppByName, VpsAppDefinition } from "@/lib/vps-apps";
import { toast } from "sonner";

interface VpsAppInstallationMonitorProps {
  vpsId: number;
  appName?: string | null;
  appId?: string | null;
  fallbackPassword?: string;
  isDark?: boolean;
  mode?: "modal" | "gate";
  onComplete: () => void;
}

interface QuickVpsStatus {
  id: number;
  hostname: string;
  status: string; // PENDING | PROVISIONING | ACTIVE | ERROR
  vmid?: number;
  assignedIps?: string[];
  appName?: string | null;
  appVersion?: string | null;
  appStatus?: string | null; // INSTALLING | READY | FAILED | NONE
  appUrl?: string | null;
  appCredentials?: string | null;
}

export function VpsAppInstallationMonitor({
  vpsId,
  appName,
  appId,
  fallbackPassword,
  isDark = true,
  mode = "modal",
  onComplete,
}: VpsAppInstallationMonitorProps) {
  const [statusData, setStatusData] = useState<QuickVpsStatus | null>(null);
  const [progress, setProgress] = useState(15);
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // App Definition
  const appDef: VpsAppDefinition | undefined = 
    getAppById(appId) || 
    getAppByName(appName) || 
    getAppByName(statusData?.appName);

  const displayName = appDef?.name || statusData?.appName || appName || "1-Click Application";
  const displayVersion = statusData?.appVersion || appDef?.appVersion || "latest";

  // Parse credentials
  let credentialsObj: any = null;
  if (statusData?.appCredentials) {
    try {
      credentialsObj = JSON.parse(statusData.appCredentials);
    } catch (e) {
      // fallback
    }
  }

  const primaryIp = statusData?.assignedIps?.[0] || "";
  const webUrl = statusData?.appUrl || credentialsObj?.loginUrl || (primaryIp && appDef ? `${appDef.defaultProtocol}://${primaryIp}:${appDef.defaultPort}` : "");
  const username = credentialsObj?.username || appDef?.adminUsername || "admin";
  const password = credentialsObj?.password || fallbackPassword || "Configured VPS Root Password";
  const instructions = credentialsObj?.instructions || appDef?.instructions?.replace(/\$\{ip\}/g, primaryIp || "your-ip") || "Log in using the credentials above.";

  // Polling logic
  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/user/vps/${vpsId}?quick=true`);
        if (!res.ok) return;
        const data: QuickVpsStatus = await res.json();
        if (!isMounted) return;

        setStatusData(data);

        // Calculate progress & logs
        if (data.appStatus === "READY" || (data.status === "ACTIVE" && !data.appName)) {
          setProgress(100);
          setIsFinished(true);
        } else if (data.status === "ACTIVE" && data.appStatus === "INSTALLING") {
          setProgress((prev) => Math.min(88, Math.max(prev, 70)));
        } else if (data.status === "PROVISIONING") {
          setProgress((prev) => Math.min(60, Math.max(prev, 40)));
        } else {
          setProgress((prev) => Math.min(30, Math.max(prev, 15)));
        }
      } catch (err) {
        console.error("Failed to poll VPS provisioning status:", err);
      }
    };

    fetchStatus();
    pollInterval = setInterval(fetchStatus, 2200);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [vpsId]);

  // Simulated log messages corresponding to progress
  useEffect(() => {
    const timestamp = () => new Date().toLocaleTimeString("en-US", { hour12: false });
    const newLogs: string[] = [];

    newLogs.push(`[${timestamp()}] [PROXMOX] Initializing virtual machine allocation...`);
    if (progress >= 30 || statusData?.vmid) {
      newLogs.push(`[${timestamp()}] [VM] VMID ${statusData?.vmid || "assigned"} allocated on hypervisor node.`);
    }
    if (progress >= 40 || primaryIp) {
      newLogs.push(`[${timestamp()}] [NETWORK] Dedicated Public IPv4 ${primaryIp || "binding"} attached.`);
    }
    if (progress >= 55 || statusData?.status === "ACTIVE") {
      newLogs.push(`[${timestamp()}] [SYSTEM] ${appDef?.osBase || "Linux"} OS image booted. Cloud-Init initialized.`);
    }
    if (progress >= 70 || statusData?.appStatus === "INSTALLING") {
      newLogs.push(`[${timestamp()}] [APP] QEMU Guest Agent responsive. Running automated setup for ${displayName}...`);
      newLogs.push(`[${timestamp()}] [RUNTIME] Setting up container runtime, security policies, and port binding...`);
    }
    if (isFinished || statusData?.appStatus === "READY") {
      newLogs.push(`[${timestamp()}] [SUCCESS] ${displayName} daemon successfully launched.`);
      newLogs.push(`[${timestamp()}] [HEALTHCHECK] Endpoint verified at ${webUrl || "http://" + primaryIp}. Ready for user access.`);
    }

    setLogs(newLogs);
  }, [progress, statusData, primaryIp, displayName, isFinished, webUrl]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Steps definition
  const steps = [
    {
      id: 1,
      title: "Virtual Machine Allocation",
      desc: "Proxmox CPU, RAM, & storage allocation",
      isDone: progress >= 35 || Boolean(statusData?.vmid),
      isActive: progress < 35 && !statusData?.vmid
    },
    {
      id: 2,
      title: "Public IPv4 Stack",
      desc: primaryIp ? `Assigned IP: ${primaryIp}` : "Allocating dedicated Public IPv4 address",
      isDone: progress >= 50 || Boolean(primaryIp),
      isActive: progress >= 35 && !primaryIp
    },
    {
      id: 3,
      title: "Base OS & Cloud-Init",
      desc: `Booting ${appDef?.osBase || "Linux"} & QEMU Guest Agent`,
      isDone: progress >= 70 || statusData?.status === "ACTIVE",
      isActive: progress >= 50 && statusData?.status !== "ACTIVE"
    },
    {
      id: 4,
      title: `${displayName} Installation`,
      desc: isFinished ? "Application packages deployed" : "Running automated container setup script",
      isDone: isFinished || statusData?.appStatus === "READY",
      isActive: (statusData?.status === "ACTIVE" && !isFinished) || (progress >= 70 && !isFinished)
    },
    {
      id: 5,
      title: "Service Verification",
      desc: isFinished ? "Endpoints verified & operational" : "Generating credentials & verifying port access",
      isDone: isFinished || statusData?.appStatus === "READY",
      isActive: isFinished
    }
  ];

  const content = (
    <div className={cn(
      "w-full max-w-2xl mx-auto rounded-3xl border shadow-2xl overflow-hidden transition-all",
      isDark ? "bg-[#0b0c10] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
    )}>
      {/* Top Banner / Header */}
      <div className={cn(
        "p-6 sm:p-7 border-b relative overflow-hidden",
        isFinished 
          ? isDark ? "bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-transparent border-emerald-500/20" : "bg-gradient-to-r from-emerald-50 via-cyan-50 to-transparent border-emerald-200"
          : isDark ? "bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-transparent border-white/10" : "bg-gradient-to-r from-cyan-50 via-slate-50 to-transparent border-slate-200"
      )}>
        <div className="flex items-center gap-4 relative z-10">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center p-2.5 shrink-0 border shadow-md",
            isDark ? "bg-[#12131a] border-white/15" : "bg-white border-slate-200 shadow-sm"
          )}>
            {appDef?.icon ? (
              <img
                src={appDef.icon}
                alt={displayName}
                className="w-full h-full object-contain"
              />
            ) : (
              <Rocket className="w-7 h-7 text-cyan-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider truncate">
                {displayName}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {displayVersion}
              </span>
              {isFinished ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Ready
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Installing...
                </span>
              )}
            </div>
            <p className={cn("text-xs sm:text-sm mt-1 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              {isFinished 
                ? "Setup completed successfully. Your application and server are live."
                : `Automated Cloud-Init setup on ${appDef?.osBase || "Linux"}. Server actions are locked until setup finishes.`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 relative z-10">
          <div className="flex justify-between items-center text-xs font-mono font-semibold mb-1.5">
            <span className={isDark ? "text-zinc-400" : "text-slate-500"}>
              {isFinished ? "Provisioning Complete" : "Installation in Progress..."}
            </span>
            <span className={cn("font-bold", isFinished ? "text-emerald-400" : "text-cyan-400")}>
              {progress}%
            </span>
          </div>
          <div className={cn("w-full h-2.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isFinished 
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
                  : "bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 animate-pulse"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-7 space-y-6">
        {/* SUCCESS / WEB ACCESS CREDENTIALS BOX */}
        {isFinished ? (
          <div className={cn(
            "p-5 sm:p-6 rounded-2xl border transition-all animate-in fade-in zoom-in-95 duration-300",
            isDark ? "bg-[#12141d] border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]" : "bg-emerald-50/70 border-emerald-200 shadow-sm"
          )}>
            <div className="flex items-center gap-2.5 mb-4 text-emerald-400 font-bold text-sm">
              <Sparkles className="w-5 h-5 shrink-0" />
              <span>1-Click Application Web Access Credentials</span>
            </div>

            <div className="space-y-3.5">
              {/* Web URL */}
              <div>
                <label className={cn("block text-[11px] font-medium uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Web Access URL
                </label>
                <div className={cn(
                  "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs sm:text-sm",
                  isDark ? "bg-[#0b0c10] border-white/10" : "bg-white border-slate-200"
                )}>
                  <span className="font-bold text-cyan-400 truncate">
                    {webUrl || `http://${primaryIp || "pending"}:${appDef?.defaultPort || 80}`}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webUrl, "url")}
                      className={cn(
                        "p-1.5 rounded-lg border transition-colors cursor-pointer",
                        isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                      )}
                      title="Copy URL"
                    >
                      {copiedKey === "url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {webUrl && (
                      <a
                        href={webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      >
                        <span>Open Dashboard</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username */}
                <div>
                  <label className={cn("block text-[11px] font-medium uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Admin Username
                  </label>
                  <div className={cn(
                    "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs sm:text-sm",
                    isDark ? "bg-[#0b0c10] border-white/10" : "bg-white border-slate-200"
                  )}>
                    <span className="font-bold truncate">{username}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(username, "user")}
                      className={cn(
                        "p-1.5 rounded-lg border transition-colors cursor-pointer",
                        isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                      )}
                      title="Copy Username"
                    >
                      {copiedKey === "user" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className={cn("block text-[11px] font-medium uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Admin Password
                  </label>
                  <div className={cn(
                    "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs sm:text-sm",
                    isDark ? "bg-[#0b0c10] border-white/10" : "bg-white border-slate-200"
                  )}>
                    <span className="font-bold text-cyan-400 truncate">
                      {showPassword ? password : "••••••••••••"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors cursor-pointer",
                          isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                        )}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(password, "pass")}
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors cursor-pointer",
                          isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                        )}
                        title="Copy Password"
                      >
                        {copiedKey === "pass" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className={cn("p-3 rounded-xl border text-xs leading-relaxed", isDark ? "bg-[#0b0c10]/60 border-white/5 text-zinc-400" : "bg-white/70 border-slate-200 text-slate-600")}>
                <span className="font-semibold text-zinc-200 block mb-0.5">Quick Start Instructions:</span>
                {instructions}
              </div>
            </div>
          </div>
        ) : (
          /* STEP-BY-STEP CHECKLIST DURING INSTALLATION */
          <div className="space-y-3">
            <h4 className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Provisioning Progress
            </h4>
            <div className="space-y-2.5">
              {steps.map((st) => (
                <div
                  key={st.id}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors",
                    st.isDone
                      ? isDark ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : st.isActive
                      ? isDark ? "bg-cyan-950/20 border-cyan-500/30 text-white" : "bg-cyan-50 border-cyan-200 text-slate-900"
                      : isDark ? "bg-white/[0.02] border-white/5 text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-400"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border",
                      st.isDone
                        ? "bg-emerald-500 text-slate-950 border-emerald-400"
                        : st.isActive
                        ? "bg-cyan-400 text-slate-950 border-cyan-300 animate-pulse"
                        : isDark ? "bg-white/5 border-white/10 text-zinc-500" : "bg-slate-200 border-slate-300 text-slate-500"
                    )}>
                      {st.isDone ? <Check className="w-4 h-4 stroke-[3]" /> : st.id}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">{st.title}</span>
                      <span className="text-[11px] block truncate opacity-80">{st.desc}</span>
                    </div>
                  </div>

                  {st.isDone && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                      DONE
                    </span>
                  )}
                  {st.isActive && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold shrink-0 flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> RUNNING
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Terminal Logs */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
            <span className={cn("flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}>
              <Terminal className="w-3.5 h-3.5" />
              Live Deployment Log
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              {logs.length} events logged
            </span>
          </div>

          <div className={cn(
            "p-3.5 rounded-xl border font-mono text-[11px] leading-relaxed h-32 overflow-y-auto scrollbar-thin transition-colors",
            isDark ? "bg-[#050608] border-white/10 text-zinc-300" : "bg-slate-950 border-slate-800 text-emerald-400"
          )}>
            {logs.map((lg, idx) => (
              <div key={idx} className="truncate">
                {lg}
              </div>
            ))}
            {!isFinished && (
              <div className="text-cyan-400 animate-pulse flex items-center gap-1 mt-1">
                <span>&gt;</span>
                <span>Executing installation pipeline...</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2">
          {isFinished ? (
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3.5 px-6 rounded-2xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-cyan-400/20 transition-all cursor-pointer"
            >
              <span>OK, Go to VPS Dashboard</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <div className={cn(
              "p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 text-xs font-semibold text-center",
              isDark ? "bg-white/[0.03] border-white/10 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
            )}>
              <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                VPS management controls are temporarily locked during installation. Please wait until setup finishes.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  // Gate mode (renders directly in page view)
  return (
    <div className="w-full py-8 flex items-center justify-center min-h-[70vh]">
      {content}
    </div>
  );
}

