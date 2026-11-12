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
  AlertTriangle, ArrowRight, Play, Square, RotateCw, Trash2
} from "lucide-react";
import { SiMysql, SiPostgresql, SiMariadb, SiMongodb } from "react-icons/si";
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

  useEffect(() => {
    fetchDatabases();
    const interval = setInterval(fetchDatabases, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

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
          icon: SiMysql,
          color: "text-[#00758F]",
          badgeBg: "bg-[#00758F]/15 border-[#00758F]/30 text-[#00758F]",
          webToolName: "phpMyAdmin",
          webToolUrl: details?.pmaUrl || null,
        };
      case "MARIADB":
        return {
          name: "MariaDB",
          icon: SiMariadb,
          color: "text-[#C0765A]",
          badgeBg: "bg-[#C0765A]/15 border-[#C0765A]/30 text-[#C0765A]",
          webToolName: "phpMyAdmin",
          webToolUrl: details?.pmaUrl || null,
        };
      case "POSTGRES":
      case "POSTGRESQL":
        return {
          name: "PostgreSQL",
          icon: SiPostgresql,
          color: "text-[#336791]",
          badgeBg: "bg-[#336791]/15 border-[#336791]/30 text-[#336791]",
          webToolName: "pgAdmin 4",
          webToolUrl: details?.pgAdminUrl || details?.pgadminUrl || null,
        };
      case "MONGODB":
      case "MONGO":
        return {
          name: "MongoDB",
          icon: SiMongodb,
          color: "text-[#47A248]",
          badgeBg: "bg-[#47A248]/15 border-[#47A248]/30 text-[#47A248]",
          webToolName: "Mongo Express",
          webToolUrl: details?.mongoUrl || details?.mongoExpressUrl || null,
        };
      default:
        return {
          name: type,
          icon: Database,
          color: "text-cyan-400",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
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
              K3s Native
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            High-performance managed MySQL, MariaDB, PostgreSQL & MongoDB with isolated containers, NVMe storage & web GUI.
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
            <Plus className="w-4 h-4" />
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
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-purple-500/15 border-purple-500/25 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-700")}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Sidoarjo
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-purple-400" : "text-purple-600")}>
              ID-SDA
            </span>
          </div>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              HOURLY PAYG RATE
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {formatRupiah(totalHourlyBurn)}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-amber-400" : "text-amber-600")}>
              /jam
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
            Deploy isolated MySQL, MariaDB, PostgreSQL or MongoDB containers with persistent NVMe storage, automated PAYG billing at Rp 20.000 / month, and web admin panels.
          </p>
          <Link
            href="/dashboard/database/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Database Now</span>
          </Link>
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {databases.map((db) => {
            const engine = getEngineMeta(db.type, db);
            const EngineIcon = engine.icon;
            const isActing = actionLoadingId === db.id;
            const fullEndpoint = `${db.host}:${db.port}`;

            return (
              <motion.div
                key={db.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl border p-5 transition-all flex flex-col justify-between group",
                  isDark ? "bg-[#0c0c0e] border-white/[0.08] hover:border-cyan-500/30 shadow-md" : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                )}
              >
                <div>
                  {/* Card Header: Engine Icon, Name, Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                        <EngineIcon className={cn("w-6 h-6", engine.color)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", engine.badgeBg)}>
                            {engine.name} {db.version}
                          </span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", db.cpuShares >= 2.0 ? "bg-purple-500/15 text-purple-300 border-purple-500/30" : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20")}>
                            {db.cpuShares >= 2.0 ? "Dedicated" : "Shared"}
                          </span>
                        </div>
                        <h3 className={cn("text-base font-bold tracking-tight mt-1 truncate max-w-[170px]", isDark ? "text-white" : "text-slate-900")}>
                          {db.name}
                        </h3>
                      </div>
                    </div>

                    <div>
                      {getStatusBadge(db.status)}
                    </div>
                  </div>

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
                      <Layers className="w-3 h-3 text-purple-400" /> {db.memoryMb >= 1024 ? `${db.memoryMb / 1024} GB` : `${db.memoryMb} MB`} RAM
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1", isDark ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      <HardDrive className="w-3 h-3 text-amber-400" /> {db.storageGb} GB NVMe
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border", isDark ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      📍 {db.region}
                    </span>
                  </div>

                  {/* Price info */}
                  <div className="flex items-center justify-between text-xs mb-4">
                    <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                      PAYG Accumulation:
                    </span>
                    <div className="text-right">
                      <span className={cn("font-black", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        {formatRupiah(db.monthlyPrice || 20000)}
                      </span>
                      <span className={cn("text-[10px] ml-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                        /bln (~Rp {db.hourlyRate || 28}/jam)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className={cn("pt-4 border-t flex items-center justify-between gap-2", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                  <div className="flex items-center gap-1.5">
                    {engine.webToolUrl && (
                      <a
                        href={engine.webToolUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer",
                          isDark ? "bg-white/5 border-white/10 text-cyan-300 hover:text-cyan-200 hover:bg-white/10" : "bg-slate-50 border-slate-200 text-cyan-700 hover:bg-slate-100"
                        )}
                        title={`Open in ${engine.webToolName}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{engine.webToolName}</span>
                      </a>
                    )}

                    {/* Power Action Buttons */}
                    {db.status === "RUNNING" ? (
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

