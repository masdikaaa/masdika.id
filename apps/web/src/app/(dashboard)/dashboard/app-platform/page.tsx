"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  AppWindow,
  Plus,
  ExternalLink,
  ChevronRight,
  Activity,
  Server,
  ShieldCheck,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Trash2,
  AlertTriangle,
  GitBranch,
  Code2,
  Cpu,
  Layers,
  Terminal,
  TrendingUp,
} from "lucide-react";
import { AppScaleModal } from "@/components/AppScaleModal";
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

export default function AppPlatformPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [scalingApp, setScalingApp] = useState<any | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    appId: number;
    action: "start" | "stop" | "restart" | "delete";
    name: string;
  } | null>(null);

  const fetchApps = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/user/app-platform");
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setApps(json.data);
      } else {
        toast.error(json.error || "Failed to load App Platform applications");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 300);
    }
  };

  useEffect(() => {
    document.title = "App Platform - Web & API Applications | Masdika Cloud";
    fetchApps();
  }, []);

  // Auto refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchApps, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePowerAction = async (id: number, action: "start" | "stop" | "restart") => {
    setActionLoadingId(id);
    const toastId = toast.loading(`Performing ${action} on application...`);
    try {
      const res = await fetch(`/api/user/app-platform/${id}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Application ${action}ed successfully`, { id: toastId });
        fetchApps();
      } else {
        toast.error(data.error || `Failed to ${action} application`, { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoadingId(id);
    const toastId = toast.loading("Terminating application instance...");
    try {
      const res = await fetch(`/api/user/app-platform/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Application terminated successfully", { id: toastId });
        fetchApps();
      } else {
        toast.error(data.error || "Failed to terminate application", { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getActionModalConfig = (item: { appId: number; action: string; name: string }) => {
    switch (item.action) {
      case "start":
        return {
          title: "Start Application",
          description: `Are you sure you want to boot up ${item.name}? Pod replicas will scale to 1 and resume routing live HTTPS traffic.`,
          confirmText: "Start Application",
          variant: "success" as const,
          icon: <Play className="w-8 h-8 fill-current" />,
        };
      case "stop":
        return {
          title: "Stop Application",
          description: `Are you sure you want to stop ${item.name}? Container will be paused (replicas scaled to 0).`,
          confirmText: "Stop Application",
          variant: "warning" as const,
          icon: <Square className="w-8 h-8 fill-current" />,
        };
      case "restart":
        return {
          title: "Restart Application",
          description: `Are you sure you want to restart ${item.name}? A zero-downtime rolling restart will replace the active container.`,
          confirmText: "Restart Application",
          variant: "warning" as const,
          icon: <RotateCw className="w-8 h-8" />,
        };
      case "delete":
        return {
          title: "Terminate Application Instance",
          description: `WARNING: Are you sure you want to permanently delete ${item.name}? The deployment, service, SSL ingress, and internal registry images will be removed immediately.`,
          confirmText: "Delete Application",
          variant: "danger" as const,
          icon: <Trash2 className="w-8 h-8" />,
        };
      default:
        return {
          title: `${item.action} Application`,
          description: `Are you sure you want to execute ${item.action} on ${item.name}?`,
          confirmText: "Confirm",
          variant: "warning" as const,
          icon: <AlertTriangle className="w-8 h-8" />,
        };
    }
  };

  const getStatusBadge = (status: string, buildStatus?: string | null) => {
    const s = (status || "").toUpperCase();
    if (buildStatus === "BUILDING" || s === "PROVISIONING") {
      return (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")}>
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          BUILDING
        </span>
      );
    }
    switch (s) {
      case "RUNNING":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            RUNNING
          </span>
        );
      case "STOPPED":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200")}>
            <Square className="w-2.5 h-2.5 fill-current" />
            STOPPED
          </span>
        );
      case "SUSPENDED":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-200")}>
            <AlertTriangle className="w-2.5 h-2.5" />
            SUSPENDED
          </span>
        );
      case "ERROR":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-200")}>
            <AlertTriangle className="w-2.5 h-2.5" />
            BUILD FAILED
          </span>
        );
      default:
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200")}>
            {status}
          </span>
        );
    }
  };

  const runningCount = apps.filter((a) => a.status === "RUNNING").length;
  const totalMonthlySpend = apps.reduce((sum, a) => sum + (a.monthlyPrice || 0), 0);

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              App Platform
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap shrink-0", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              <AppWindow className="w-3 h-3 shrink-0" />
              Git-to-Web PaaS
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Deploy web apps from any Git repository in seconds. Automated BuildKit container builds, instant Let&apos;s Encrypt SSL, and continuous deployment.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchApps}
            disabled={refreshing || loading}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (refreshing || loading) && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboard/app-platform/new"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy New Web</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards - Consistent 4-KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Applications */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              WEB APPS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <AppWindow className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {apps.length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Deploys
            </span>
          </div>
        </div>

        {/* Card 2: Running Status */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              RUNNING STATUS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {runningCount}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Online
            </span>
          </div>
        </div>

        {/* Card 3: Region & Cluster */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              CLUSTER & REGION
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Sidoarjo
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              ID-SDA
            </span>
          </div>
        </div>

        {/* Card 4: Monthly Commitment */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              MONTHLY COMMITMENT
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {formatRupiah(totalMonthlySpend)}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              /mo
            </span>
          </div>
        </div>
      </div>

      {/* Main Content List */}
      {loading ? (
        <div className="min-h-[350px] w-full flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Loading App Platform applications...
          </p>
        </div>
      ) : apps.length === 0 ? (
        /* Empty State */
        <div className={cn("rounded-2xl border p-10 sm:p-14 text-center shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
            <AppWindow className="w-8 h-8" />
          </div>
          <h2 className={cn("text-lg font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>
            No Web Applications Deployed
          </h2>
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Deploy your Node.js, Python, Go, PHP, Static site, or Dockerfile repository in one click with automated Let&apos;s Encrypt SSL and zero-downtime rolling deploys.
          </p>
          <Link
            href="/dashboard/app-platform/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Your First Web</span>
          </Link>
        </div>
      ) : (
        /* Applications Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {apps.map((app) => {
            const isSuspended = app.status === "SUSPENDED";
            const isRunning = app.status === "RUNNING";
            const isStopped = app.status === "STOPPED";
            const isBuilding = app.lastBuildStatus === "BUILDING" || app.status === "PROVISIONING";
            const fwMeta = getFrameworkBrandIcon(app.buildType);
            const FwIcon = fwMeta.icon;

            return (
              <div
                key={app.id}
                className={cn(
                  "rounded-2xl border p-5 transition-all relative flex flex-col justify-between group shadow-2xs",
                  isDark
                    ? "bg-[#111115] border-white/[0.08] hover:border-cyan-500/30"
                    : "bg-white border-slate-200/90 hover:border-slate-300"
                )}
              >
                <div>
                  {/* Top Bar: Icon, Name & Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs",
                        fwMeta.bg
                      )}>
                        <FwIcon className={cn("w-6 h-6", fwMeta.color)} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            isDark ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                          )}>
                            {app.buildType}
                          </span>
                        </div>
                        <Link
                          href={`/dashboard/app-platform/${app.id}`}
                          className={cn(
                            "block text-sm sm:text-base font-bold tracking-tight truncate mt-1 hover:underline transition-colors",
                            isDark ? "text-white hover:text-cyan-400" : "text-slate-900 hover:text-cyan-700"
                          )}
                        >
                          {app.name}
                        </Link>
                        <div className={cn("flex items-center gap-1 text-[11px] mt-0.5 truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <GitBranch className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span className="truncate">{app.gitUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\.git$/, "")}</span>
                          <span className="shrink-0">({app.branch})</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(app.status, app.lastBuildStatus)}
                    </div>
                  </div>

                  {/* Public HTTPS URL Link */}
                  <div className={cn(
                    "p-2.5 rounded-xl border mb-3 flex items-center justify-between gap-2",
                    isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="min-w-0 flex items-center gap-2">
                      <AppWindow className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <a
                        href={app.httpsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn("text-[11px] font-mono font-medium truncate hover:text-cyan-400 transition-colors", isDark ? "text-zinc-200" : "text-slate-800")}
                      >
                        {app.fullDomain}
                      </a>
                    </div>
                    <a
                      href={app.httpsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "p-1.5 rounded-lg border transition-colors shrink-0",
                        isDark
                          ? "bg-white/5 border-white/10 text-zinc-400 hover:text-cyan-400"
                          : "bg-white border-slate-200 text-slate-500 hover:text-cyan-700"
                      )}
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Spec Chips (Managed App Style) */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className={cn("p-2 rounded-lg border", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200")}>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>Compute</span>
                      <span className={cn("font-semibold text-[11px] whitespace-nowrap", isDark ? "text-zinc-200" : "text-slate-800")}>
                        {app.cpuShares} vCPU • {app.memoryMb >= 1024 ? `${app.memoryMb / 1024} GB` : `${app.memoryMb} MB`}
                      </span>
                    </div>
                    <div className={cn("p-2 rounded-lg border", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200")}>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>Storage</span>
                      <span className={cn("font-semibold text-[11px] whitespace-nowrap", isDark ? "text-zinc-200" : "text-slate-800")}>
                        {app.storageGb || 10} GB SSD
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className={cn("pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                  <div className="text-xs whitespace-nowrap shrink-0">
                    <span className={cn("text-[10px] block", isDark ? "text-zinc-500" : "text-slate-500")}>
                      {app.billingMode === "MONTHLY" ? "Commitment" : "Pay-As-You-Go"}
                    </span>
                    <span className={cn("font-mono font-bold text-xs sm:text-sm", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      {app.billingMode === "MONTHLY" ? formatRupiah(app.monthlyPrice) : formatRupiah(app.hourlyRate)}
                      <span className={cn("text-[10px] font-normal", isDark ? "text-zinc-500" : "text-slate-500")}>
                        {app.billingMode === "MONTHLY" ? "/mo" : "/hr"}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    {/* Scale Button (Managed App Style) */}
                    <button
                      type="button"
                      onClick={() => setScalingApp(app)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer",
                        isDark ? "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" : "border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                      )}
                      title="Scale Compute"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Scale</span>
                    </button>

                    {/* Power Controls */}
                    {isRunning && (
                      <>
                        <button
                          onClick={() => setConfirmModal({ appId: app.id, action: "restart", name: app.name })}
                          disabled={actionLoadingId === app.id}
                          className="p-1.5 rounded-lg border text-amber-400 hover:bg-amber-400/10 border-amber-400/20 transition-all cursor-pointer"
                          title="Restart Web"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmModal({ appId: app.id, action: "stop", name: app.name })}
                          disabled={actionLoadingId === app.id}
                          className="p-1.5 rounded-lg border text-zinc-400 hover:bg-zinc-400/10 border-zinc-400/20 transition-all cursor-pointer"
                          title="Stop Web"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </>
                    )}

                    {isStopped && (
                      <button
                        onClick={() => setConfirmModal({ appId: app.id, action: "start", name: app.name })}
                        disabled={actionLoadingId === app.id}
                        className="p-1.5 rounded-lg border text-emerald-400 hover:bg-emerald-400/10 border-emerald-400/20 transition-all cursor-pointer"
                        title="Start Web"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    <Link
                      href={`/dashboard/app-platform/${app.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Zero Data Loss Scaling Modal (Managed App Style) */}
      {scalingApp && (
        <AppScaleModal
          isOpen={!!scalingApp}
          onClose={() => setScalingApp(null)}
          app={{
            id: scalingApp.id,
            name: scalingApp.name,
            appType: scalingApp.buildType || "APP",
            planName: scalingApp.planName,
            cpuShares: scalingApp.cpuShares,
            memoryMb: scalingApp.memoryMb,
            monthlyPrice: scalingApp.monthlyPrice,
            hourlyRate: scalingApp.hourlyRate,
            status: scalingApp.status,
          }}
          apiEndpoint={`/api/user/app-platform/${scalingApp.id}/upgrade`}
          onSuccess={fetchApps}
          isDark={isDark}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          onConfirm={() => {
            const { appId, action } = confirmModal;
            setConfirmModal(null);
            if (action === "delete") {
              handleDelete(appId);
            } else {
              handlePowerAction(appId, action);
            }
          }}
          {...getActionModalConfig(confirmModal)}
        />
      )}
    </div>
  );
}
