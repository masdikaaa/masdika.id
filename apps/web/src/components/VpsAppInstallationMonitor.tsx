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
import { resolveEffectiveAppUrl } from "@/lib/vps-app-urls";
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
  username?: string | null;
  assignedIps?: Array<string | { ipAddress: string; publicIp?: string }>;
  appName?: string | null;
  appVersion?: string | null;
  appStatus?: string | null; // INSTALLING | READY | FAILED | NONE
  appUrl?: string | null;
  appCredentials?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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

  // Parse credentials and logs directly from server
  let credentialsObj: any = null;
  if (statusData?.appCredentials) {
    try {
      credentialsObj = JSON.parse(statusData.appCredentials);
    } catch (e) {
      // fallback
    }
  }

  const serverProgress: number | null = typeof credentialsObj?.progress === "number" ? credentialsObj.progress : null;
  const serverStage: string | null = credentialsObj?.stage || null;
  const serverStageLabel: string | null = credentialsObj?.stageLabel || null;
  const serverLogs: string[] = Array.isArray(credentialsObj?.logs) ? credentialsObj.logs : [];

  const rawIp = statusData?.assignedIps?.[0];
  const primaryAssigned = Array.isArray(statusData?.assignedIps)
    ? (statusData.assignedIps.find((ip: any) => typeof ip === "object" && (ip as any).isPrimary) || statusData.assignedIps[0])
    : null;
  const baseIp = typeof rawIp === "string" 
    ? rawIp 
    : (primaryAssigned && typeof primaryAssigned === "object" ? (primaryAssigned as any).ipAddress : "");
  const assignedWithPublic = Array.isArray(statusData?.assignedIps)
    ? statusData.assignedIps.find((ip: any) => typeof ip === "object" && Boolean((ip as any).publicIp?.trim()))
    : null;
  const primaryIp = typeof rawIp === "string" 
    ? rawIp 
    : ((primaryAssigned && typeof primaryAssigned === "object" ? (primaryAssigned as any).publicIp?.trim() : null) || 
       (assignedWithPublic && typeof assignedWithPublic === "object" ? (assignedWithPublic as any).publicIp?.trim() : null) || 
       baseIp || "");

  const effectiveAppName = appName || statusData?.appName;
  let webUrl = resolveEffectiveAppUrl(
    statusData?.appUrl || credentialsObj?.loginUrl || (primaryIp && appDef ? `${appDef.defaultProtocol}://${primaryIp}:${appDef.defaultPort}${appDef.loginPath || ""}` : ""),
    primaryIp,
    baseIp,
    effectiveAppName
  );

  const isCliApp = appDef?.isWebAccess === false || appDef?.accessType === "cli";
  const customerSshUser = (statusData?.username && statusData.username.trim() && statusData.username !== "root")
    ? statusData.username.trim()
    : (isCliApp && credentialsObj?.username && credentialsObj.username !== "root" ? credentialsObj.username : (statusData?.username || "root"));
  const username = isCliApp
    ? customerSshUser
    : (credentialsObj?.username || appDef?.adminUsername || "admin");
  const password = credentialsObj?.password || fallbackPassword || "Configured VPS Root Password";
  const email = credentialsObj?.email || null;

  let instructions = credentialsObj?.instructions || appDef?.instructions?.replace(/\$\{ip\}/g, primaryIp || "your-ip") || "Log in using the credentials above.";
  if (instructions && primaryIp) {
    instructions = instructions.replace(/https?:\/\/([^\s/:]+)(:\d+)?/g, (match: string, host: string) => {
      return match.replace(host, primaryIp);
    });
    if (baseIp && baseIp !== primaryIp && instructions.includes(baseIp)) {
      instructions = instructions.split(baseIp).join(primaryIp);
    }
  }
  const errorText: string | null = credentialsObj?.error || null;

  const hasApp = Boolean(appDef || statusData?.appName || appName);
  const isFinished = hasApp
    ? statusData?.appStatus === "READY"
    : (statusData?.status === "RUNNING" || statusData?.status === "ACTIVE");
  const isFailed = statusData?.appStatus === "FAILED" || statusData?.status === "ERROR";

  // Derive real-time progress from server state (no fake math or stale localStorage)
  const rawProgress = isFinished
    ? 100
    : serverProgress !== null
    ? serverProgress
    : statusData?.status === "PROVISIONING"
    ? 15
    : (statusData?.appStatus === "INSTALLING" || statusData?.status === "INSTALLING")
    ? 70
    : 20;
  const progress = Math.min(100, Math.max(5, rawProgress));

  // Determine stage flags
  const isVpsReady = ["APP_STACK", "INIT", "SYSTEM", "INSTALLER", "VERIFY", "READY"].includes(serverStage || "") || statusData?.appStatus === "INSTALLING" || isFinished;
  const isStage2 = ["APP_STACK", "INIT", "SYSTEM", "INSTALLER", "VERIFY"].includes(serverStage || "") || statusData?.appStatus === "INSTALLING";

  const handleComplete = () => {
    try {
      localStorage.removeItem(`vps_progress_${vpsId}`);
    } catch {}
    onComplete();
  };

  // Status Polling from Server
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
      } catch (err) {
        console.error("Failed to poll VPS provisioning status:", err);
      }
    };

    fetchStatus();
    pollInterval = setInterval(fetchStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [vpsId]);

  // Real-time server-recorded logs
  const logs = React.useMemo(() => {
    if (serverLogs.length > 0) {
      const result = [...serverLogs];
      if (isFinished && !result.some(l => l.includes("[SUCCESS]"))) {
        result.push(`[${new Date().toLocaleTimeString("en-US", { hour12: false })}] [SUCCESS] All services verified and online.`);
      } else if (isFailed && !result.some(l => l.includes("[ERROR]"))) {
        result.push(`[${new Date().toLocaleTimeString("en-US", { hour12: false })}] [ERROR] Setup script encountered an error.`);
      }
      return result;
    }
    return [
      `[${new Date().toLocaleTimeString("en-US", { hour12: false })}] [HYPERVISOR] Initializing virtual machine provisioning...`
    ];
  }, [serverLogs, isFinished, isFailed]);

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
      } else {
        toast.error(data.error || "Failed to trigger retry");
      }
    } catch {
      toast.error("Network error retrying installation");
    } finally {
      setIsRetrying(false);
    }
  };

  // Real-time stage progression based directly on serverStage
  const isPastHypervisor = isFinished || ["CONFIGURING", "STORAGE", "BOOTING", "APP_STACK", "INIT", "SYSTEM", "INSTALLER", "VERIFY", "READY"].includes(serverStage || "");
  const isPastNetwork = isFinished || ["STORAGE", "BOOTING", "APP_STACK", "INIT", "SYSTEM", "INSTALLER", "VERIFY", "READY"].includes(serverStage || "");
  const isPastBootstrap = isFinished || ["APP_STACK", "INIT", "SYSTEM", "INSTALLER", "VERIFY", "READY"].includes(serverStage || "");

  const infraSteps = [
    {
      id: 1,
      title: "Hypervisor & VM Allocation",
      desc: serverStage === "CLONING"
        ? (serverStageLabel || "Cloning template disk in Proxmox...")
        : serverStage === "PURGING"
        ? "Purging previous instance disk..."
        : (statusData?.vmid ? `VMID ${statusData.vmid} allocated on Proxmox node` : "Dedicated CPU, RAM, & storage allocation"),
      isDone: isPastHypervisor,
      isActive: !isPastHypervisor
    },
    {
      id: 2,
      title: "Public IPv4 & Network Stack",
      desc: primaryIp ? `Assigned IP: ${primaryIp}` : "Allocating dedicated Public IPv4 address",
      isDone: isPastNetwork,
      isActive: isPastHypervisor && !isPastNetwork
    },
    {
      id: 3,
      title: "Base OS & Cloud-Init Bootstrap",
      desc: isPastBootstrap ? `${appDef?.osBase || "Linux"} booted & Guest Agent online` : `Booting ${appDef?.osBase || "Linux"} image`,
      isDone: isPastBootstrap,
      isActive: isPastNetwork && !isPastBootstrap
    }
  ];

  const isPastRuntime = ["INSTALLER", "VERIFY", "READY"].includes(serverStage || "") || isFinished;
  const isPastInstaller = ["VERIFY", "READY"].includes(serverStage || "") || isFinished;
  const isPastVerify = serverStage === "READY" || isFinished;

  const appSteps = hasApp ? [
    {
      id: 4,
      title: "Container Runtime & Environment",
      desc: isPastRuntime ? "Runtime dependencies & environment initialized" : "Setting up runtime dependencies & security policy",
      isDone: isPastRuntime,
      isActive: isPastBootstrap && !isPastRuntime
    },
    {
      id: 5,
      title: `${displayName} Deployment`,
      desc: isPastInstaller ? `${displayName} packages deployed` : `Deploying ${displayName} & opening port ${appDef?.defaultPort || 80}`,
      isDone: isPastInstaller,
      isActive: isPastRuntime && !isPastInstaller
    },
    {
      id: 6,
      title: "Health Check & Web Access",
      desc: isPastVerify ? "HTTP service verified & live" : "Verifying daemon endpoints & generating credentials",
      isDone: isPastVerify,
      isActive: isPastInstaller && !isPastVerify
    }
  ] : [];

  const currentPhaseName = isFinished
    ? (hasApp ? "APPLICATION READY" : "SERVER READY")
    : isFailed
    ? "SETUP ISSUE"
    : hasApp
    ? (isStage2 ? "STAGE 2 OF 2: APPLICATION STACK" : "STAGE 1 OF 2: CLOUD VPS INFRASTRUCTURE")
    : "DEPLOYING SERVER INFRASTRUCTURE";

  const currentHeadline = isFinished
    ? (hasApp ? `${displayName} is Ready!` : "Server is Ready!")
    : isFailed
    ? `${displayName} Installation Issue`
    : (serverStageLabel || (isStage2 ? `Deploying ${displayName} Stack` : "Deploying Cloud VPS Instance"));

  const currentSubtitle = isFinished
    ? (hasApp
        ? "All infrastructure and application services have been verified and are fully operational."
        : "Your dedicated virtual machine has been fully deployed, configured, and booted.")
    : isFailed
    ? (errorText || "Automated application setup encountered an error.")
    : isStage2
    ? `VPS infrastructure is online. Installing ${displayName} packages, configuring database, and opening port ${appDef?.defaultPort || 80}.`
    : (serverStage === "CLONING" ? "Transferring virtual disk template on Proxmox node..." : "Allocating dedicated hypervisor resources, network routing, and booting base OS image.");

  const content = (
    <div className={cn(
      "w-full rounded-2xl md:rounded-3xl border shadow-2xl overflow-hidden transition-all flex flex-col",
      mode === "modal" ? "max-w-6xl xl:max-w-7xl mx-auto my-auto" : "w-full",
      isDark ? "bg-[#0b0c10] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
    )}>
      {/* Top Banner / Deployment Header - Pure Cyan Branding (No Green) */}
      <div className={cn(
        "p-5 sm:p-6 border-b relative overflow-hidden shrink-0",
        isFinished 
          ? isDark ? "bg-gradient-to-r from-cyan-950/50 via-slate-900/60 to-transparent border-cyan-500/30" : "bg-gradient-to-r from-cyan-50 via-slate-50 to-transparent border-cyan-200"
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
                isFinished ? "border-cyan-400" : isFailed ? "border-rose-400" : isDark ? "border-cyan-400" : "border-cyan-500"
              )} />
              <div className={cn(
                "absolute inset-1.5 sm:inset-2 rounded-full border-b-2 border-l-2 animate-[spin_2s_linear_reverse]",
                isFinished ? "border-cyan-500/50" : isFailed ? "border-rose-500/50" : isDark ? "border-cyan-500/50" : "border-cyan-400/50"
              )} />
              {isFinished ? (
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 absolute inset-0 m-auto animate-in zoom-in-50 duration-300" />
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
                  isFinished 
                    ? isDark ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" : "text-cyan-800 border-cyan-300 bg-cyan-100 font-extrabold" 
                    : isFailed 
                    ? isDark ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : "text-rose-800 border-rose-300 bg-rose-100 font-extrabold"
                    : isDark ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" : "text-cyan-900 border-cyan-300 bg-cyan-100 font-extrabold"
                )}>
                  {currentPhaseName}
                </span>
                <span className={isDark ? "text-zinc-500" : "text-slate-400"}>•</span>
                <span className={cn("font-mono text-xs font-bold", isDark ? "text-zinc-300" : "text-slate-800")}>
                  {hasApp ? `${displayName} (${displayVersion})` : (statusData?.hostname || "Cloud VPS")}
                </span>
                <span className={isDark ? "text-zinc-500" : "text-slate-400"}>•</span>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border",
                  isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-100 text-cyan-900 border-cyan-300"
                )}>
                  <Clock className={cn("w-3 h-3", isDark ? "text-cyan-400" : "text-cyan-700")} />
                  <span>Est: {hasApp ? estimatedTime : "~3-5 mins"}</span>
                </span>
              </div>

              <h2 className={cn("text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-tight", isDark ? "text-white" : "text-slate-950")}>
                {currentHeadline}
              </h2>
              <p className={cn("text-xs max-w-2xl mt-0.5 leading-relaxed line-clamp-1 sm:line-clamp-none font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
                {currentSubtitle}
              </p>
            </div>
          </div>

          {/* Right: Percentage & Progress */}
          <div className="w-full md:w-64 shrink-0 flex flex-col justify-center">
            <div className="flex justify-between items-center text-xs font-mono font-semibold mb-1.5">
              <span className={isDark ? "text-zinc-400" : "text-slate-700 font-bold"}>
                {isFinished ? "100% Complete" : isFailed ? "Halted" : `${progress}% Provisioned`}
              </span>
              <span className={cn("font-bold text-base", isFinished ? (isDark ? "text-cyan-400" : "text-cyan-800") : isFailed ? "text-rose-500" : (isDark ? "text-cyan-400" : "text-cyan-800"))}>
                {progress}%
              </span>
            </div>
            <div className={cn("w-full h-2.5 rounded-full overflow-hidden p-0.5 border", isDark ? "bg-white/5 border-white/10" : "bg-slate-200 border-slate-300")}>
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  isFinished 
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_14px_rgba(34,211,238,0.5)]" 
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
              <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider mb-2">
                <span className={cn("flex items-center gap-1.5", isDark ? "text-cyan-400" : "text-cyan-950")}>
                  <Server className="w-3.5 h-3.5" />
                  {hasApp ? "Stage 1: Cloud VPS Infrastructure" : "Server Infrastructure Allocation"}
                </span>
                <span className={cn("text-[10px] font-mono font-bold", isDark ? "text-zinc-500" : "text-slate-600")}>
                  {isVpsReady || isFinished ? "COMPLETED" : "IN PROGRESS"}
                </span>
              </div>
              <div className="space-y-2">
                {infraSteps.map((st) => (
                  <div
                    key={st.id}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors text-xs",
                      st.isDone
                        ? isDark ? "bg-[#0a0a0c] border-white/[0.08] text-cyan-400" : "bg-white border-slate-200 text-slate-900 shadow-2xs"
                        : st.isActive
                        ? isDark ? "bg-[#111115] border-cyan-500/50 text-cyan-400 shadow-2xs ring-1 ring-cyan-500/20 relative overflow-hidden" : "bg-cyan-50/90 border-cyan-500 text-cyan-950 shadow-2xs ring-1 ring-cyan-400/40 relative overflow-hidden"
                        : isDark ? "bg-[#0a0a0c]/60 border-white/[0.06] text-zinc-500" : "bg-slate-50/80 border-slate-200/90 text-slate-500"
                    )}
                  >
                    {st.isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold border",
                        st.isDone
                          ? isDark ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" : "bg-cyan-100 text-cyan-800 border-cyan-300 font-extrabold"
                          : st.isActive
                          ? isDark ? "bg-cyan-400 text-slate-950 border-cyan-300" : "bg-cyan-500 text-white border-cyan-600 shadow-xs"
                          : isDark ? "bg-white/5 border-white/10 text-zinc-500" : "bg-slate-200 border-slate-300 text-slate-700"
                      )}>
                        {st.isDone ? <Check className="w-3 h-3 stroke-[3]" /> : st.id}
                      </div>
                      <div className="min-w-0">
                        <span className={cn("font-bold block truncate", isDark ? (st.isDone || st.isActive ? "text-white" : "text-zinc-400") : (st.isDone || st.isActive ? "text-slate-950" : "text-slate-700"))}>
                          {st.title}
                        </span>
                        <span className={cn("text-[10px] block truncate font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                          {st.desc}
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 shrink-0">
                      {st.isDone ? (
                        <span className={cn(
                          "text-[9px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border",
                          isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-800 border-cyan-300 font-extrabold"
                        )}>
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> DONE
                        </span>
                      ) : st.isActive ? (
                        <span className={cn(
                          "text-[9px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border animate-pulse",
                          isDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-cyan-200 text-cyan-950 border-cyan-400 font-extrabold"
                        )}>
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> PROVISIONING
                        </span>
                      ) : (
                        <span className={cn(
                          "text-[9px] font-mono px-1.5 py-0.5 rounded-full border",
                          isDark ? "bg-white/5 text-zinc-500 border-white/5" : "bg-slate-100 text-slate-600 border-slate-200 font-semibold"
                        )}>
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage 2: Application Stack */}
            {hasApp && (
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                  <span className={cn("flex items-center gap-1.5 font-extrabold", isDark ? (isVpsReady ? "text-cyan-400" : "text-zinc-500") : (isVpsReady ? "text-cyan-950" : "text-slate-600"))}>
                    <Rocket className="w-3.5 h-3.5" />
                    Stage 2: {displayName} Application Stack
                  </span>
                  <span className={cn("text-[10px] font-mono font-bold", isDark ? "text-zinc-500" : "text-slate-600")}>
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
                          ? isDark ? "bg-[#0a0a0c] border-white/[0.08] text-cyan-400" : "bg-white border-slate-200 text-slate-900 shadow-2xs"
                          : st.isActive
                          ? isDark ? "bg-[#111115] border-cyan-500/50 text-cyan-400 shadow-2xs ring-1 ring-cyan-500/20 relative overflow-hidden" : "bg-cyan-50/90 border-cyan-500 text-cyan-950 shadow-2xs ring-1 ring-cyan-400/40 relative overflow-hidden"
                          : isDark ? "bg-[#0a0a0c]/60 border-white/[0.06] text-zinc-500" : "bg-slate-50/80 border-slate-200/90 text-slate-500"
                      )}
                    >
                      {st.isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                      )}
                      <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold border",
                          st.isDone
                            ? isDark ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" : "bg-cyan-100 text-cyan-800 border-cyan-300 font-extrabold"
                            : st.isActive
                            ? isDark ? "bg-cyan-400 text-slate-950 border-cyan-300" : "bg-cyan-500 text-white border-cyan-600 shadow-xs"
                            : isDark ? "bg-white/5 border-white/10 text-zinc-500" : "bg-slate-200 border-slate-300 text-slate-700"
                        )}>
                          {st.isDone ? <Check className="w-3 h-3 stroke-[3]" /> : st.id}
                        </div>
                        <div className="min-w-0">
                          <span className={cn("font-bold block truncate", isDark ? (st.isDone || st.isActive ? "text-white" : "text-zinc-400") : (st.isDone || st.isActive ? "text-slate-950" : "text-slate-700"))}>
                            {st.title}
                          </span>
                          <span className={cn("text-[10px] block truncate font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                            {st.desc}
                          </span>
                        </div>
                      </div>

                      <div className="relative z-10 shrink-0">
                        {st.isDone ? (
                          <span className={cn(
                            "text-[9px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border",
                            isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-800 border-cyan-300 font-extrabold"
                          )}>
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> DONE
                          </span>
                        ) : st.isActive ? (
                          <span className={cn(
                            "text-[9px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border animate-pulse",
                            isDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-cyan-200 text-cyan-950 border-cyan-400 font-extrabold"
                          )}>
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> INSTALLING
                          </span>
                        ) : (
                          <span className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded-full border",
                            isDark ? "bg-white/5 text-zinc-500 border-white/5" : "bg-slate-100 text-slate-600 border-slate-200 font-semibold"
                          )}>
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom helper card on left */}
          <div className="pt-2">
            {!isFinished ? (
              <div className={cn(
                "p-3 rounded-xl border flex items-center gap-2 text-xs",
                isDark ? "bg-white/[0.02] border-white/5 text-zinc-400" : "bg-slate-100/90 border-slate-200 text-slate-700 font-medium"
              )}>
                <Lock className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                <span className="text-[11px] leading-relaxed">
                  Safe background server process. You can sign out or close this page at any time without interrupting the installation.
                </span>
              </div>
            ) : (
              <div className={cn(
                "p-3 rounded-xl border flex items-center gap-2 text-xs",
                isDark ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-900"
              )}>
                <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className="text-[11px] font-bold leading-relaxed">
                  All deployment stages completed successfully.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CREDENTIALS OR LIVE LOGS (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col min-h-[380px]">
          {isFinished ? (
            hasApp ? (
              /* FINISHED APP CREDENTIALS CARD - Pure Cyan Palette */
              <div className={cn(
                "p-5 rounded-2xl border flex flex-col justify-between h-full animate-in fade-in zoom-in-95 duration-300",
                isDark ? "bg-[#11131a] border-cyan-500/30 shadow-[0_0_25px_rgba(34,211,238,0.15)]" : "bg-cyan-50/70 border-cyan-200"
              )}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span>{appDef?.isWebAccess === false ? "Application Credentials & Terminal Access" : "Application Web Access Credentials"}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                      ONLINE & READY
                    </span>
                  </div>

                  {/* Note for Non-Browser (CLI/Database) Apps */}
                  {appDef?.isWebAccess === false && (
                    <div className={cn(
                      "p-3 rounded-xl border text-xs flex items-start gap-2.5",
                      isDark ? "bg-amber-950/20 border-amber-800/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900"
                    )}>
                      <Terminal className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong className="font-semibold">No Browser UI Required:</strong>{" "}
                        <span>{appDef?.accessNote || "This application is operated directly via SSH terminal or remote client (no web browser dashboard)."}</span>
                      </div>
                    </div>
                  )}

                  {/* Access Command / Web Access URL */}
                  {appDef?.isWebAccess === false ? (
                    <div>
                      <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {appDef?.accessType === "database" ? "Database Connection Endpoint" : "SSH Terminal Command"}
                      </label>
                      <div className={cn(
                        "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                        isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
                      )}>
                        <span className="font-bold text-cyan-400 truncate">
                          {appDef?.accessType === "database"
                            ? (webUrl || `${appDef.id}://${username || "root"}:${password || "your-pass"}@${primaryIp || "your-ip"}:${appDef.defaultPort}`)
                            : `ssh ${customerSshUser}@${primaryIp || "your-ip"}`}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const val = appDef?.accessType === "database"
                                ? (webUrl || `${appDef.id}://${username || "root"}:${password || "your-pass"}@${primaryIp || "your-ip"}:${appDef.defaultPort}`)
                                : `ssh ${customerSshUser}@${primaryIp || "your-ip"}`;
                              copyToClipboard(val, "ssh-cmd");
                            }}
                            className={cn(
                              "p-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5",
                              isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                            )}
                            title="Copy command"
                          >
                            {copiedKey === "ssh-cmd" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="text-[11px] font-semibold">Copy {appDef?.accessType === "database" ? "URI" : "SSH"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                            {copiedKey === "url" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                  )}

                  {/* Username & Password with Eye toggle */}
                  <div className={cn("grid gap-3", email ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
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
                          {copiedKey === "user" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                            {copiedKey === "pass" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Email if present */}
                    {email && (
                      <div>
                        <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Admin Email
                        </label>
                        <div className={cn(
                          "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                          isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
                        )}>
                          <span className="font-bold truncate text-cyan-400">{email}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(email, "email")}
                            className={cn(
                              "p-1.5 rounded-lg border transition-colors cursor-pointer",
                              isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                            )}
                            title="Copy Email"
                          >
                            {copiedKey === "email" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
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
                    onClick={handleComplete}
                    className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20 transition-all cursor-pointer"
                  >
                    <span>OK, Go to VPS Dashboard</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ) : (
              /* FINISHED SERVER CREDENTIALS CARD (PURE VPS) - Pure Cyan Palette */
              <div className={cn(
                "p-5 rounded-2xl border flex flex-col justify-between h-full animate-in fade-in zoom-in-95 duration-300",
                isDark ? "bg-[#11131a] border-cyan-500/30 shadow-[0_0_25px_rgba(34,211,238,0.15)]" : "bg-cyan-50/70 border-cyan-200"
              )}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span>Server Access & Credentials</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                      ONLINE & READY
                    </span>
                  </div>

                  {/* Primary IP */}
                  <div>
                    <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Dedicated Public IPv4
                    </label>
                    <div className={cn(
                      "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                      isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
                    )}>
                      <span className="font-bold text-cyan-400 truncate">
                        {primaryIp || "Configured"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(primaryIp, "ip")}
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors cursor-pointer",
                          isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                        )}
                        title="Copy IP"
                      >
                        {copiedKey === "ip" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* SSH Command */}
                  <div>
                    <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                      SSH Connect Command
                    </label>
                    <div className={cn(
                      "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                      isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
                    )}>
                      <span className="text-zinc-300 truncate">
                        ssh {customerSshUser}@{primaryIp || "your-ip"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`ssh ${customerSshUser}@${primaryIp || "your-ip"}`, "ssh")}
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors cursor-pointer",
                          isDark ? "border-white/10 hover:bg-white/10 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                        )}
                        title="Copy SSH Command"
                      >
                        {copiedKey === "ssh" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* User & Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                        Default User
                      </label>
                      <div className={cn(
                        "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                        isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
                      )}>
                        <span className="font-bold truncate">{username}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(username, "user")}
                          className="p-1 text-zinc-400 hover:text-white transition-colors"
                        >
                          {copiedKey === "user" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={cn("block text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                        Root Password
                      </label>
                      <div className={cn(
                        "flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-xs",
                        isDark ? "bg-[#07080b] border-white/10" : "bg-white border-slate-200"
                      )}>
                        <span className="font-bold text-amber-300 truncate">
                          {showPassword ? password : "••••••••••••"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 text-zinc-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(password, "pass")}
                            className="p-1 text-zinc-400 hover:text-white transition-colors"
                          >
                            {copiedKey === "pass" ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-black text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20 transition-all cursor-pointer"
                  >
                    <span>OK, Go to VPS Dashboard</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )
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
                  onClick={handleComplete}
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
            /* LIVE TERMINAL LOGS CONSOLE (Fills the entire right column) */
            <div className="flex flex-col h-full min-h-[380px]">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                <span className={cn("flex items-center gap-1.5 font-extrabold", isDark ? "text-zinc-400" : "text-slate-800")}>
                  <Terminal className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                  Live Deployment Console
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-600 font-semibold")}>
                    {logs.length} events logged
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(logs.join("\n"), "logs")}
                    className={cn(
                      "p-1 px-2 rounded-md border text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer",
                      isDark ? "border-white/10 hover:bg-white/10 text-zinc-400" : "border-slate-300 hover:bg-slate-100 text-slate-800 bg-white font-bold shadow-2xs"
                    )}
                    title="Copy all logs"
                  >
                    {copiedKey === "logs" ? <Check className="w-3 h-3 text-cyan-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div
                ref={logContainerRef}
                className={cn(
                  "p-3.5 rounded-2xl border font-mono text-[11px] leading-relaxed flex-1 overflow-y-auto scrollbar-thin transition-colors select-text max-h-[360px]",
                  isDark ? "bg-[#050608] border-white/10 text-zinc-300" : "bg-slate-950 border-slate-800 text-cyan-400"
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

  // Gate mode (renders directly in dashboard vps page with full width)
  return (
    <div className="w-full py-2">
      {content}
    </div>
  );
}
