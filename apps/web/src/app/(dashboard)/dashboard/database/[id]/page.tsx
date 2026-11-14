"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import {
  Database, ChevronLeft, Check, Copy, ExternalLink, RefreshCw,
  Power, Square, Play, RotateCw, Download, Upload, Trash2, Eye, EyeOff,
  Cpu, Layers, HardDrive, ShieldAlert, Activity, Server, FileText, Code2, AlertTriangle, UploadCloud,
  Loader2, CheckCircle2, Zap, Info, TrendingUp
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DatabaseScaleModal } from "@/components/DatabaseScaleModal";

interface DatabaseDetail {
  id: number;
  name: string;
  type: string;
  version: string;
  planName: string;
  region: string;
  node: string;
  host: string;
  port: number;
  dbName: string;
  username: string;
  password?: string;
  rootPassword?: string;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  monthlyPrice: number;
  hourlyRate: number;
  accumulatedCost: number;
  status: "RUNNING" | "STOPPED" | "PROVISIONING" | "SUSPENDED" | "TERMINATED";
  suspendReason?: string | null;
  terminationDate?: string | null;
  createdAt: string;
  lastBilledAt?: string;
  k8sStatus?: {
    phase: string;
    ready: boolean;
    podName: string;
    restarts: number;
    cpuUsage: string;
    memoryUsage: string;
  };
  liveStatus?: {
    status: string;
    ready: boolean;
    podName?: string;
    cpu?: string;
    memory?: string;
    restarts?: number;
    uptime?: string;
  };
  connectionDetails?: {
    uri: string;
    laravelEnv: string;
    pmaUrl?: string | null;
    pgadminUrl?: string | null;
    mongoUrl?: string | null;
    mongoExpressUrl?: string | null;
  };
}

export default function DatabaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const dbId = resolvedParams.id;

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const [db, setDb] = useState<DatabaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRootPassword, setShowRootPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"URI" | "LARAVEL" | "NODE">("URI");
  const [confirmPowerModal, setConfirmPowerModal] = useState<{
    action: "start" | "stop" | "restart" | "delete";
    title: string;
    description: string;
    confirmText: string;
    variant: "danger" | "warning" | "success";
    icon: React.ReactNode;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Engine-aware data transfer wording (Redis is a key-value store: snapshot backup/restore, not SQL import/export)
  const engineUpper = (db?.type || "").toUpperCase();
  const isRedisEngine = engineUpper.includes("REDIS");
  const isMongoEngine = engineUpper.includes("MONGO");
  const transferUi = isRedisEngine
    ? {
      importBtn: "Restore Snapshot",
      exportBtn: "Download Snapshot",
      importTitle: "Restore Redis Snapshot (.rdb)",
      importSubtitle: "Replace all keys with an RDB snapshot",
      warning:
        "Restoring a snapshot REPLACES ALL existing keys in every logical database and restarts Redis (about 5–15 seconds of downtime). Download a fresh snapshot first if you may need to roll back.",
      accept: ".rdb",
      hint: "Supports .rdb snapshots from Redis 7.2 or older (Max 50MB)",
      submit: "Restore Snapshot",
      busy: "Restoring...",
      exportTitle: "Download a point-in-time RDB snapshot (no downtime)",
      importTooltip: "Restore an RDB snapshot (replaces all keys)",
    }
    : isMongoEngine
      ? {
        importBtn: "Import Data",
        exportBtn: "Export Dump",
        importTitle: "Import MongoDB Data",
        importSubtitle: `Restore a mongodump archive or JSON export into ${db?.name ?? "this database"}`,
        warning:
          "mongodump archives replace (drop & restore) the collections they contain. JSON files are imported into a collection named after the file.",
        accept: ".archive,.gz,.json,.dump,.bson",
        hint: "Supports mongodump .archive / .archive.gz and .json (Max 50MB)",
        submit: "Start Import",
        busy: "Importing...",
        exportTitle: "Download a mongodump archive (restore with mongorestore --archive)",
        importTooltip: "Import a mongodump archive or JSON file",
      }
      : {
        importBtn: "Import Data",
        exportBtn: "Export Dump",
        importTitle: "Import Database Dump",
        importSubtitle: `Execute an SQL dump directly on ${db?.name ?? "this database"}`,
        warning:
          "Executing an import will run all statements against the active database. Make sure you have exported a recent backup if needed.",
        accept: ".sql,.dump,.txt",
        hint: "Supports .sql and .dump (Max 50MB)",
        submit: "Start Import",
        busy: "Importing...",
        exportTitle: "Download SQL dump",
        importTooltip: "Import SQL dump file",
      };
  // Dedicated Resource Monitoring States (CPU, RAM, Disk)
  const [metricsTimeframe, setMetricsTimeframe] = useState<"live" | "hour" | "day" | "week">("hour");
  const [activeMetricTab, setActiveMetricTab] = useState<"ALL" | "CPU" | "RAM" | "DISK">("ALL");
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchMetrics = async (tf = metricsTimeframe, isBackground = false) => {
    try {
      if (!isBackground) setLoadingMetrics(true);
      const res = await fetch(`/api/user/database/${dbId}/metrics?timeframe=${tf}`);
      const json = await res.json();
      if (res.ok && json.success && json.isDedicated) {
        setMetricsData(json.data);
      }
    } catch {
      // quiet catch
    } finally {
      if (!isBackground) setLoadingMetrics(false);
    }
  };

  const wasReadyRef = useRef<boolean | null>(null);

  const fetchDatabase = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const res = await fetch(`/api/user/database/${dbId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const newDb = json.data;
        const isDbReady = newDb.status === "RUNNING" && Boolean(newDb.liveStatus?.ready || newDb.k8sStatus?.ready);

        // Notify user when engine transitions from initializing to ready
        if (wasReadyRef.current === false && isDbReady) {
          toast.success("Database engine is online and ready! Web GUI and live metrics are active.", {
            duration: 6000,
          });
          // Immediately fetch fresh metrics
          fetchMetrics(metricsTimeframe, true);
        }

        wasReadyRef.current = isDbReady;
        setDb(newDb);
      } else if (!isBackground) {
        toast.error(json.error || "Failed to load database details");
      }
    } catch {
      if (!isBackground) toast.error("Failed to connect to server");
    } finally {
      if (!isBackground) {
        setLoading(false);
        setTimeout(() => setRefreshing(false), 400);
      }
    }
  };

  // Initial database fetch
  useEffect(() => {
    fetchDatabase(false);
  }, [dbId]);

  // Realtime Database status polling (3s if initializing/provisioning, 12s if ready)
  useEffect(() => {
    const isDbReady = db?.status === "RUNNING" && Boolean(db?.liveStatus?.ready || db?.k8sStatus?.ready);
    const isInit = db?.status === "PROVISIONING" || (db?.status === "RUNNING" && !isDbReady);
    const pollInterval = isInit ? 3000 : 12000;
    const interval = setInterval(() => {
      fetchDatabase(true);
    }, pollInterval);
    return () => clearInterval(interval);
  }, [dbId, db?.status, db?.liveStatus?.ready, db?.k8sStatus?.ready]);

  // Realtime metrics polling without manual page refresh
  useEffect(() => {
    if (!db) return;
    const isSharedCheck = Boolean(
      db.planName?.toLowerCase().includes("shared") ||
      ((db.cpuShares ?? 0) < 1.0 && !db.planName?.toLowerCase().includes("dedicated"))
    );
    if (isSharedCheck) return;

    // Fetch initial metrics on timeframe change
    fetchMetrics(metricsTimeframe, false);

    // Continuous silent polling in realtime:
    // Live: 5s, Hour: 15s, Day/Week: 60s
    const metricsIntervalMs = metricsTimeframe === "live" ? 5000 : metricsTimeframe === "hour" ? 15000 : 60000;
    const interval = setInterval(() => {
      fetchMetrics(metricsTimeframe, true);
    }, metricsIntervalMs);

    return () => clearInterval(interval);
  }, [db?.id, db?.planName, db?.cpuShares, metricsTimeframe]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePowerAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(true);
    const toastId = toast.loading(`Performing ${action} on database...`);
    try {
      const res = await fetch(`/api/user/database/${dbId}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Database ${action}ed successfully`, { id: toastId });
        fetchDatabase();
      } else {
        toast.error(data.error || `Failed to ${action} database`, { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadDump = () => {
    toast.info(isRedisEngine ? "Creating Redis RDB snapshot..." : "Preparing database dump download from container...");
    const link = document.createElement("a");
    link.href = `/api/user/database/${dbId}/export`;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(`Please select a ${transferUi.accept.split(",").join(" / ")} file`);
      return;
    }
    setImporting(true);
    const toastId = toast.loading(isRedisEngine ? "Uploading snapshot, validating and restarting Redis..." : "Uploading and executing database import...");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`/api/user/database/${dbId}/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Database imported successfully!", { id: toastId });
        setImportModalOpen(false);
        setSelectedFile(null);
        fetchDatabase();
      } else {
        toast.error(data.error || "Database import failed", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to import database", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const toastId = toast.loading("Deleting database instance & cleaning up K8s PVC...");
    try {
      const res = await fetch(`/api/user/database/${dbId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Database terminated successfully", { id: toastId });
        router.push("/dashboard/database");
      } else {
        toast.error(data.error || "Failed to delete database", { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setDeleting(false);
      setConfirmPowerModal(null);
    }
  };

  const getEngineMeta = (type?: string) => {
    const t = (type || "").toUpperCase();
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
          webToolUrl: db?.connectionDetails?.pmaUrl || ""
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
          webToolUrl: db?.connectionDetails?.pmaUrl || ""
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
          webToolUrl: db?.connectionDetails?.pgadminUrl || ""
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
          webToolUrl: db?.connectionDetails?.mongoUrl || db?.connectionDetails?.mongoExpressUrl || ""
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
          webToolUrl: (db?.connectionDetails as any)?.redisUrl || (db?.connectionDetails as any)?.redisCommanderUrl || ""
        };
      default:
        return {
          name: type || "Database",
          icon: "/images/apps/postgresql.svg",
          color: "text-cyan-400 dark:text-cyan-400",
          colorDark: "text-cyan-400",
          colorLight: "text-cyan-700",
          boxDark: "bg-cyan-500/10 border-cyan-500/25 shadow-sm shadow-cyan-500/10",
          boxLight: "bg-cyan-50 border-cyan-200 shadow-2xs",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeDark: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          badgeLight: "bg-cyan-50 border-cyan-200 text-cyan-700",
          webToolName: "Web Panel",
          webToolUrl: db?.connectionDetails?.pmaUrl || ""
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
          Loading database details...
        </p>
      </div>
    );
  }

  if (!db) {
    return (
      <div className={cn("rounded-2xl border p-10 text-center shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
        <Database className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold mb-2">Database Not Found</h2>
        <p className={cn("text-xs mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
          This database may have been terminated or you do not have permission to access it.
        </p>
        <Link
          href="/dashboard/database"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950"
        >
          Back to Databases
        </Link>
      </div>
    );
  }

  const engine = getEngineMeta(db.type);

  const isShared = Boolean(
    db.planName?.toLowerCase().includes("shared") ||
    ((db.cpuShares ?? 0) < 1.0 && !db.planName?.toLowerCase().includes("dedicated"))
  );
  const isDedicated = !isShared;

  const isLiveReady = Boolean(db.liveStatus?.ready || db.k8sStatus?.ready);
  const isReady = db.status === "RUNNING" && isLiveReady;
  const isInitializing = db.status === "PROVISIONING" || (db.status === "RUNNING" && !isLiveReady);
  const isProvisioning = db.status === "PROVISIONING";
  const isSuspended = db.status === "SUSPENDED";

  const nodejsSnippet = db.type.toUpperCase() === "MONGODB"
    ? `DATABASE_URL="${db.connectionDetails?.uri || `mongodb://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbName}?authSource=admin`}"`
    : `DATABASE_URL="${db.connectionDetails?.uri || `mysql://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbName}`}"`;

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Back Navigation */}
      <div>
        <Link
          href="/dashboard/database"
          className={cn(
            "inline-flex items-center gap-2 text-xs sm:text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit",
            isDark 
              ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40" 
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Databases
        </Link>
      </div>

      {/* Top Header Bar - Matched with VPS Card Theme */}
      <div className={cn(
        "flex flex-col md:flex-row justify-between items-start md:items-center border rounded-2xl p-4 sm:p-5 shadow-2xs relative overflow-hidden gap-4",
        isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
      )}>
        <div className="flex items-center gap-3.5">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs",
                isDark ? engine.boxDark : engine.boxLight
              )}>
                <img src={engine.icon} alt={engine.name} className="w-5 h-5 object-contain pointer-events-none select-none" />
              </div>
              <h1 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {db.name}
              </h1>
              <span className={cn(
                "text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-md border",
                isDark ? engine.badgeDark : engine.badgeLight
              )}>
                {engine.name} {db.version}
              </span>
              <span className={cn(
                "text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-md border",
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
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5",
                isReady
                  ? (isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                  : isInitializing
                    ? (isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")
                    : isSuspended
                      ? (isDark ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-200")
                      : (isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200")
              )}>
                {isReady && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {isInitializing && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                {isSuspended && <AlertTriangle className="w-3 h-3 text-red-400" />}
                {isReady ? "ONLINE & READY" : isInitializing ? "INITIALIZING ENGINE..." : db.status}
              </span>
            </div>
            <p className={cn("text-xs sm:text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
              Endpoint: <span className="font-mono text-cyan-400 font-bold">{db.host}:{db.port}</span> • Region: {db.region} • PAYG: {formatRupiah(db.hourlyRate || 14)}/hr
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchDatabase(false)}
            disabled={refreshing}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
            title="Refresh metrics & status"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>

          {/* Power Controls */}
          {db.status === "RUNNING" ? (
            <>
              <button
                onClick={() => setConfirmPowerModal({
                  action: "restart",
                  title: "Restart Database Container",
                  description: `Are you sure you want to restart ${db.name}? Active database client connections will briefly reconnect while the container pod restarts.`,
                  confirmText: "Restart Database",
                  variant: "warning",
                  icon: <RotateCw className="w-8 h-8" />
                })}
                disabled={actionLoading || isProvisioning || isSuspended}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  isDark ? "bg-white/5 border-white/10 text-zinc-300 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
                title={isInitializing ? "Database engine is initializing..." : isSuspended ? "Database is suspended" : "Restart container"}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
              <button
                onClick={() => setConfirmPowerModal({
                  action: "stop",
                  title: "Stop Database Container",
                  description: `Are you sure you want to stop ${db.name}? Database clients will not be able to connect until restarted. Persistent storage data on disk will remain safe.`,
                  confirmText: "Stop Database",
                  variant: "warning",
                  icon: <Square className="w-8 h-8 fill-current" />
                })}
                disabled={actionLoading || isInitializing || isSuspended}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                )}
                title={isInitializing ? "Database engine is initializing..." : isSuspended ? "Database is suspended" : "Stop container"}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmPowerModal({
                action: "start",
                title: "Start Database Container",
                description: `Are you sure you want to start ${db.name}? The container pod will start up and allow database connections.`,
                confirmText: "Start Database",
                variant: "success",
                icon: <Play className="w-8 h-8 fill-current" />,
              })}
              disabled={actionLoading || isInitializing || isSuspended}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              )}
              title={isInitializing ? "Database engine is initializing..." : isSuspended ? "Database is suspended" : "Start container"}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </button>
          )}

          {/* Scale / Upgrade Database Button */}
          <button
            onClick={() => setScaleModalOpen(true)}
            disabled={isInitializing || isSuspended}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed",
              isDark
                ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
            )}
            title={isInitializing ? "Database engine is initializing..." : "Scale compute resources and expand storage"}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Scale / Upgrade</span>
          </button>

          {/* Import Dump Button */}
          <button
            onClick={() => setImportModalOpen(true)}
            disabled={isInitializing || isSuspended}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed",
              isDark
                ? "bg-white/5 border-white/10 text-zinc-200 hover:text-white hover:bg-white/10"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            )}
            title={isInitializing ? "Database engine is still initializing..." : transferUi.importTooltip}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{transferUi.importBtn}</span>
          </button>

          {/* Export Dump Button */}
          <button
            onClick={handleDownloadDump}
            disabled={isInitializing || isSuspended}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={isInitializing ? "Database engine is still initializing..." : transferUi.exportTitle}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{transferUi.exportBtn}</span>
          </button>
        </div>
      </div>

      {/* Active Initializing / Provisioning State with Step Animations */}
      {isInitializing && (
        <div className={cn(
          "rounded-2xl border p-5 sm:p-6 transition-all relative overflow-hidden",
          isDark
            ? "bg-[#0a0a0c] border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.06)]"
            : "bg-cyan-50/60 border-cyan-200 shadow-sm"
        )}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-100 border-cyan-200")}>
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn("text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {isProvisioning ? "Provisioning Database on Kubernetes Cluster..." : "Initializing Database Engine & Storage..."}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
                    Initializing Engine
                  </span>
                </div>
                <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Container {engine.name} is booting and initializing the database engine in Sidoarjo cluster. Web GUI ({engine.webToolName}), client connections, and realtime telemetry will automatically activate once ready without manual page refresh.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono", isDark ? "bg-white/[0.03] border-white/[0.08] text-zinc-400" : "bg-white border-slate-200 text-slate-500 shadow-2xs")}>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                <span>Auto-refreshing realtime...</span>
              </div>
            </div>
          </div>

          {/* Provisioning Progress Steps */}
          <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t", isDark ? "border-white/[0.06]" : "border-cyan-100")}>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>1. Port & Secret Allocation</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>2. Mount Persistent SSD Volume</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-cyan-400">
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-cyan-400" />
              <span>3. Start Pod & Readiness Check</span>
            </div>
          </div>
        </div>
      )}

      {/* Suspended Alert Banner with 3-Day Grace Period */}
      {isSuspended && (
        <div className={cn(
          "rounded-2xl border p-5 sm:p-6 transition-all relative overflow-hidden",
          isDark
            ? "bg-gradient-to-r from-red-500/15 via-amber-500/10 to-transparent border-red-500/30"
            : "bg-gradient-to-r from-red-50 via-amber-50 to-white border-red-300 shadow-sm"
        )}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn("text-base font-bold tracking-tight text-red-400")}>
                    Database Service Suspended
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                    Low Balance
                  </span>
                </div>
                <p className={cn("text-xs mt-1 leading-relaxed", isDark ? "text-zinc-300" : "text-slate-700")}>
                  {db.suspendReason || "Account balance is insufficient for hourly Pay-As-You-Go deductions."}{" "}
                  {db.terminationDate && (
                    <strong className="text-amber-400">
                      3-day grace period until {new Date(db.terminationDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}.
                    </strong>
                  )}{" "}
                  If the grace period expires without top up, the database instance and all persistent SSD volume data will be permanently terminated.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <Link
                href="/dashboard/topup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Top Up Balance Now</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Column (Credentials & Snippets) + Right Column (Web GUI & Telemetry & Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Connection Credentials Card */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#111115] border-white/[0.08] shadow-2xs" : "bg-white border-slate-200/90 shadow-2xs")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <h2 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Connection Credentials
                </h2>
              </div>
              <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
                Public TCP NodePort
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Host */}
              <div className={cn("p-3.5 rounded-xl border flex items-center justify-between", isDark ? "bg-[#0a0a0c] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                <div>
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Host / Endpoint
                  </span>
                  <span className={cn("font-mono font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    {db.host}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(db.host, "host")}
                  className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                  title="Copy host"
                >
                  {copiedKey === "host" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Port */}
              <div className={cn("p-3.5 rounded-xl border flex items-center justify-between", isDark ? "bg-[#0a0a0c] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                <div>
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>
                    NodePort
                  </span>
                  <span className={cn("font-mono font-bold text-sm text-cyan-400")}>
                    {db.port}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(String(db.port), "port")}
                  className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                  title="Copy port"
                >
                  {copiedKey === "port" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Database Name */}
              <div className={cn("p-3.5 rounded-xl border flex items-center justify-between", isDark ? "bg-[#0a0a0c] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                <div>
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Database Name
                  </span>
                  <span className={cn("font-mono font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    {db.dbName}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(db.dbName, "dbname")}
                  className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                  title="Copy DB name"
                >
                  {copiedKey === "dbname" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Username */}
              <div className={cn("p-3.5 rounded-xl border flex items-center justify-between", isDark ? "bg-[#0a0a0c] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                <div>
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Username
                  </span>
                  <span className={cn("font-mono font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    {db.username}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(db.username, "username")}
                  className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                  title="Copy username"
                >
                  {copiedKey === "username" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Password */}
              <div className={cn("p-3.5 rounded-xl border flex items-center justify-between", isDark ? "bg-[#0a0a0c] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                <div>
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Password
                  </span>
                  <span className={cn("font-mono font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    {showPassword ? db.password : "••••••••••••"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => db.password && copyToClipboard(db.password, "password")}
                    className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                    title="Copy password"
                  >
                    {copiedKey === "password" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Root Password */}
              {db.rootPassword && (
                <div className={cn("p-3.5 rounded-xl border flex items-center justify-between", isDark ? "bg-[#0a0a0c] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                  <div>
                    <span className={cn("text-[10px] uppercase font-bold tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>
                      Root / Superuser Password
                    </span>
                    <span className={cn("font-mono font-bold text-sm text-amber-400")}>
                      {showRootPassword ? db.rootPassword : "••••••••••••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowRootPassword(!showRootPassword)}
                      className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                    >
                      {showRootPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => db.rootPassword && copyToClipboard(db.rootPassword, "rootpassword")}
                      className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                      title="Copy root password"
                    >
                      {copiedKey === "rootpassword" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Resource Utilization Graphs (CPU, RAM, Disk) - Strictly for Dedicated instances */}
          {isDedicated && (
            <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#111115] border-white/[0.08] shadow-2xs" : "bg-white border-slate-200/90 shadow-2xs")}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      Dedicated Resource Monitoring
                    </h2>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
                      isReady
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                      {isReady ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Live Telemetry</span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                          <span>Initializing Telemetry</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Dedicated instance utilization for vCPU compute, RAM memory, and persistent SSD disk storage.
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
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      CPU Utilization
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{db.cpuShares} vCPU</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      {metricsData?.summary?.cpu?.current ?? (db.status === "RUNNING" ? 12.5 : 0)}%
                    </span>
                    <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
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
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      Memory (RAM)
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{db.memoryMb} MB Max</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      {metricsData?.summary?.memory?.currentMb ?? (db.status === "RUNNING" ? Math.min(db.memoryMb, 240) : 0)} MB
                    </span>
                    <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
                      ({metricsData?.summary?.memory?.percentage ?? (db.status === "RUNNING" ? Math.round((240 / db.memoryMb) * 100) : 0)}%)
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
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                      SSD Storage
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{db.storageGb} GB Quota</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      {metricsData?.summary?.disk?.usedGb ?? 1.2} GB
                    </span>
                    <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
                      ({metricsData?.summary?.disk?.percentage ?? Math.round((1.2 / db.storageGb) * 100)}%)
                    </span>
                  </div>
                </button>
              </div>

              {/* Chart Filter Tabs */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={cn("text-xs font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>
                  {activeMetricTab === "ALL" && "All Resource Metrics Combined (%)"}
                  {activeMetricTab === "CPU" && `CPU Load Over Time (${db.cpuShares} vCPU Dedicated)`}
                  {activeMetricTab === "RAM" && `Memory Consumption Over Time (Allocated: ${db.memoryMb} MB)`}
                  {activeMetricTab === "DISK" && `Persistent SSD Disk Utilization (Allocated: ${db.storageGb} GB)`}
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
                      <linearGradient id="dbCpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dbRamGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dbDiskGrad" x1="0" y1="0" x2="0" y2="1">
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
                      <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#06b6d4" strokeWidth={2.5} fill="url(#dbCpuGrad)" />
                    )}
                    {(activeMetricTab === "ALL" || activeMetricTab === "RAM") && (
                      <Area type="monotone" dataKey="memory" name="RAM %" stroke="#818cf8" strokeWidth={2.5} fill="url(#dbRamGrad)" />
                    )}
                    {(activeMetricTab === "ALL" || activeMetricTab === "DISK") && (
                      <Area type="monotone" dataKey="disk" name="Disk %" stroke="#10b981" strokeWidth={2.5} fill="url(#dbDiskGrad)" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Quick Connect Code Snippets (URI, Laravel, Node.js) */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#111115] border-white/[0.08] shadow-2xs" : "bg-white border-slate-200/90 shadow-2xs")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                <h2 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Connection Snippets & SDK Config
                </h2>
              </div>

              {/* Tab Selector */}
              <div className={cn("p-1 rounded-xl border flex items-center gap-1 self-start sm:self-auto", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                {(["URI", "LARAVEL", "NODE"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSnippetTab(tab)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      activeSnippetTab === tab
                        ? "bg-cyan-500 text-slate-950 shadow-xs"
                        : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {tab === "URI" ? "Connection URI" : tab === "LARAVEL" ? "Laravel .env" : "Node / Prisma"}
                  </button>
                ))}
              </div>
            </div>

            {/* Snippet Output */}
            <div className="relative">
              <pre className={cn("p-4 rounded-xl border font-mono text-xs overflow-x-auto custom-scrollbar leading-relaxed", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-200" : "bg-slate-50 border-slate-200 text-slate-800")}>
                {activeSnippetTab === "URI" && (db.connectionDetails?.uri || `mysql://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbName}`)}
                {activeSnippetTab === "LARAVEL" && (db.connectionDetails?.laravelEnv || `DB_CONNECTION=mysql\nDB_HOST=${db.host}\nDB_PORT=${db.port}\nDB_DATABASE=${db.dbName}\nDB_USERNAME=${db.username}\nDB_PASSWORD=${db.password}`)}
                {activeSnippetTab === "NODE" && nodejsSnippet}
              </pre>

              <button
                type="button"
                onClick={() => {
                  const content = activeSnippetTab === "URI"
                    ? (db.connectionDetails?.uri || "")
                    : activeSnippetTab === "LARAVEL"
                      ? (db.connectionDetails?.laravelEnv || "")
                      : nodejsSnippet;
                  copyToClipboard(content, `snippet-${activeSnippetTab}`);
                }}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 border border-white/10 transition-all cursor-pointer"
              >
                {copiedKey === `snippet-${activeSnippetTab}` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Web GUI + Live Metrics + Danger Zone) */}
        <div className="space-y-6">

          {/* Web Viewer Access Card */}
          {engine.webToolUrl && (
            <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#111115] border-white/[0.08] shadow-2xs" : "bg-white border-slate-200/90 shadow-2xs")}>
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Web GUI ({engine.webToolName})
                </h3>
              </div>

              <p className={cn("text-xs leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>
                Visual database management interface via browser. Log in using your instance host, port, username, and password.
              </p>

              <div className={cn("p-3 rounded-xl border text-xs font-mono mb-4 space-y-2", isDark ? "bg-[#0a0a0c] border-white/[0.06] text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                <div className="flex items-center justify-between">
                  <div><strong>Server:</strong> {db.type?.toUpperCase().includes('MONGO') ? `db-${db.id}-mongo.db.masdika.id` : `${db.host}:${db.port}`}</div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(db.type?.toUpperCase().includes('MONGO') ? `db-${db.id}-mongo.db.masdika.id` : `${db.host}:${db.port}`, "webgui-server")}
                    className={cn("p-1 rounded hover:bg-white/10 transition-colors cursor-pointer", copiedKey === "webgui-server" ? "text-emerald-400" : "text-zinc-400 hover:text-white")}
                    title="Copy server endpoint"
                  >
                    {copiedKey === "webgui-server" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div><strong>User:</strong> {db.type?.toUpperCase().includes('POSTGRES') ? `${db.username}@db.masdika.id` : db.username}</div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(db.type?.toUpperCase().includes('POSTGRES') ? `${db.username}@db.masdika.id` : db.username, "webgui-user")}
                    className={cn("p-1 rounded hover:bg-white/10 transition-colors cursor-pointer", copiedKey === "webgui-user" ? "text-emerald-400" : "text-zinc-400 hover:text-white")}
                    title="Copy username"
                  >
                    {copiedKey === "webgui-user" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div><strong>Pass:</strong> {showPassword ? db.password : "••••••••••••"}</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => db.password && copyToClipboard(db.password, "webgui-pass")}
                      className={cn("p-1 rounded hover:bg-white/10 transition-colors cursor-pointer", copiedKey === "webgui-pass" ? "text-emerald-400" : "text-zinc-400 hover:text-white")}
                      title="Copy password"
                    >
                      {copiedKey === "webgui-pass" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Contextual Web GUI Guidance */}
              <div className={cn("p-2.5 rounded-xl border text-[11px] leading-relaxed mb-4 flex items-start gap-2", isDark ? "bg-cyan-950/20 border-cyan-500/20 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {db.type?.toUpperCase().includes('MONGO') ? (
                    <div>
                      <strong>Mongo Express Login:</strong> When the browser <em>Sign in</em> prompt appears, enter the <strong>User</strong> and <strong>Pass</strong> above (not your web portal email).
                    </div>
                  ) : db.type?.toUpperCase().includes('POSTGRES') ? (
                    <div>
                      <strong>pgAdmin 4 Login:</strong> Enter the <strong>User</strong> and <strong>Pass</strong> above to log in. Your database instance is pre-registered in pgAdmin.
                    </div>
                  ) : db.type?.toUpperCase().includes('REDIS') ? (
                    <div>
                      <strong>Redis Commander Login:</strong> Enter the <strong>User</strong> and <strong>Pass</strong> above in the sign-in modal to browse keys and telemetry over SSL.
                    </div>
                  ) : (
                    <div>
                      <strong>phpMyAdmin Login:</strong> Host and Username are auto-filled when clicking <em>Launch phpMyAdmin</em>. Simply copy the <strong>Pass</strong> above and click <strong>Log in</strong>.
                    </div>
                  )}
                  {isInitializing ? (
                    <p className="text-amber-400 font-semibold flex items-center gap-1.5 pt-0.5">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
                      <span>Waiting for database engine to accept connections before Web GUI is enabled...</span>
                    </p>
                  ) : isReady ? (
                    <p className="text-emerald-400 font-semibold flex items-center gap-1 pt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Database engine is online and accepting connections!</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {isInitializing ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                  title="Web GUI will activate automatically once the database engine is ready"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Starting {engine.webToolName} (Waiting for Engine)...</span>
                </button>
              ) : isSuspended ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center gap-2 cursor-not-allowed"
                  title="Database suspended due to insufficient balance"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Locked (Suspended)</span>
                </button>
              ) : (
                <a
                  href={engine.webToolUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <span>Launch {engine.webToolName}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Live Telemetry Card */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#111115] border-white/[0.08] shadow-2xs" : "bg-white border-slate-200/90 shadow-2xs")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Cluster Telemetry
                </h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Pod Status</span>
                <span className="font-bold text-emerald-400">{db.k8sStatus?.phase || (db.status === "RUNNING" ? "Running" : "Stopped")}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>CPU Usage</span>
                <span className="font-mono font-bold">{db.k8sStatus?.cpuUsage || "Active (~25m)"}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Memory Usage</span>
                <span className="font-mono font-bold">{db.k8sStatus?.memoryUsage || "Active (~180Mi)"}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Tier Architecture</span>
                <span className="font-bold text-cyan-400">
                  {db.planName || (isDedicated ? "Dedicated Database" : "Shared Database")}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Allocated Quota</span>
                <span className="font-semibold">{db.cpuShares} vCPU / {db.memoryMb >= 1024 ? `${db.memoryMb / 1024} GB` : `${db.memoryMb} MB`} RAM</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Storage Volume</span>
                <span className="font-semibold">{db.storageGb} GB SSD</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Hourly Burn</span>
                <span className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  {formatRupiah(db.hourlyRate || 14)}/hr
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setScaleModalOpen(true)}
                disabled={isInitializing || isSuspended}
                className={cn(
                  "w-full py-2.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  isDark
                    ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                    : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Scale Compute & Storage</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Terminate Instance */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all border-red-500/20", isDark ? "bg-red-500/[0.03]" : "bg-red-50/50")}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="text-base font-bold text-red-500">
                Danger Zone
              </h3>
            </div>
            <p className={cn("text-xs leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>
              Terminating this instance will permanently delete the container, stop hourly billing, and delete all persistent database data on disk.
            </p>

            <button
              type="button"
              disabled={deleting || isProvisioning}
              onClick={() => setConfirmPowerModal({
                action: "delete",
                title: "Terminate Database Instance",
                description: `WARNING: Are you sure you want to permanently delete ${db.name}? All persistent volume storage and database data will be destroyed immediately and cannot be recovered.`,
                confirmText: "Delete Database",
                variant: "danger",
                icon: <Trash2 className="w-8 h-8" />,
              })}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              title={isProvisioning ? "Wait until provisioning completes" : "Terminate database"}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Terminate & Delete Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Confirmation Modal (Consistent with VPS) */}
      {confirmPowerModal && (
        <ConfirmModal
          isOpen={!!confirmPowerModal}
          onClose={() => setConfirmPowerModal(null)}
          onConfirm={async () => {
            if (confirmPowerModal.action === "delete") {
              await handleDelete();
            } else {
              await handlePowerAction(confirmPowerModal.action);
            }
            setConfirmPowerModal(null);
          }}
          title={confirmPowerModal.title}
          description={confirmPowerModal.description}
          confirmText={confirmPowerModal.confirmText}
          cancelText="Cancel"
          variant={confirmPowerModal.variant}
          icon={confirmPowerModal.icon}
          isLoading={actionLoading || deleting}
        />
      )}

      {/* Import Database Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !importing && setImportModalOpen(false)} />
          <div className={cn("relative border rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl z-10", isDark ? "bg-[#111115] border-white/[0.1] text-white" : "bg-white border-slate-200/90 text-slate-900")}>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">{transferUi.importTitle}</h3>
                  <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {transferUi.importSubtitle}
                  </p>
                </div>
              </div>

              {/* Notice */}
              <div className={cn("p-3 rounded-xl border text-xs flex gap-2.5", isRedisEngine ? (isDark ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-800") : (isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"))}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {transferUi.warning}
                </p>
              </div>

              {/* File Input */}
              <div className={cn("p-4 rounded-xl border border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all", isDark ? "border-white/20 hover:border-cyan-400/50 bg-white/[0.02]" : "border-slate-300 hover:border-cyan-500 bg-slate-50/50")}>
                <input
                  type="file"
                  id="import-file-input"
                  accept={transferUi.accept}
                  disabled={importing}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="import-file-input" className="cursor-pointer w-full flex flex-col items-center">
                  <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                  <span className="font-semibold text-xs mb-1">
                    {selectedFile ? selectedFile.name : "Click to browse or drag & drop"}
                  </span>
                  <span className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-400")}>
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to ${isRedisEngine ? "restore" : "import"}`
                      : transferUi.hint}
                  </span>
                </label>
              </div>

              <div className="flex w-full gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportModalOpen(false);
                    setSelectedFile(null);
                  }}
                  disabled={importing}
                  className={cn("flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 border", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !selectedFile}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer shadow-md"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{transferUi.busy}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{transferUi.submit}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Scale & Upgrade Modal */}
      {db && (
        <DatabaseScaleModal
          isOpen={scaleModalOpen}
          onClose={() => setScaleModalOpen(false)}
          database={db}
          onSuccess={() => fetchDatabase(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

