"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  Boxes,
  Plus,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Server,
  Globe,
  ShieldCheck,
  Check,
  Copy,
  Zap,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Rocket,
  Trash2,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  MANAGED_APPS_CATALOG,
  formatRupiah,
  getAppDefinition,
} from "@/lib/app-catalog";
import { AppScaleModal } from "@/components/AppScaleModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function ManagedAppsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scalingApp, setScalingApp] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    appId: number;
    action: "start" | "stop" | "restart" | "delete";
    name: string;
  } | null>(null);

  const fetchApps = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/user/apps");
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setApps(json.data);
      } else {
        toast.error(json.error || "Failed to load managed applications");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 300);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Auto refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(fetchApps, 20000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePowerAction = async (id: number, action: "start" | "stop" | "restart") => {
    setActionLoadingId(id);
    const toastId = toast.loading(`Performing ${action} on application...`);
    try {
      const res = await fetch(`/api/user/apps/${id}/power`, {
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
      const res = await fetch(`/api/user/apps/${id}`, { method: "DELETE" });
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
          description: `Are you sure you want to boot up ${item.name}? The container pod will start and resume routing traffic.`,
          confirmText: "Start Application",
          variant: "success" as const,
          icon: <Play className="w-8 h-8 fill-current" />,
        };
      case "stop":
        return {
          title: "Stop Application",
          description: `Are you sure you want to stop ${item.name}? Container will be paused. Persistent volume data remains untouched.`,
          confirmText: "Stop Application",
          variant: "warning" as const,
          icon: <Square className="w-8 h-8 fill-current" />,
        };
      case "restart":
        return {
          title: "Restart Application",
          description: `Are you sure you want to restart ${item.name}? Active connections will drop momentarily while the container restarts.`,
          confirmText: "Restart Application",
          variant: "warning" as const,
          icon: <RotateCw className="w-8 h-8" />,
        };
      case "delete":
        return {
          title: "Terminate Application Instance",
          description: `WARNING: Are you sure you want to permanently delete ${item.name}? All persistent volume storage and container data will be destroyed immediately and cannot be recovered.`,
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

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "RUNNING":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            RUNNING
          </span>
        );
      case "STARTING":
      case "PENDING":
      case "PROVISIONING":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")}>
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            STARTING
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
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Managed Applications
            </h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              Auto SSL
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Deploy autonomous AI agents, multi-LLM gateways, and workflow engines with dedicated isolated containers and automated Let&apos;s Encrypt SSL.
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
            href="/dashboard/apps/new"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy New App</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards - Exactly matching Managed DB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Applications */}
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              APPLICATIONS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {apps.length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Instances
            </span>
          </div>
        </div>

        {/* Card 2: Running Status */}
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              RUNNING STATUS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {runningCount}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-emerald-400" : "text-emerald-600")}>
              Online
            </span>
          </div>
        </div>

        {/* Card 3: Region & Cluster (Sanitized, exactly matching Managed DB) */}
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              REGION & CLUSTER
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
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
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
            Loading managed application instances...
          </p>
        </div>
      ) : apps.length === 0 ? (
        /* Empty State */
        <div className={cn("rounded-2xl border p-10 sm:p-14 text-center", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
            <Boxes className="w-8 h-8" />
          </div>
          <h2 className={cn("text-lg font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>
            No Managed Applications Provisioned
          </h2>
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Deploy Hermes Agent, 9Router, n8n, OpenCode, or OpenClaw in a single click with automated Let&apos;s Encrypt SSL, dedicated persistent SSD storage, and isolated containers.
          </p>
          <Link
            href="/dashboard/apps/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy Your First App</span>
          </Link>
        </div>
      ) : (
        /* Applications Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {apps.map((app) => {
            const catalog = getAppDefinition(app.appType);
            const isSshApp = catalog?.accessProtocol === "SSH";
            const fullDomain = `${app.subdomain}.app.masdika.id`;
            const httpsUrl = `https://${fullDomain}`;
            const sshCommand = `ssh root@103.247.10.61 -p ${app.port}`;
            const isRunning = app.status === "RUNNING";
            const isActing = actionLoadingId === app.id;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl border p-5 transition-all flex flex-col justify-between group",
                  isDark
                    ? "bg-[#0c0c0e] border-white/[0.08] hover:border-cyan-500/30 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                )}
              >
                <div>
                  {/* Card Header: Icon, Name, Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 p-1.5 transition-transform group-hover:scale-105",
                        isDark ? "bg-cyan-500/10 border-cyan-500/25 shadow-sm shadow-cyan-500/10" : "bg-cyan-50 border-cyan-200 shadow-2xs"
                      )}>
                        <Image
                          src={catalog?.icon || "/images/apps/docker.svg"}
                          alt={app.name}
                          width={32}
                          height={32}
                          className="object-contain w-full h-full"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            isDark ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                          )}>
                            {catalog?.badge || app.appType.toUpperCase()}
                          </span>
                        </div>
                        <h3 className={cn("font-bold text-sm sm:text-base tracking-tight truncate mt-1", isDark ? "text-white" : "text-slate-900")}>
                          {app.name}
                        </h3>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>

                  {/* Access Endpoint Box (SSH vs HTTPS) */}
                  {isSshApp ? (
                    <div className={cn(
                      "p-3 rounded-xl border flex items-center justify-between gap-2 mb-3",
                      isDark ? "bg-[#111115] border-white/[0.06]" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center gap-2 min-w-0 font-mono text-[11px] truncate">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate font-medium">{sshCommand}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyToClipboard(sshCommand, `ssh-${app.id}`)}
                          className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                          title="Copy SSH Command"
                        >
                          {copiedField === `ssh-${app.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "p-3 rounded-xl border flex items-center justify-between gap-2 mb-3",
                      isDark ? "bg-[#111115] border-white/[0.06]" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center gap-2 min-w-0 font-mono text-[11px] truncate">
                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate font-medium">{fullDomain}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyToClipboard(httpsUrl, `url-${app.id}`)}
                          className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                          title="Copy HTTPS URL"
                        >
                          {copiedField === `url-${app.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={httpsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Open App in Browser"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Specs & Pricing Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className={cn("p-2 rounded-lg border", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200")}>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>Compute</span>
                      <span className="font-semibold text-[11px] whitespace-nowrap">{app.cpuShares} vCPU • {app.memoryMb >= 1024 ? `${app.memoryMb / 1024} GB` : `${app.memoryMb} MB`}</span>
                    </div>
                    <div className={cn("p-2 rounded-lg border", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200")}>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>Storage</span>
                      <span className="font-semibold text-[11px] whitespace-nowrap">{app.storageGb || 10} GB SSD</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className={cn("pt-3 border-t flex items-center justify-between gap-2", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                  {/* Pricing */}
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Commitment</span>
                    <span className={cn("font-mono font-bold text-xs sm:text-sm", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      {formatRupiah(app.monthlyPrice)}<span className="text-[10px] font-normal text-[var(--text-muted)]">/mo</span>
                    </span>
                  </div>

                  {/* Actions: Scale, Power, Manage */}
                  <div className="flex items-center gap-1.5">
                    {/* Scale Button */}
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

                    {/* Power Toggle */}
                    {isRunning ? (
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ appId: app.id, action: "stop", name: app.name })}
                        disabled={isActing}
                        className={cn(
                          "p-1.5 rounded-lg border transition-all cursor-pointer",
                          isDark ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" : "border-amber-300 text-amber-700 hover:bg-amber-50"
                        )}
                        title="Stop Container"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ appId: app.id, action: "start", name: app.name })}
                        disabled={isActing}
                        className={cn(
                          "p-1.5 rounded-lg border transition-all cursor-pointer",
                          isDark ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        )}
                        title="Start Container"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Manage Link */}
                    <Link
                      href={`/dashboard/apps/${app.id}`}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                        isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      )}
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Deploy New App Card */}
          <Link
            href="/dashboard/apps/new"
            className={cn(
              "rounded-2xl border-2 border-dashed p-6 transition-all flex flex-col items-center justify-center text-center gap-3 group min-h-[200px] cursor-pointer",
              isDark
                ? "border-white/[0.1] bg-white/[0.01] hover:border-cyan-400/50 hover:bg-cyan-500/[0.03]"
                : "border-slate-300 bg-slate-50/50 hover:border-cyan-500 hover:bg-cyan-50/50"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110",
              isDark
                ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 group-hover:bg-cyan-500/20"
                : "bg-cyan-50 border-cyan-200 text-cyan-700 group-hover:bg-cyan-100"
            )}>
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h4 className={cn("font-bold text-sm sm:text-base tracking-tight transition-colors group-hover:text-cyan-400", isDark ? "text-white" : "text-slate-900")}>
                Deploy New App
              </h4>
              <p className={cn("text-xs mt-1 max-w-[200px] leading-relaxed", isDark ? "text-zinc-500" : "text-slate-500")}>
                Deploy Hermes Agent, 9Router, n8n, OpenCode, or OpenClaw
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Zero Data Loss Scaling Modal */}
      {scalingApp && (
        <AppScaleModal
          isOpen={!!scalingApp}
          onClose={() => setScalingApp(null)}
          app={scalingApp}
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
            const item = confirmModal;
            setConfirmModal(null);
            if (item.action === "delete") {
              handleDelete(item.appId);
            } else {
              handlePowerAction(item.appId, item.action as any);
            }
          }}
          {...getActionModalConfig(confirmModal)}
        />
      )}
    </div>
  );
}
