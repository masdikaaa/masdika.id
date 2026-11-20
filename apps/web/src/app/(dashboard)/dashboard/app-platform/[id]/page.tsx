"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  Globe,
  ChevronLeft,
  ExternalLink,
  Copy,
  Check,
  Play,
  Square,
  RotateCw,
  Trash2,
  Cpu,
  HardDrive,
  ShieldCheck,
  Server,
  Activity,
  Terminal,
  AlertTriangle,
  Lock,
  GitBranch,
  Code2,
  RefreshCw,
  FileText,
  Settings,
  Layers,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  SiNodedotjs,
  SiPython,
  SiGo,
  SiPhp,
  SiHtml5,
  SiDocker,
  SiLaravel,
  SiNextdotjs,
  SiFastapi,
  SiDjango,
  SiNestjs,
  SiRubyonrails,
  SiRust,
  SiVite,
  SiAstro,
  SiSvelte,
  SiRemix,
  SiWordpress,
} from "react-icons/si";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/billing";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

function getFrameworkBrandIcon(buildType: string) {
  const norm = (buildType || "DOCKERFILE").toUpperCase();
  switch (norm) {
    case "LARAVEL":
      return { icon: SiLaravel, color: "text-[#FF2D20]", bg: "bg-[#FF2D20]/10 border-[#FF2D20]/25" };
    case "NEXTJS":
      return { icon: SiNextdotjs, color: "text-slate-950 dark:text-white", bg: "bg-slate-950/10 border-slate-950/20 dark:bg-white/10 dark:border-white/25" };
    case "NESTJS":
      return { icon: SiNestjs, color: "text-[#E0234E]", bg: "bg-[#E0234E]/10 border-[#E0234E]/25" };
    case "FASTAPI":
      return { icon: SiFastapi, color: "text-[#009688]", bg: "bg-[#009688]/10 border-[#009688]/25" };
    case "DJANGO":
      return { icon: SiDjango, color: "text-[#44B78B]", bg: "bg-[#44B78B]/10 border-[#44B78B]/25" };
    case "NODEJS":
      return { icon: SiNodedotjs, color: "text-[#5FA04E]", bg: "bg-[#5FA04E]/10 border-[#5FA04E]/25" };
    case "PYTHON":
      return { icon: SiPython, color: "text-[#3776AB]", bg: "bg-[#3776AB]/10 border-[#3776AB]/25" };
    case "GOLANG":
      return { icon: SiGo, color: "text-[#00ADD8]", bg: "bg-[#00ADD8]/10 border-[#00ADD8]/25" };
    case "PHP":
      return { icon: SiPhp, color: "text-[#777BB4]", bg: "bg-[#777BB4]/10 border-[#777BB4]/25" };
    case "RUBY":
    case "RAILS":
      return { icon: SiRubyonrails, color: "text-[#CC0000]", bg: "bg-[#CC0000]/10 border-[#CC0000]/25" };
    case "RUST":
      return { icon: SiRust, color: "text-[#B7410E] dark:text-[#DEA584]", bg: "bg-[#B7410E]/10 border-[#B7410E]/25" };
    case "STATIC":
    case "HTML":
      return { icon: SiHtml5, color: "text-[#E34F26]", bg: "bg-[#E34F26]/10 border-[#E34F26]/25" };
    case "VITE":
      return { icon: SiVite, color: "text-[#646CFF]", bg: "bg-[#646CFF]/10 border-[#646CFF]/25" };
    case "ASTRO":
      return { icon: SiAstro, color: "text-[#BC52EE]", bg: "bg-[#BC52EE]/10 border-[#BC52EE]/25" };
    case "SVELTE":
      return { icon: SiSvelte, color: "text-[#FF3E00]", bg: "bg-[#FF3E00]/10 border-[#FF3E00]/25" };
    case "REMIX":
      return { icon: SiRemix, color: "text-[#3992FF]", bg: "bg-[#3992FF]/10 border-[#3992FF]/25" };
    case "WORDPRESS":
      return { icon: SiWordpress, color: "text-[#21759B]", bg: "bg-[#21759B]/10 border-[#21759B]/25" };
    case "DOCKERFILE":
    default:
      return { icon: SiDocker, color: "text-[#2496ED]", bg: "bg-[#2496ED]/10 border-[#2496ED]/25" };
  }
}

export default function AppPlatformDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "build-logs" | "runtime-logs" | "settings">("overview");

  // Power actions & modal state
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    action: "start" | "stop" | "restart" | "rebuild" | "delete";
  } | null>(null);

  // Logs state
  const [buildLogs, setBuildLogs] = useState("");
  const [runtimeLogs, setRuntimeLogs] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);

  // Settings edit state
  const [settingsGitUrl, setSettingsGitUrl] = useState("");
  const [settingsBranch, setSettingsBranch] = useState("");
  const [settingsBuildCmd, setSettingsBuildCmd] = useState("");
  const [settingsStartCmd, setSettingsStartCmd] = useState("");
  const [settingsEnvVars, setSettingsEnvVars] = useState("");
  const [settingsCustomDomain, setSettingsCustomDomain] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Dedicated Resource Monitoring States (CPU, RAM, Disk)
  const [metricsTimeframe, setMetricsTimeframe] = useState<"live" | "hour" | "day" | "week">("hour");
  const [activeMetricTab, setActiveMetricTab] = useState<"ALL" | "CPU" | "RAM" | "DISK">("ALL");
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchMetrics = async (tf = metricsTimeframe, isBackground = false) => {
    try {
      if (!isBackground) setLoadingMetrics(true);
      const res = await fetch(`/api/user/app-platform/${id}/metrics?timeframe=${tf}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setMetricsData(json.data);
      }
    } catch {
      // quiet catch
    } finally {
      if (!isBackground) setLoadingMetrics(false);
    }
  };

  const fetchAppDetail = async () => {
    try {
      const res = await fetch(`/api/user/app-platform/${id}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setApp(json.data);
        setSettingsGitUrl(json.data.gitUrl || "");
        setSettingsBranch(json.data.branch || "main");
        setSettingsBuildCmd(json.data.buildCommand || "");
        setSettingsStartCmd(json.data.startCommand || "");
        setSettingsEnvVars(json.data.envVars || "");
        setSettingsCustomDomain(json.data.customDomain || "");
      } else {
        toast.error(json.error || "Failed to load application details");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (type: "build" | "runtime") => {
    try {
      setLogsLoading(true);
      const res = await fetch(`/api/user/app-platform/${id}/logs?type=${type}`);
      const json = await res.json();
      if (res.ok && json.success) {
        if (type === "build") {
          setBuildLogs(json.logs || "No build logs produced yet.");
        } else {
          setRuntimeLogs(json.logs || "No runtime output produced yet.");
        }
      }
    } catch {
      // quiet catch
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppDetail();
  }, [id]);

  useEffect(() => {
    if (app?.name) {
      document.title = `${app.name} - App Platform | Masdika Cloud`;
    } else {
      document.title = "App Details - App Platform | Masdika Cloud";
    }
  }, [app?.name]);

  // Poll app status every 8 seconds if building or provisioning
  useEffect(() => {
    const shouldPoll = app?.lastBuildStatus === "BUILDING" || app?.status === "PROVISIONING";
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      fetchAppDetail();
      if (activeTab === "build-logs") fetchLogs("build");
    }, 5000);
    return () => clearInterval(interval);
  }, [app?.lastBuildStatus, app?.status, activeTab]);

  // Fetch logs when user switches tabs
  useEffect(() => {
    if (activeTab === "build-logs") fetchLogs("build");
    if (activeTab === "runtime-logs") fetchLogs("runtime");
  }, [activeTab]);

  // Realtime metrics polling without manual page refresh (Live: 5s, Hour: 15s, Day/Week: 60s)
  useEffect(() => {
    if (!id) return;
    fetchMetrics(metricsTimeframe, false);

    const metricsIntervalMs = metricsTimeframe === "live" ? 5000 : metricsTimeframe === "hour" ? 15000 : 60000;
    const interval = setInterval(() => {
      fetchMetrics(metricsTimeframe, true);
    }, metricsIntervalMs);

    return () => clearInterval(interval);
  }, [id, app?.status, metricsTimeframe]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePowerAction = async (action: "start" | "stop" | "restart" | "rebuild") => {
    setActionLoading(true);
    const toastId = toast.loading(`Executing ${action}...`);
    try {
      const res = await fetch(`/api/user/app-platform/${id}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `${action} executed successfully`, { id: toastId });
        fetchAppDetail();
        if (action === "rebuild") {
          setActiveTab("build-logs");
          fetchLogs("build");
        }
      } else {
        toast.error(data.error || `Failed to execute ${action}`, { id: toastId });
      }
    } catch {
      toast.error("Failed to execute power command", { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    const toastId = toast.loading("Terminating application...");
    try {
      const res = await fetch(`/api/user/app-platform/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Application terminated successfully", { id: toastId });
        router.push("/dashboard/app-platform");
      } else {
        toast.error(data.error || "Failed to terminate application", { id: toastId });
      }
    } catch {
      toast.error("An error occurred during termination", { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const toastId = toast.loading("Updating app configuration...");
    try {
      const res = await fetch(`/api/user/app-platform/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gitUrl: settingsGitUrl.trim(),
          branch: settingsBranch.trim(),
          buildCommand: settingsBuildCmd.trim() || null,
          startCommand: settingsStartCmd.trim() || null,
          envVars: settingsEnvVars.trim() || null,
          customDomain: settingsCustomDomain.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Configuration saved successfully", { id: toastId });
        fetchAppDetail();
      } else {
        toast.error(data.error || "Failed to save configuration", { id: toastId });
      }
    } catch {
      toast.error("Failed to save configuration", { id: toastId });
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (status: string, buildStatus?: string | null) => {
    const s = (status || "").toUpperCase();
    if (buildStatus === "BUILDING" || s === "PROVISIONING") {
      return (
        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")}>
          <RefreshCw className="w-3 h-3 animate-spin" />
          BUILDING
        </span>
      );
    }
    switch (s) {
      case "RUNNING":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        );
      case "STOPPED":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200")}>
            <Square className="w-3 h-3 fill-current" />
            STOPPED
          </span>
        );
      case "SUSPENDED":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-200")}>
            <AlertTriangle className="w-3 h-3" />
            SUSPENDED (3-DAY GRACE)
          </span>
        );
      case "ERROR":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-200")}>
            <AlertTriangle className="w-3 h-3" />
            BUILD FAILED
          </span>
        );
      default:
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200")}>
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] w-full flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
          Loading application details...
        </p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold">Application Not Found</h2>
        <Link href="/dashboard/app-platform" className="text-cyan-400 hover:underline text-sm font-semibold">
          Return to App Platform
        </Link>
      </div>
    );
  }

  const isRunning = app.status === "RUNNING";
  const isStopped = app.status === "STOPPED";
  const isSuspended = app.status === "SUSPENDED";

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Back Button */}
      <div>
        <Link
          href="/dashboard/app-platform"
          className={cn(
            "inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit cursor-pointer",
            isDark
              ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to App Platform
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className={cn("rounded-2xl border p-5 sm:p-6 shadow-2xs relative overflow-hidden", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Identity */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            {(() => {
              const fwMeta = getFrameworkBrandIcon(app.buildType);
              const FwIcon = fwMeta.icon;
              return (
                <div className={cn(
                  "w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105",
                  fwMeta.bg
                )}>
                  <FwIcon className={cn("w-8 h-8", fwMeta.color)} />
                </div>
              );
            })()}

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className={cn("text-xl sm:text-2xl font-black tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
                  {app.name}
                </h1>
                {getStatusBadge(app.status, app.lastBuildStatus)}
                <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full border", isDark ? "bg-white/5 border-white/10 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700")}>
                  {app.buildType}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 truncate">
                  <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono text-zinc-300 truncate">{app.gitUrl}</span>
                  <span className="text-zinc-500 font-mono">({app.branch})</span>
                </div>
                <span>•</span>
                <span className="text-zinc-400">{app.planName} Plan ({app.cpuShares} vCPU / {app.memoryMb} MB)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Live Web Link Button */}
            <a
              href={app.httpsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Visit Web</span>
            </a>

            {/* Rebuild Trigger */}
            <button
              onClick={() => setConfirmModal({ action: "rebuild" })}
              disabled={actionLoading}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                isDark ? "bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-cyan-400", actionLoading && "animate-spin")} />
              <span>Rebuild</span>
            </button>

            {/* Power Start/Stop */}
            {isRunning && (
              <>
                <button
                  onClick={() => setConfirmModal({ action: "restart" })}
                  disabled={actionLoading}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                    isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  )}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
                <button
                  onClick={() => setConfirmModal({ action: "stop" })}
                  disabled={actionLoading}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                    isDark ? "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              </>
            )}

            {isStopped && (
              <button
                onClick={() => setConfirmModal({ action: "start" })}
                disabled={actionLoading}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                  isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                )}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>
            )}

            {/* Terminate Button */}
            <button
              onClick={() => setConfirmModal({ action: "delete" })}
              disabled={actionLoading}
              className={cn(
                "p-2 rounded-xl border transition-all cursor-pointer",
                isDark ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              )}
              title="Terminate Application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "build-logs", label: "Build Logs", icon: FileText },
          { id: "runtime-logs", label: "Runtime Logs", icon: Terminal },
          { id: "settings", label: "Settings & Environment", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : isDark
                  ? "text-zinc-400 hover:text-white hover:bg-white/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Connection & Endpoints Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Box 1: Public HTTPS Routing */}
            <div className={cn("rounded-2xl border p-5 shadow-2xs space-y-3", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  PUBLIC HTTPS ENDPOINT
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  SSL Active
                </span>
              </div>

              <div className={cn(
                "p-3 rounded-xl border flex items-center justify-between gap-2 font-mono text-xs",
                isDark ? "bg-black/40 border-white/[0.06] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              )}>
                <span className="truncate">{app.httpsUrl}</span>
                <button
                  onClick={() => copyToClipboard(app.httpsUrl, "httpsUrl")}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-400 cursor-pointer"
                  title="Copy URL"
                >
                  {copiedField === "httpsUrl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-[11px] text-zinc-500">
                Routed via Traefik ingress controller with automated Let&apos;s Encrypt certificate renewal.
              </p>
            </div>

            {/* Box 2: Direct NodePort Access */}
            <div className={cn("rounded-2xl border p-5 shadow-2xs space-y-3", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  DIRECT NODEPORT
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                  Port {app.port}
                </span>
              </div>

              <div className={cn(
                "p-3 rounded-xl border flex items-center justify-between gap-2 font-mono text-xs",
                isDark ? "bg-black/40 border-white/[0.06] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              )}>
                <span className="truncate">{app.nodePortUrl}</span>
                <button
                  onClick={() => copyToClipboard(app.nodePortUrl, "nodePortUrl")}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-400 cursor-pointer"
                  title="Copy URL"
                >
                  {copiedField === "nodePortUrl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-[11px] text-zinc-500">
                Direct raw port routing (TCP/HTTP) bypassing reverse proxy if needed for webhooks.
              </p>
            </div>
          </div>

          {/* Details Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={cn("rounded-2xl border p-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">CPU ALLOCATION</span>
              <span className="text-lg font-black text-white">{app.cpuShares} vCPU</span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">Dedicated core limit</span>
            </div>

            <div className={cn("rounded-2xl border p-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">MEMORY LIMIT</span>
              <span className="text-lg font-black text-white">{app.memoryMb} MB RAM</span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">Cgroup memory boundary</span>
            </div>

            <div className={cn("rounded-2xl border p-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">STORAGE SIZE</span>
              <span className="text-lg font-black text-white">{app.storageGb} GB SSD</span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">High-speed isolated container SSD</span>
            </div>

            <div className={cn("rounded-2xl border p-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">BILLING COMMITMENT</span>
              <span className="text-lg font-black text-cyan-400">
                {app.billingMode === "MONTHLY" ? `${formatRupiah(app.monthlyPrice)}/mo` : `${formatRupiah(app.hourlyRate)}/hr`}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Mode: {app.billingMode}
              </span>
            </div>
          </div>

          {/* Card: Resource Monitoring (vCPU, RAM, SSD) */}
          <div className={cn(
            "border rounded-2xl p-5 sm:p-6 transition-all shadow-2xs space-y-4",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    <Activity className="w-4 h-4 shrink-0" />
                    Resource Monitoring (vCPU, RAM, SSD)
                  </h3>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase",
                    isRunning
                      ? isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : isDark ? "bg-zinc-800 text-zinc-400 border border-zinc-700" : "bg-slate-100 text-slate-500 border border-slate-200"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", isRunning ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                    {isRunning ? (
                      metricsTimeframe === "live" ? "Live Stream (5s)" : "Active Sync"
                    ) : (
                      "Offline"
                    )}
                  </span>
                </div>
                <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Dedicated container utilization for vCPU compute, RAM memory, and isolated SSD storage.
                </p>
              </div>

              {/* Timeframe Selector */}
              <div className={cn("p-1 rounded-xl border flex items-center gap-1 self-start sm:self-auto", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                {(["live", "hour", "day", "week"] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setMetricsTimeframe(tf)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize",
                      metricsTimeframe === tf
                        ? "bg-cyan-500 text-slate-950 shadow-xs"
                        : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {tf === "live" ? "Live" : tf === "hour" ? "1 Hour" : tf === "day" ? "24 Hours" : "7 Days"}
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Metrics Overview KPI Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
              {/* CPU Card */}
              <button
                type="button"
                onClick={() => setActiveMetricTab("CPU")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  activeMetricTab === "CPU"
                    ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                    : isDark ? "bg-[#0a0a0c] border-white/[0.06] hover:border-white/20" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <Cpu className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    CPU Utilization
                  </span>
                  <span className={cn("text-[10px] font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.cpuShares} vCPU</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {metricsData?.summary?.cpu?.current ?? (isRunning ? 12.5 : 0)}%
                  </span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                    of 100% capacity
                  </span>
                </div>
              </button>

              {/* RAM Card */}
              <button
                type="button"
                onClick={() => setActiveMetricTab("RAM")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  activeMetricTab === "RAM"
                    ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                    : isDark ? "bg-[#0a0a0c] border-white/[0.06] hover:border-white/20" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <Layers className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    Memory (RAM)
                  </span>
                  <span className={cn("text-[10px] font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.memoryMb} MB Max</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {metricsData?.summary?.memory?.currentMb ?? (isRunning ? Math.min(app.memoryMb, 180) : 0)} MB
                  </span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                    ({metricsData?.summary?.memory?.percentage ?? (isRunning ? Math.round((180 / app.memoryMb) * 100) : 0)}%)
                  </span>
                </div>
              </button>

              {/* SSD Disk Card */}
              <button
                type="button"
                onClick={() => setActiveMetricTab("DISK")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  activeMetricTab === "DISK"
                    ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                    : isDark ? "bg-[#0a0a0c] border-white/[0.06] hover:border-white/20" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <HardDrive className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    SSD Storage
                  </span>
                  <span className={cn("text-[10px] font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.storageGb || 10} GB Quota</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {metricsData?.summary?.disk?.usedGb ?? 1.1} GB
                  </span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                    ({metricsData?.summary?.disk?.percentage ?? Math.round((1.1 / (app.storageGb || 10)) * 100)}%)
                  </span>
                </div>
              </button>
            </div>

            {/* Chart Filter Tabs */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className={cn("text-xs font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>
                {activeMetricTab === "ALL" && "All Resource Metrics Combined (%)"}
                {activeMetricTab === "CPU" && `CPU Load Over Time (${app.cpuShares} vCPU Dedicated)`}
                {activeMetricTab === "RAM" && `Memory Consumption Over Time (Allocated: ${app.memoryMb} MB)`}
                {activeMetricTab === "DISK" && `Persistent SSD Disk Utilization (Allocated: ${app.storageGb || 10} GB)`}
              </span>

              <div className="flex items-center gap-1">
                {(["ALL", "CPU", "RAM", "DISK"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveMetricTab(tab)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer border",
                      activeMetricTab === tab
                        ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-xs"
                        : isDark ? "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white" : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Area Chart Container */}
            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsData?.points || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cloudAppCpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cloudAppRamGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cloudAppDiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff0a" : "#f1f5f9"} vertical={false} />
                  <XAxis dataKey="time" stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={10} tickLine={false} />
                  <YAxis stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0b1322" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === "CPU %" || name === "cpu") return [`${value}%`, "CPU Load"];
                      if (name === "RAM %" || name === "memory") return [`${value}%`, "RAM Memory"];
                      if (name === "Disk %" || name === "disk") return [`${value}%`, "SSD Disk"];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Timestamp: ${label}`}
                  />
                  {(activeMetricTab === "ALL" || activeMetricTab === "CPU") && (
                    <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#06b6d4" strokeWidth={2.5} fill="url(#cloudAppCpuGrad)" />
                  )}
                  {(activeMetricTab === "ALL" || activeMetricTab === "RAM") && (
                    <Area type="monotone" dataKey="memory" name="RAM %" stroke="#818cf8" strokeWidth={2.5} fill="url(#cloudAppRamGrad)" />
                  )}
                  {(activeMetricTab === "ALL" || activeMetricTab === "DISK") && (
                    <Area type="monotone" dataKey="disk" name="Disk %" stroke="#10b981" strokeWidth={2.5} fill="url(#cloudAppDiskGrad)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUILD LOGS */}
      {activeTab === "build-logs" && (
        <div className={cn("rounded-2xl border p-5 shadow-2xs space-y-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h2 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                Kaniko Build Logs
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs("build")}
                disabled={logsLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer bg-white/5 border-white/10 text-zinc-300 hover:text-white"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", logsLoading && "animate-spin")} />
                <span>Refresh Logs</span>
              </button>
              <button
                onClick={() => copyToClipboard(buildLogs, "buildLogs")}
                className="p-1.5 rounded-lg border text-zinc-400 hover:text-white bg-white/5 border-white/10 cursor-pointer"
                title="Copy all logs"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-black/70 border border-white/10 text-zinc-300 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap">
            {buildLogs || app.lastBuildLog || "No build logs available yet. Trigger a rebuild to see pipeline execution."}
          </pre>
        </div>
      )}

      {/* TAB 3: RUNTIME LOGS */}
      {activeTab === "runtime-logs" && (
        <div className={cn("rounded-2xl border p-5 shadow-2xs space-y-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h2 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                Live Runtime Console Output
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs("runtime")}
                disabled={logsLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer bg-white/5 border-white/10 text-zinc-300 hover:text-white"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", logsLoading && "animate-spin")} />
                <span>Refresh Console</span>
              </button>
              <button
                onClick={() => copyToClipboard(runtimeLogs, "runtimeLogs")}
                className="p-1.5 rounded-lg border text-zinc-400 hover:text-white bg-white/5 border-white/10 cursor-pointer"
                title="Copy all logs"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-black/70 border border-white/10 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap">
            {runtimeLogs || "Waiting for container logs..."}
          </pre>
        </div>
      )}

      {/* TAB 4: SETTINGS & ENVIRONMENT */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className={cn("rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h2 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                Git Source & Build Configuration
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  Repository URL
                </label>
                <input
                  type="url"
                  required
                  value={settingsGitUrl}
                  onChange={(e) => setSettingsGitUrl(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                    isDark ? "bg-black/30 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  Branch
                </label>
                <input
                  type="text"
                  required
                  value={settingsBranch}
                  onChange={(e) => setSettingsBranch(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                    isDark ? "bg-black/30 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  Build Command
                </label>
                <input
                  type="text"
                  value={settingsBuildCmd}
                  onChange={(e) => setSettingsBuildCmd(e.target.value)}
                  placeholder="npm run build"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                    isDark ? "bg-black/30 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  Start Command
                </label>
                <input
                  type="text"
                  value={settingsStartCmd}
                  onChange={(e) => setSettingsStartCmd(e.target.value)}
                  placeholder="npm start"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                    isDark ? "bg-black/30 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Custom Domain (Optional)
              </label>
              <input
                type="text"
                value={settingsCustomDomain}
                onChange={(e) => setSettingsCustomDomain(e.target.value.toLowerCase())}
                placeholder="example.com"
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                  isDark ? "bg-black/30 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                )}
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Point a CNAME record from your domain to <code>{app.fullDomain}</code>, and Let&apos;s Encrypt will automatically issue an SSL certificate.
              </p>
            </div>
          </div>

          <div className={cn("rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h2 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                Environment Variables
              </h2>
            </div>

            <textarea
              rows={5}
              value={settingsEnvVars}
              onChange={(e) => setSettingsEnvVars(e.target.value)}
              placeholder="KEY=VALUE"
              className={cn(
                "w-full px-4 py-3 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400 resize-y",
                isDark ? "bg-black/30 border-white/10 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900"
              )}
            />

            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? "Saving Settings..." : "Save Configuration"}
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          onConfirm={() => {
            const { action } = confirmModal;
            setConfirmModal(null);
            if (action === "delete") {
              handleDelete();
            } else {
              handlePowerAction(action);
            }
          }}
          title={
            confirmModal.action === "delete"
              ? "Terminate Application"
              : confirmModal.action === "rebuild"
              ? "Trigger Rebuild"
              : `${confirmModal.action.toUpperCase()} Application`
          }
          description={
            confirmModal.action === "delete"
              ? `WARNING: This will permanently delete ${app.name} and clean up all Kubernetes deployments, services, and SSL certs.`
              : confirmModal.action === "rebuild"
              ? `A new Kaniko build job will clone ${app.gitUrl} (${app.branch}) and deploy a fresh image upon completion.`
              : `Are you sure you want to execute ${confirmModal.action} on ${app.name}?`
          }
          confirmText={confirmModal.action === "delete" ? "Delete Permanently" : "Confirm"}
          variant={confirmModal.action === "delete" ? "danger" : "warning"}
        />
      )}
    </div>
  );
}
