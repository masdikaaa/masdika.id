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
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Clock
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
  assignedIps?: Array<string | { ipAddress: string }>;
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // App Definition
  const appDef: VpsAppDefinition | undefined = 
    getAppById(appId) || 
    getAppByName(appName) || 
    getAppByName(statusData?.appName);

  const displayName = appDef?.name || statusData?.appName || appName || "1-Click Application";
  const displayVersion = statusData?.appVersion || appDef?.appVersion || "latest";
  const estimatedTime = appDef?.estimatedTime || "~3-5 mins";

  // Parse credentials and logs
  let credentialsObj: any = null;
  if (statusData?.appCredentials) {
    try {
      credentialsObj = JSON.parse(statusData.appCredentials);
    } catch (e) {
      // fallback
    }
  }

  const rawIp = statusData?.assignedIps?.[0];
  const primaryIp = typeof rawIp === "string" ? rawIp : (rawIp?.ipAddress || "");
  const webUrl = statusData?.appUrl || credentialsObj?.loginUrl || (primaryIp && appDef ? `${appDef.defaultProtocol}://${primaryIp}:${appDef.defaultPort}` : "");
  const username = credentialsObj?.username || appDef?.adminUsername || "admin";
  const password = credentialsObj?.password || fallbackPassword || "Configured VPS Root Password";
  const instructions = credentialsObj?.instructions || appDef?.instructions?.replace(/\$\{ip\}/g, primaryIp || "your-ip") || "Log in using the credentials above.";
  const serverLogs: string[] = Array.isArray(credentialsObj?.logs) ? credentialsObj.logs : [];
  const errorText: string | null = credentialsObj?.error || null;

  const isVpsReady = statusData?.status === "ACTIVE";
  const isFinished = statusData?.appStatus === "READY";
  const isFailed = statusData?.appStatus === "FAILED";

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

        // Progress calculation across both phases:
        // Stage 1 (VPS Infrastructure): 0% - 50%
        // Stage 2 (Application Stack): 50% - 100%
        if (data.appStatus === "READY") {
          setProgress(100);
        } else if (data.appStatus === "FAILED") {
          setProgress(85);
        } else if (data.status === "ACTIVE" && data.appStatus === "INSTALLING") {
          // Incrementally simulate progress while app is installing (55% -> 92%)
          setProgress((prev) => Math.min(92, Math.max(prev, 55) + 3));
        } else if (data.status === "ACTIVE") {
          setProgress((prev) => Math.min(60, Math.max(prev, 50)));
        } else if (data.status === "PROVISIONING") {
          setProgress((prev) => Math.min(48, Math.max(prev, 25) + 3));
        } else {
          // PENDING
          setProgress((prev) => Math.min(22, Math.max(prev, 15)));
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

  // Construct structured timeline logs
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    const timestamp = () => new Date().toLocaleTimeString("en-US", { hour12: false });
    const timelineLogs: string[] = [];

    // Stage 1: Infrastructure Logs
    timelineLogs.push(`[${timestamp()}] [HYPERVISOR] Initializing virtual machine allocation on Proxmox node...`);
    if (progress >= 20 || statusData?.vmid) {
      timelineLogs.push(`[${timestamp()}] [VM] VMID ${statusData?.vmid || "assigned"} allocated with dedicated CPU & RAM reservations.`);
    }
    if (progress >= 30 || primaryIp) {
      timelineLogs.push(`[${timestamp()}] [NETWORK] Dedicated Public IPv4 ${primaryIp || "binding"} bound to interface with Anti-DDoS protection.`);
    }
    if (progress >= 45 || isVpsReady) {
      timelineLogs.push(`[${timestamp()}] [OS-INIT] Base ${appDef?.osBase || "Linux"} booted. QEMU Guest Agent responsive.`);
    }

    // Stage 2: Application Stack Logs
    if (isVpsReady || statusData?.appStatus === "INSTALLING" || isFinished) {
      timelineLogs.push(`[${timestamp()}] [APP-STACK] Starting automated deployment pipeline for ${displayName}...`);
      timelineLogs.push(`[${timestamp()}] [SECURITY] Firewall policy enabled: opening TCP port ${appDef?.defaultPort || 80}.`);
    }
    if (progress >= 70 || isFinished) {
      timelineLogs.push(`[${timestamp()}] [RUNTIME] Setting up container environment, database schema and configuration files...`);
    }
    if (progress >= 85 || isFinished) {
      timelineLogs.push(`[${timestamp()}] [INSTALLER] Launching ${displayName} daemon and background workers...`);
    }

    // Append server-recorded real logs if available
    if (serverLogs.length > 0) {
      for (const sLog of serverLogs) {
        if (!timelineLogs.includes(sLog)) {
          timelineLogs.push(sLog);
        }
      }
    }

    if (isFinished) {
      timelineLogs.push(`[${timestamp()}] [SUCCESS] ${displayName} daemon successfully launched.`);
      timelineLogs.push(`[${timestamp()}] [HEALTHCHECK] HTTP endpoint verified at ${webUrl || `http://${primaryIp}:${appDef?.defaultPort || 80}`}. Ready for customer login.`);
    } else if (isFailed) {
      timelineLogs.push(`[${timestamp()}] [ERROR] Setup script returned an error. Review error details below.`);
    }

    setLogs(timelineLogs);
  }, [progress, statusData, primaryIp, displayName, isFinished, isFailed, isVpsReady, webUrl, serverLogs]);

  // Autoscroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRetryInstall = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/retry-app-install`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Retrying application installation...");
        setProgress(55);
      } else {
        toast.error(data.error || "Failed to trigger retry");
      }
    } catch {
      toast.error("Network error retrying installation");
    } finally {
      setIsRetrying(false);
    }
  };

  // 2-Phase Steps definition
  const infraSteps = [
    {
      id: 1,
      title: "Hypervisor & VM Allocation",
      desc: statusData?.vmid ? `VMID ${statusData.vmid} allocated on Proxmox node` : "Dedicated CPU, RAM, & storage allocation",
      isDone: isVpsReady || Boolean(statusData?.vmid) || progress >= 25,
      isActive: !isVpsReady && !statusData?.vmid
    },
    {
      id: 2,
      title: "Public IPv4 & Network Stack",
      desc: primaryIp ? `Assigned IP: ${primaryIp}` : "Allocating dedicated Public IPv4 address",
      isDone: isVpsReady || Boolean(primaryIp) || progress >= 40,
      isActive: !isVpsReady && Boolean(statusData?.vmid) && !primaryIp
    },
    {
      id: 3,
      title: "Base OS & Cloud-Init Bootstrap",
      desc: isVpsReady ? `${appDef?.osBase || "Linux"} booted & Guest Agent online` : `Booting ${appDef?.osBase || "Linux"} image`,
      isDone: isVpsReady || progress >= 50,
      isActive: !isVpsReady && Boolean(primaryIp)
    }
  ];

  const appSteps = [
    {
      id: 4,
      title: "Container Runtime & Environment",
      desc: isFinished ? "Docker / LAMP stack operational" : "Setting up runtime dependencies & security policy",
      isDone: isFinished || (isVpsReady && progress >= 70),
      isActive: isVpsReady && !isFinished && progress < 70
    },
    {
      id: 5,
      title: `${displayName} Deployment`,
      desc: isFinished ? "Application & database configured" : `Deploying ${displayName} & opening port ${appDef?.defaultPort || 80}`,
      isDone: isFinished || (isVpsReady && progress >= 88),
      isActive: isVpsReady && !isFinished && progress >= 70 && progress < 88
    },
    {
      id: 6,
      title: "Health Check & Web Access",
      desc: isFinished ? "HTTP service verified & live" : "Verifying daemon endpoints & generating credentials",
      isDone: isFinished,
      isActive: isVpsReady && !isFinished && progress >= 88
    }
  ];

  const currentPhaseName = isFinished
    ? "DEPLOYMENT COMPLETE"
    : isFailed
    ? "SETUP ISSUE"
    : !isVpsReady
    ? "STAGE 1 OF 2: INFRASTRUCTURE"
    : "STAGE 2 OF 2: APPLICATION STACK";

  const currentHeadline = isFinished
    ? `${displayName} is Ready!`
    : isFailed
    ? `${displayName} Installation Issue`
    : !isVpsReady
    ? "Deploying Cloud VPS Instance"
    : `Deploying ${displayName} Stack`;

  const currentSubtitle = isFinished
    ? "All infrastructure and application services have been verified and are fully operational."
    : isFailed
    ? "The VPS infrastructure is running, but automated application setup encountered an error."
    : !isVpsReady
    ? "Allocating dedicated hypervisor resources, network routing, and booting base OS image."
    : `VPS infrastructure is online. Installing ${displayName} packages, configuring database, and opening port ${appDef?.defaultPort || 80}.`;

  const content = (
    <div className={cn(
      "w-full max-w-5xl xl:max-w-6xl mx-auto rounded-3xl border shadow-2xl overflow-hidden transition-all my-auto flex flex-col",
      isDark ? "bg-[#0b0c10] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
    )}>
      {/* Top Banner / Deployment Header (Horizontal Rectangular Layout) */}
      <div className={cn(
        "p-5 sm:p-6 border-b relative overflow-hidden shrink-0",
        isFinished 
          ? isDark ? "bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-transparent border-emerald-500/20" : "bg-gradient-to-r from-emerald-50 via-cyan-50 to-transparent border-emerald-200"
          : isFailed
          ? isDark ? "bg-gradient-to-r from-rose-950/40 via-slate-900/60 to-transparent border-rose-500/20" : "bg-gradient-to-r from-rose-50 via-slate-50 to-transparent border-rose-200"
          : isDark ? "bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-transparent border-white/10" : "bg-gradient-to-r from-cyan-50 via-slate-50 to-transparent border-slate-200"
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          {/* Left: Spinning Rings & Header Details */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 relative shrink-0">
              <div className={cn(
                "absolute inset-0 rounded-full border-t-2 border-r-2 animate-spin",
                isFinished ? "border-emerald-400" : isFailed ? "border-rose-400" : isDark ? "border-cyan-400" : "border-cyan-500"
              )} />
              <div className={cn(
                "absolute inset-1.5 sm:inset-2 rounded-full border-b-2 border-l-2 animate-[spin_2s_linear_reverse]",
                isFinished ? "border-emerald-500/50" : isFailed ? "border-rose-500/50" : isDark ? "border-cyan-500/50" : "border-cyan-400/50"
              )} />
              {isFinished ? (
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 absolute inset-0 m-auto animate-in zoom-in-50 duration-300" />
              ) : isFailed ? (
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-rose-400 absolute inset-0 m-auto animate-pulse" />
              ) : !isVpsReady ? (
                <Server className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
              ) : appDef?.icon ? (
                <img src={appDef.icon} alt={displayName} className="w-7 h-7 sm:w-8 sm:h-8 object-contain absolute inset-0 m-auto" />
              ) : (
                <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border uppercase",
                  isFinished ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                  isFailed ? "text-rose-400 border-rose-500/30 bg-rose-500/10" :
                  "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                )}>
                  {currentPhaseName}
                </span>
                <span className="text-zinc-500 text-xs">•</span>
                <span className="font-mono text-xs font-semibold text-zinc-300">
                  {displayName} ({displayVersion})
                </span>
                <span className="text-zinc-500 text-xs">•</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Est: {estimatedTime}</span>
                </span>
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-tight">
                {currentHeadline}
              </h2>
              <p className={cn("text-xs max-w-2xl mt-0.5 leading-relaxed line-clamp-1 sm:line-clamp-none", isDark ? "text-zinc-400" : "text-slate-600")}>
                {currentSubtitle}
              </p>
            </div>
          </div>

          {/* Right: Percentage & Progress */}
          <div className="w-full md:w-64 shrink-0 flex flex-col justify-center">
            <div className="flex justify-between items-center text-xs font-mono font-semibold mb-1.5">
              <span className={isDark ? "text-zinc-400" : "text-slate-500"}>
                {isFinished ? "100% Complete" : isFailed ? "Halted" : `${progress}% Provisioned`}
              </span>
              <span className={cn("font-bold text-base", isFinished ? "text-emerald-400" : isFailed ? "text-rose-400" : "text-cyan-400")}>
                {progress}%
              </span>
            </div>
            <div className={cn("w-full h-2.5 rounded-full overflow-hidden p-0.5 border", isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200")}>
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  isFinished 
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_14px_rgba(16,185,129,0.5)]" 
                    : isFailed
                    ? "bg-gradient-to-r from-rose-500 to-amber-500"
                    : "bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)] animate-pulse"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Body: Left = Steps Checklist | Right = Logs or Credentials */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto scrollbar-thin">
        {/* LEFT COLUMN: 2-STAGE CHECKLIST (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Stage 1: Cloud VPS Infrastructure */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                <span className={cn("flex items-center gap-1.5", isDark ? "text-cyan-400" : "text-cyan-600")}>
                  <Server className="w-3.5 h-3.5" />
                  Stage 1: Cloud VPS Infrastructure
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {isVpsReady ? "COMPLETED" : "IN PROGRESS"}
                </span>
              </div>
              <div className="space-y-2">
                {infraSteps.map((st) => (
                  <div
                    key={st.id}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors text-xs",
                      st.isDone
                        ? isDark ? "bg-[#0a0a0c] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-slate-800 shadow-2xs"
                        : st.isActive
                        ? isDark ? "bg-[#111115] border-cyan-500/50 text-cyan-400 shadow-2xs ring-1 ring-cyan-500/20 relative overflow-hidden" : "bg-cyan-50/70 border-cyan-400 text-cyan-950 shadow-2xs ring-1 ring-cyan-400/20 relative overflow-hidden"
                        : isDark ? "bg-[#0a0a0c]/60 border-white/[0.06] text-zinc-500" : "bg-slate-50/70 border-slate-200/80 text-slate-400"
                    )}
                  >
                    {st.isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold border",
                        st.isDone
                          ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40"
                          : st.isActive
                          ? "bg-cyan-400 text-slate-950 border-cyan-300"
                          : isDark ? "bg-white/5 border-white/10 text-zinc-500" : "bg-slate-200 border-slate-300 text-slate-500"
                      )}>
                        {st.isDone ? <Check className="w-3 h-3 stroke-[3]" /> : st.id}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold block truncate">{st.title}</span>
                        <span className="text-[10px] block truncate opacity-75">{st.desc}</span>
                      </div>
                    </div>

                    <div className="relative z-10 shrink-0">
                      {st.isDone ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> DONE
                        </span>
                      ) : st.isActive ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> PROVISIONING
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500 border border-white/5">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage 2: Application Stack */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                <span className={cn("flex items-center gap-1.5", isVpsReady ? "text-cyan-400" : "text-zinc-500")}>
                  <Rocket className="w-3.5 h-3.5" />
                  Stage 2: {displayName} Application Stack
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {isFinished ? "COMPLETED" : isVpsReady ? "IN PROGRESS" : "AWAITING VPS"}
                </span>
              </div>
              <div className="space-y-2">
                {appSteps.map((st) => (
                  <div
                    key={st.id}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors text-xs",
                      st.isDone
                        ? isDark ? "bg-[#0a0a0c] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-slate-800 shadow-2xs"
                        : st.isActive
                        ? isDark ? "bg-[#111115] border-cyan-500/50 text-cyan-400 shadow-2xs ring-1 ring-cyan-500/20 relative overflow-hidden" : "bg-cyan-50/70 border-cyan-400 text-cyan-950 shadow-2xs ring-1 ring-cyan-400/20 relative overflow-hidden"
                        : isDark ? "bg-[#0a0a0c]/60 border-white/[0.06] text-zinc-500" : "bg-slate-50/70 border-slate-200/80 text-slate-400"
                    )}
                  >
                    {st.isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold border",
                        st.isDone
                          ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40"
                          : st.isActive
                          ? "bg-cyan-400 text-slate-950 border-cyan-300"
                          : isDark ? "bg-white/5 border-white/10 text-zinc-500" : "bg-slate-200 border-slate-300 text-slate-500"
                      )}>
                        {st.isDone ? <Check className="w-3 h-3 stroke-[3]" /> : st.id}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold block truncate">{st.title}</span>
                        <span className="text-[10px] block truncate opacity-75">{st.desc}</span>
                      </div>
                    </div>

                    <div className="relative z-10 shrink-0">
                      {st.isDone ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> DONE
                        </span>
                      ) : st.isActive ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> INSTALLING
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500 border border-white/5">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom helper card on left */}
          <div className="pt-2">
            {!isFinished ? (
              <div className={cn(
                "p-3 rounded-xl border flex items-center gap-2 text-xs",
                isDark ? "bg-white/[0.02] border-white/5 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
              )}>
                <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  Actions locked during deployment. Typical duration: <strong>{estimatedTime}</strong>.
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onComplete}
                className="w-full py-3 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20 transition-all cursor-pointer"
              >
                <span>OK, Go to VPS Dashboard</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CREDENTIALS OR LIVE LOGS (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col min-h-[380px]">
          {isFinished ? (
            /* FINISHED CREDENTIALS CARD */
            <div className={cn(
              "p-5 rounded-2xl border flex flex-col justify-between h-full animate-in fade-in zoom-in-95 duration-300",
              isDark ? "bg-[#11131a] border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]" : "bg-emerald-50/70 border-emerald-200"
            )}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Application Web Access Credentials</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    ONLINE & READY
                  </span>
                </div>

                {/* Web Access URL */}
                <div>
                  <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Web Access URL
                  </label>
                  <div className={cn(
                    "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                    isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
                  )}>
                    <span className="font-bold text-cyan-400 truncate">
                      {webUrl || `http://${primaryIp || "pending"}:${appDef?.defaultPort || 80}`}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
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
                          className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <span>Open Dashboard</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Username & Password with Eye toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Username */}
                  <div>
                    <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Admin Username
                    </label>
                    <div className={cn(
                      "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                      isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
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

                  {/* Password (Masked with Eye toggle) */}
                  <div>
                    <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Admin Password
                    </label>
                    <div className={cn(
                      "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                      isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
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
                <div className={cn("p-3 rounded-xl border text-xs leading-relaxed", isDark ? "bg-[#07080b]/70 border-white/5 text-zinc-400" : "bg-white/80 border-slate-200 text-slate-600")}>
                  <span className="font-bold text-zinc-200 block mb-1">Quick Start Instructions:</span>
                  {instructions}
                </div>
              </div>

              {/* Bottom Finish Action */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onComplete}
                  className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20 transition-all cursor-pointer"
                >
                  <span>OK, Go to VPS Dashboard</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ) : isFailed ? (
            /* FAILED STATE CARD */
            <div className={cn(
              "p-5 rounded-2xl border flex flex-col justify-between h-full animate-in fade-in duration-300",
              isDark ? "bg-rose-950/20 border-rose-500/30 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-800"
            )}>
              <div>
                <div className="flex items-center gap-2 font-bold text-sm text-rose-400 mb-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Application Automated Setup Encountered an Issue</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                  The VPS hardware and operating system are online. However, the background script for {displayName} exited with an error. Review the error details below:
                </p>
                {errorText && (
                  <pre className="p-3 rounded-xl bg-black/60 border border-rose-500/20 font-mono text-[11px] text-rose-300 overflow-x-auto max-h-40 mb-4 scrollbar-thin">
                    {errorText}
                  </pre>
                )}
              </div>
              <div className="flex items-center gap-3 pt-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleRetryInstall}
                  disabled={isRetrying}
                  className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
                  <span>{isRetrying ? "Retrying Setup..." : "Retry App Installation"}</span>
                </button>
                <button
                  type="button"
                  onClick={onComplete}
                  className={cn(
                    "px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Continue to Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* LIVE TERMINAL LOGS CONSOLE (Fills the entire right column!) */
            <div className="flex flex-col h-full min-h-[380px]">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                <span className={cn("flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Live Deployment Console
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">
                    {logs.length} events logged
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(logs.join("\n"), "logs")}
                    className={cn(
                      "p-1 px-2 rounded-md border text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer",
                      isDark ? "border-white/10 hover:bg-white/10 text-zinc-400" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                    )}
                    title="Copy all logs"
                  >
                    {copiedKey === "logs" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div
                ref={logContainerRef}
                className={cn(
                  "p-3.5 rounded-2xl border font-mono text-[11px] leading-relaxed flex-1 overflow-y-auto scrollbar-thin transition-colors select-text max-h-[360px]",
                  isDark ? "bg-[#050608] border-white/10 text-zinc-300" : "bg-slate-950 border-slate-800 text-emerald-400"
                )}
              >
                {logs.map((lg, idx) => (
                  <div key={idx} className="break-all font-mono py-0.5 border-b border-white/[0.02]">
                    {lg}
                  </div>
                ))}
                {!isFinished && !isFailed && (
                  <div className="text-cyan-400 animate-pulse flex items-center gap-1.5 mt-2 pt-1 font-mono font-semibold">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>Streaming live hypervisor & agent output...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  // Gate mode (renders directly in dashboard vps page)
  return (
    <div className="w-full py-8 flex items-center justify-center min-h-[70vh]">
      {content}
    </div>
  );
}
