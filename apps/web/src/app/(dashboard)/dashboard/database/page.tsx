"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import {
  Database, Plus, RefreshCw, Server, ExternalLink, Power,
  Copy, Check, Activity, ShieldCheck, HardDrive, Cpu, Layers,
  AlertTriangle, ArrowRight, Play, Square, RotateCw, Trash2, MapPin, Rocket
} from "lucide-react";
import { motion } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface DatabaseServiceItem {
  id: number;
  name: string;
  type: string;
  version: string;
  planName: string;
  region: string;
  host: string;
  port: number;
  dbName: string;
  username: string;
  password?: string;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  monthlyPrice: number;
  hourlyRate: number;
  accumulatedCost: number;
  status: "RUNNING" | "STOPPED" | "PROVISIONING" | "SUSPENDED" | "TERMINATED";
  terminationDate?: string | null;
  createdAt: string;
  connectionDetails?: {
    host?: string;
    directIp?: string;
    port?: number;
    pmaUrl?: string | null;
    pgAdminUrl?: string | null;
    pgadminUrl?: string | null;
    mongoUrl?: string | null;
    mongoExpressUrl?: string | null;
    uri?: string;
    laravelEnv?: string;
  };
}

export default function DatabaseListingPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [databases, setDatabases] = useState<DatabaseServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    dbId: number;
    action: "start" | "stop" | "restart" | "delete";
    name: string;
  } | null>(null);

  const getSingleActionModalConfig = (item: { dbId: number; action: string; name: string }) => {
    switch (item.action) {
      case "start":
        return {
          title: "Start Database Container",
          description: `Are you sure you want to boot up ${item.name}? The container pod will start up and database connections will resume.`,
          confirmText: "Start Database",
          variant: "success" as const,
          icon: <Play className="w-8 h-8 fill-current" />,
        };
      case "stop":
        return {
          title: "Stop Database Container",
          description: `Are you sure you want to stop ${item.name}? The container pod will be paused. Persistent volume data on disk will remain safe.`,
          confirmText: "Stop Database",
          variant: "warning" as const,
          icon: <Square className="w-8 h-8 fill-current" />,
        };
      case "restart":
        return {
          title: "Restart Database Container",
          description: `Are you sure you want to restart ${item.name}? Active database client connections will drop momentarily while the container restarts.`,
          confirmText: "Restart Database",
          variant: "warning" as const,
          icon: <RotateCw className="w-8 h-8" />,
        };
      case "delete":
        return {
          title: "Terminate Database Instance",
          description: `WARNING: Are you sure you want to permanently delete ${item.name}? All persistent volume storage and database data will be destroyed immediately and cannot be recovered.`,
          confirmText: "Delete Database",
          variant: "danger" as const,
          icon: <Trash2 className="w-8 h-8" />,
        };
      default:
        return {
          title: `${item.action} Database`,
          description: `Are you sure you want to execute ${item.action} on ${item.name}?`,
          confirmText: "Confirm",
          variant: "warning" as const,
          icon: <AlertTriangle className="w-8 h-8" />,
        };
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoadingId(id);
    const toastId = toast.loading("Deleting database instance...");
    try {
      const res = await fetch(`/api/user/database/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Database terminated successfully", { id: toastId });
        fetchDatabases();
      } else {
        toast.error(data.error || "Failed to delete database", { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchDatabases = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/user/database");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDatabases(json.data);
      } else {
        toast.error(json.error || "Failed to load databases");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const hasProvisioning = databases.some((d) => d.status === "PROVISIONING");

  useEffect(() => {
    fetchDatabases();
  }, []);

  useEffect(() => {
    const pollInterval = hasProvisioning ? 3000 : 30000;
    const interval = setInterval(fetchDatabases, pollInterval);
    return () => clearInterval(interval);
  }, [hasProvisioning]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePowerAction = async (id: number, action: "start" | "stop" | "restart") => {
    setActionLoadingId(id);
    const toastId = toast.loading(`Performing ${action} on database...`);
    try {
      const res = await fetch(`/api/user/database/${id}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Database ${action}ed successfully`, { id: toastId });
        fetchDatabases();
      } else {
        toast.error(data.error || `Failed to ${action} database`, { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getEngineMeta = (type: string, item?: any) => {
    const t = (type || "").toUpperCase();
    const details = item?.connectionDetails;
    switch (t) {
      case "MYSQL":
        return {
          name: "MySQL",
          icon: "/images/apps/mysql.svg",
          color: "text-cyan-400 dark:text-cyan-400",
          colorDark: "text-cyan-400",
          colorLight: "text-cyan-700",
          boxDark: "bg-cyan-500/10 border-cyan-500/25 shadow-sm shadow-cyan-500/10",
          boxLight: "bg-cyan-50 border-cyan-200 shadow-2xs",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeDark: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeLight: "bg-cyan-50 border-cyan-200 text-cyan-700",
          webToolName: "phpMyAdmin",
          webToolUrl: details?.pmaUrl || null,
        };
      case "MARIADB":
        return {
          name: "MariaDB",
          icon: "/images/apps/mariadb.svg",
          color: "text-cyan-400 dark:text-cyan-400",
          colorDark: "text-cyan-400",
          colorLight: "text-cyan-700",
          boxDark: "bg-cyan-500/10 border-cyan-500/25 shadow-sm shadow-cyan-500/10",
          boxLight: "bg-cyan-50 border-cyan-200 shadow-2xs",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeDark: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeLight: "bg-cyan-50 border-cyan-200 text-cyan-700",
          webToolName: "phpMyAdmin",
          webToolUrl: details?.pmaUrl || null,
        };
      case "POSTGRES":
      case "POSTGRESQL":
        return {
          name: "PostgreSQL",
          icon: "/images/apps/postgresql.svg",
          color: "text-cyan-400 dark:text-cyan-400",
          colorDark: "text-cyan-400",
          colorLight: "text-cyan-700",
          boxDark: "bg-cyan-500/10 border-cyan-500/25 shadow-sm shadow-cyan-500/10",
          boxLight: "bg-cyan-50 border-cyan-200 shadow-2xs",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeDark: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeLight: "bg-cyan-50 border-cyan-200 text-cyan-700",
          webToolName: "pgAdmin 4",
          webToolUrl: details?.pgAdminUrl || details?.pgadminUrl || null,
        };
      case "MONGODB":
      case "MONGO":
        return {
          name: "MongoDB",
          icon: "/images/apps/mongodb.svg",
          color: "text-cyan-400 dark:text-cyan-400",
          colorDark: "text-cyan-400",
          colorLight: "text-cyan-700",
          boxDark: "bg-cyan-500/10 border-cyan-500/25 shadow-sm shadow-cyan-500/10",
          boxLight: "bg-cyan-50 border-cyan-200 shadow-2xs",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeDark: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeLight: "bg-cyan-50 border-cyan-200 text-cyan-700",
          webToolName: "Mongo Express",
          webToolUrl: details?.mongoUrl || details?.mongoExpressUrl || null,
        };
      case "REDIS":
        return {
          name: "Redis",
          icon: "/images/apps/redis.svg",
          color: "text-cyan-400 dark:text-cyan-400",
          colorDark: "text-cyan-400",
          colorLight: "text-cyan-700",
          boxDark: "bg-cyan-500/10 border-cyan-500/25 shadow-sm shadow-cyan-500/10",
          boxLight: "bg-cyan-50 border-cyan-200 shadow-2xs",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeDark: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeLight: "bg-cyan-50 border-cyan-200 text-cyan-700",
          webToolName: "Redis Commander",
          webToolUrl: details?.redisUrl || details?.redisCommanderUrl || null,
        };
      default:
        return {
          name: type,
          icon: "/images/apps/postgresql.svg",
          color: "text-cyan-400 dark:text-cyan-400",
          colorDark: "text-cyan-400",
          colorLight: "text-cyan-700",
          boxDark: "bg-cyan-500/10 border-cyan-500/25 shadow-sm shadow-cyan-500/10",
          boxLight: "bg-cyan-50 border-cyan-200 shadow-2xs",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeDark: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeLight: "bg-cyan-50 border-cyan-200 text-cyan-700",
          webToolName: null,
          webToolUrl: null,
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
      case "PROVISIONING":
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")}>
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            PROVISIONING
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

  const runningCount = databases.filter(d => d.status === "RUNNING").length;
  const totalHourlyBurn = databases
    .filter(d => d.status === "RUNNING")
    .reduce((acc, curr) => acc + (curr.hourlyRate || 28), 0);

  return (
    <div className="space-y-6 max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Managed Database
            </h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              Kubernetes Native
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            High-performance managed MySQL, MariaDB, PostgreSQL, MongoDB & Redis with isolated containers, SSD storage & web GUI.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchDatabases}
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
            href="/dashboard/database/new"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy Database</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              DATABASES
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {databases.length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Instances
            </span>
          </div>
        </div>

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

        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              HOURLY PAYG RATE
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {formatRupiah(totalHourlyBurn)}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              /hr
            </span>
          </div>
        </div>
      </div>

      {/* Main Content List */}
      {loading ? (
        <div className="min-h-[350px] w-full flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Loading managed database instances...
          </p>
        </div>
      ) : databases.length === 0 ? (
        /* Empty State */
        <div className={cn("rounded-2xl border p-10 sm:p-14 text-center", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
            <Database className="w-8 h-8" />
          </div>
          <h2 className={cn("text-lg font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>
            No Managed Databases Provisioned
          </h2>
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Deploy isolated MySQL, MariaDB, PostgreSQL, MongoDB or Redis containers with persistent SSD storage, automated PAYG billing starting from Rp 10.000 / month, and web admin panels.
          </p>
          <Link
            href="/dashboard/database/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy Database Now</span>
          </Link>
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {databases.map((db) => {
            const engine = getEngineMeta(db.type, db);
            const isActing = actionLoadingId === db.id;
            const isProvisioning = db.status === "PROVISIONING";
            const isSuspended = db.status === "SUSPENDED";
            const fullEndpoint = `${db.host}:${db.port}`;
            const isShared = Boolean(
              db.planName?.toLowerCase().includes("shared") ||
              ((db.cpuShares ?? 0) < 1.0 && !db.planName?.toLowerCase().includes("dedicated"))
            );
            const isDedicated = !isShared;

            return (
              <motion.div
                key={db.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl border p-5 transition-all flex flex-col justify-between group",
                  isProvisioning
                    ? isDark
                      ? "bg-[#0c0c0e] border-amber-500/40 ring-1 ring-amber-500/20 shadow-md"
                      : "bg-white border-amber-300 ring-1 ring-amber-200 shadow-xs"
                    : isSuspended
                    ? isDark
                      ? "bg-[#0c0c0e] border-red-500/40 shadow-md"
                      : "bg-white border-red-300 shadow-xs"
                    : isDark
                    ? "bg-[#0c0c0e] border-white/[0.08] hover:border-cyan-500/30 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                )}
              >
                <div>
                  {/* Card Header: Engine Icon, Name, Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        isDark ? engine.boxDark : engine.boxLight
                      )}>
                        <img src={engine.icon} alt={engine.name} className="w-6 h-6 object-contain pointer-events-none select-none" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            isDark ? engine.badgeDark : engine.badgeLight
                          )}>
                            {engine.name} {db.version}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            isDedicated
                              ? isDark
                                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                : "bg-cyan-50 text-cyan-700 border-cyan-200"
                              : isDark
                                ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                          )}>
                            {isDedicated ? "Dedicated" : "Shared"}
                          </span>
                        </div>
                        <h3 className={cn(
                          "text-base sm:text-lg font-extrabold tracking-tight mt-1 truncate max-w-[190px] transition-colors",
                          isDark ? "text-white group-hover:text-cyan-300" : "text-slate-900 group-hover:text-cyan-700"
                        )}>
                          {db.name}
                        </h3>
                      </div>
                    </div>

                    <div>
                      {getStatusBadge(db.status)}
                    </div>
                  </div>

                  {/* Provisioning / Suspended Alerts */}
                  {isProvisioning && (
                    <div className="mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-400">
                      <span className="flex items-center gap-2 font-semibold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Deploying container & volume...
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">Please wait</span>
                    </div>
                  )}

                  {isSuspended && (
                    <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-between text-xs text-red-400">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Suspended (3-Day Grace Period)
                      </span>
                      <Link href="/dashboard/billing" className="font-bold underline text-red-300 hover:text-white text-[11px]">
                        Top Up
                      </Link>
                    </div>
                  )}

                  {/* Connection Details Box */}
                  <div className={cn("p-3.5 rounded-xl border space-y-2 mb-4", isDark ? "bg-[#0a0a0c] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                        Direct Host & Port
                      </span>
                      <button
                        onClick={() => copyToClipboard(fullEndpoint, `endpoint-${db.id}`)}
                        className={cn("flex items-center gap-1 font-mono font-bold hover:underline cursor-pointer", isDark ? "text-cyan-400" : "text-cyan-700")}
                        title="Copy endpoint"
                      >
                        <span>{fullEndpoint}</span>
                        {copiedId === `endpoint-${db.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-70" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                        Database Name
                      </span>
                      <span className={cn("font-mono font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>
                        {db.dbName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                        Username
                      </span>
                      <span className={cn("font-mono font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>
                        {db.username}
                      </span>
                    </div>
                  </div>

                  {/* Resource Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1", isDark ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      <Cpu className="w-3 h-3 text-cyan-400" /> {db.cpuShares} vCPU
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1", isDark ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      <Layers className="w-3 h-3 text-cyan-400" /> {db.memoryMb >= 1024 ? `${db.memoryMb / 1024} GB` : `${db.memoryMb} MB`} RAM
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1", isDark ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      <HardDrive className="w-3 h-3 text-cyan-400" /> {db.storageGb} GB SSD
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1", isDark ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      <MapPin className="w-3 h-3 text-cyan-400" /> {db.region}
                    </span>
                  </div>

                  {/* Price info */}
                  <div className="flex items-center justify-between text-xs mb-4">
                    <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                      PAYG Accumulation:
                    </span>
                    <div className="text-right">
                      <span className={cn("font-black", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        {formatRupiah(db.monthlyPrice || 10000)}
                      </span>
                      <span className={cn("text-[10px] ml-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                        /mo (~Rp {db.hourlyRate || 14}/hr)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className={cn("pt-4 border-t flex items-center justify-between gap-2", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                  <div className="flex items-center gap-1.5">
                    {engine.webToolUrl && (
                      <a
                        href={isProvisioning || isSuspended ? undefined : engine.webToolUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all",
                          isProvisioning || isSuspended
                            ? "opacity-40 cursor-not-allowed pointer-events-none border-white/5 bg-white/5 text-zinc-500"
                            : isDark
                            ? "bg-white/5 border-white/10 text-cyan-300 hover:text-cyan-200 hover:bg-white/10 cursor-pointer"
                            : "bg-slate-50 border-slate-200 text-cyan-700 hover:bg-slate-100 cursor-pointer"
                        )}
                        title={isProvisioning ? "Preparing Web GUI..." : isSuspended ? "Database Suspended" : `Open in ${engine.webToolName}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{engine.webToolName}</span>
                      </a>
                    )}

                    {/* Power Action Buttons */}
                    {isProvisioning ? (
                      <span className="px-2 py-1 text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Provisioning...
                      </span>
                    ) : isSuspended ? (
                      <Link
                        href="/dashboard/billing"
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 transition-all flex items-center gap-1"
                        title="Reactivate Database by Adding Balance"
                      >
                        Reactivate
                      </Link>
                    ) : db.status === "RUNNING" ? (
                      <>
                        <button
                          onClick={() => setConfirmModal({ dbId: db.id, action: "restart", name: db.name })}
                          disabled={isActing}
                          className={cn("p-1.5 rounded-xl border transition-all cursor-pointer", isDark ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900")}
                          title="Restart Database"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmModal({ dbId: db.id, action: "stop", name: db.name })}
                          disabled={isActing}
                          className={cn("p-1.5 rounded-xl border transition-all cursor-pointer", isDark ? "bg-white/5 border-white/10 text-zinc-400 hover:text-amber-400" : "bg-slate-50 border-slate-200 text-slate-500 hover:text-amber-600")}
                          title="Stop Database"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmModal({ dbId: db.id, action: "start", name: db.name })}
                        disabled={isActing}
                        className={cn("p-1.5 rounded-xl border transition-all cursor-pointer", isDark ? "bg-white/5 border-white/10 text-zinc-400 hover:text-emerald-400" : "bg-slate-50 border-slate-200 text-slate-500 hover:text-emerald-600")}
                        title="Start Database"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/dashboard/database/${db.id}`}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}

          {/* Deploy New Database Card - Matching Managed Apps */}
          <Link
            href="/dashboard/database/new"
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
                Deploy New Database
              </h4>
              <p className={cn("text-xs mt-1 max-w-[200px] leading-relaxed", isDark ? "text-zinc-500" : "text-slate-500")}>
                Launch isolated MySQL, Postgres, MongoDB, MariaDB or Redis
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Action Confirmation Modal (Consistent with VPS) */}
      {confirmModal && (
        <ConfirmModal
          isOpen={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          onConfirm={async () => {
            if (confirmModal.action === "delete") {
              await handleDelete(confirmModal.dbId);
            } else {
              await handlePowerAction(confirmModal.dbId, confirmModal.action);
            }
            setConfirmModal(null);
          }}
          title={getSingleActionModalConfig(confirmModal).title}
          description={getSingleActionModalConfig(confirmModal).description}
          confirmText={getSingleActionModalConfig(confirmModal).confirmText}
          cancelText="Cancel"
          variant={getSingleActionModalConfig(confirmModal).variant}
          icon={getSingleActionModalConfig(confirmModal).icon}
          isLoading={actionLoadingId === confirmModal.dbId}
        />
      )}
    </div>
  );
}

