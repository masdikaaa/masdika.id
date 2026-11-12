"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import {
  Database, RefreshCw, Server, ExternalLink, Power,
  Copy, Check, Activity, ShieldCheck, HardDrive, Cpu, Layers,
  AlertTriangle, ArrowRight, Play, Square, RotateCw, Trash2, Search, Settings, ShieldAlert
} from "lucide-react";
import { SiMysql, SiPostgresql, SiMariadb, SiMongodb } from "react-icons/si";

interface AdminDatabaseItem {
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
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  hourlyRate: number;
  monthlyPrice: number;
  status: "RUNNING" | "STOPPED" | "PROVISIONING" | "SUSPENDED" | "TERMINATED";
  createdAt: string;
  customerName: string;
  customerEmail: string;
  isShared: boolean;
  isDedicated: boolean;
  connectionDetails?: {
    host?: string;
    port?: number;
    pmaUrl?: string | null;
    pgadminUrl?: string | null;
    mongoUrl?: string | null;
  };
}

export default function AdminDatabasePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [databases, setDatabases] = useState<AdminDatabaseItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEngine, setSelectedEngine] = useState<string>("ALL");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<AdminDatabaseItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDatabases = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/database");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDatabases(json.data);
        setStats(json.stats);
      } else {
        toast.error(json.error || "Failed to load database instances");
      }
    } catch {
      toast.error("Failed to connect to admin API");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 300);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (!deleteModalItem) return;
    setDeleting(true);
    const toastId = toast.loading(`Terminating ${deleteModalItem.name} on K8s cluster...`);
    try {
      const res = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteModalItem.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Database terminated successfully", { id: toastId });
        setDeleteModalItem(null);
        fetchDatabases();
      } else {
        toast.error(data.error || "Failed to terminate database", { id: toastId });
      }
    } catch {
      toast.error("An error occurred during termination", { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const getEngineMeta = (type: string) => {
    const t = (type || "").toUpperCase();
    switch (t) {
      case "MYSQL":
        return { name: "MySQL", icon: SiMysql, color: "text-[#00758F]", badgeBg: "bg-[#00758F]/15 border-[#00758F]/30 text-[#00758F]" };
      case "MARIADB":
        return { name: "MariaDB", icon: SiMariadb, color: "text-[#C0765A]", badgeBg: "bg-[#C0765A]/15 border-[#C0765A]/30 text-[#C0765A]" };
      case "POSTGRES":
      case "POSTGRESQL":
        return { name: "PostgreSQL", icon: SiPostgresql, color: "text-[#336791]", badgeBg: "bg-[#336791]/15 border-[#336791]/30 text-[#336791]" };
      case "MONGODB":
      case "MONGO":
        return { name: "MongoDB", icon: SiMongodb, color: "text-[#47A248]", badgeBg: "bg-[#47A248]/15 border-[#47A248]/30 text-[#47A248]" };
      default:
        return { name: type, icon: Database, color: "text-cyan-400", badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" };
    }
  };

  const filteredDatabases = databases.filter((db) => {
    const matchesSearch =
      !searchQuery ||
      db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      db.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      db.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      db.dbName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(db.port).includes(searchQuery);

    const matchesEngine = selectedEngine === "ALL" || db.type.toUpperCase().includes(selectedEngine);
    const matchesTier = selectedTier === "ALL" || (selectedTier === "DEDICATED" ? db.isDedicated : db.isShared);

    return matchesSearch && matchesEngine && matchesTier;
  });

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Managed Database Clusters
            </h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              K3s Native
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage all customer MySQL, MariaDB, PostgreSQL & MongoDB database pods deployed on Kubernetes.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchDatabases}
            disabled={refreshing || loading}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
            title="Refresh database records"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (refreshing || loading) && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>

          {stats?.webPanels?.pmaUrl && (
            <a
              href={stats.webPanels.pmaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 border cursor-pointer",
                isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              )}
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>phpMyAdmin</span>
            </a>
          )}

          {stats?.webPanels?.pgadminUrl && (
            <a
              href={stats.webPanels.pgadminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 border cursor-pointer",
                isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              )}
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#336791]" />
              <span>pgAdmin 4</span>
            </a>
          )}

          <Link
            href="/admin/settings"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cluster Settings</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Instances */}
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              TOTAL DATABASES
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats?.totalInstances ?? databases.length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Active Instances
            </span>
          </div>
        </div>

        {/* Running Pods */}
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              RUNNING PODS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats?.runningCount ?? databases.filter(d => d.status === "RUNNING").length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-emerald-400" : "text-emerald-600")}>
              Online
            </span>
          </div>
        </div>

        {/* Allocated Compute */}
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              ALLOCATED COMPUTE
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-purple-500/15 border-purple-500/25 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-700")}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats?.totalCpu ?? 0}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-purple-400" : "text-purple-600")}>
              vCPU · {stats?.totalMemoryGb ?? 0} GB RAM
            </span>
          </div>
        </div>

        {/* Total Storage */}
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              NVME DISK QUOTA
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")}>
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats?.totalStorageGb ?? 0} GB
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-amber-400" : "text-amber-600")}>
              PV / PVC Volume
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className={cn("w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none", isDark ? "text-zinc-500" : "text-slate-400")} />
          <input
            type="text"
            placeholder="Search by instance, customer name, email, or port..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none transition-all",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500/40"
                : "bg-white border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 shadow-2xs"
            )}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Engine Selector */}
          <div className={cn("p-1 rounded-xl border flex items-center gap-1", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
            {["ALL", "MYSQL", "POSTGRES", "MONGODB", "MARIADB"].map((eng) => (
              <button
                key={eng}
                type="button"
                onClick={() => setSelectedEngine(eng)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectedEngine === eng
                    ? "bg-cyan-500 text-slate-950 shadow-xs"
                    : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {eng === "ALL" ? "All Engines" : eng === "POSTGRES" ? "Postgres" : eng}
              </button>
            ))}
          </div>

          {/* Tier Selector */}
          <div className={cn("p-1 rounded-xl border flex items-center gap-1", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
            {["ALL", "DEDICATED", "SHARED"].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectedTier === tier
                    ? "bg-cyan-500 text-slate-950 shadow-xs"
                    : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tier === "ALL" ? "All Tiers" : tier === "DEDICATED" ? "Dedicated" : "Shared"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instances Table / Card List */}
      <div className={cn("rounded-2xl border overflow-hidden transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={cn("border-b text-[11px] font-bold uppercase tracking-wider", isDark ? "border-white/[0.08] bg-[#0a0a0c] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500")}>
                <th className="py-3 px-4">INSTANCE & ENGINE</th>
                <th className="py-3 px-4">CUSTOMER</th>
                <th className="py-3 px-4">HOST & NODEPORT</th>
                <th className="py-3 px-4">TIER & SPEC</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/[0.04]" : "divide-slate-100")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                    <span className="text-xs text-zinc-400">Loading cluster databases...</span>
                  </td>
                </tr>
              ) : filteredDatabases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Database className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No database instances match your filter</p>
                  </td>
                </tr>
              ) : (
                filteredDatabases.map((db) => {
                  const engine = getEngineMeta(db.type);
                  const EngineIcon = engine.icon;
                  const endpoint = `${db.host}:${db.port}`;

                  return (
                    <tr
                      key={db.id}
                      className={cn("transition-colors", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/70")}
                    >
                      {/* Instance & Engine */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                            <EngineIcon className={cn("w-4 h-4", engine.color)} />
                          </div>
                          <div>
                            <span className={cn("font-bold text-sm block", isDark ? "text-white" : "text-slate-900")}>
                              {db.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border", engine.badgeBg)}>
                                {engine.name} {db.version}
                              </span>
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border", db.isDedicated ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20")}>
                                {db.isDedicated ? "Dedicated" : "Shared"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className={cn("font-semibold block", isDark ? "text-zinc-200" : "text-slate-800")}>
                          {db.customerName}
                        </span>
                        <span className={cn("font-mono text-[11px] block", isDark ? "text-zinc-500" : "text-slate-500")}>
                          {db.customerEmail}
                        </span>
                      </td>

                      {/* Host & Port */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(endpoint, `ep-${db.id}`)}
                          className={cn("font-mono font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer", isDark ? "text-cyan-400" : "text-cyan-700")}
                        >
                          <span>{endpoint}</span>
                          {copiedId === `ep-${db.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                        </button>
                        <span className={cn("text-[10px] font-mono block mt-0.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                          DB: {db.dbName} • User: {db.username}
                        </span>
                      </td>

                      {/* Tier & Spec */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("px-2 py-0.5 rounded font-mono text-[11px]", isDark ? "bg-white/5 text-zinc-300" : "bg-slate-100 text-slate-700")}>
                            {db.cpuShares} vCPU
                          </span>
                          <span className={cn("px-2 py-0.5 rounded font-mono text-[11px]", isDark ? "bg-white/5 text-zinc-300" : "bg-slate-100 text-slate-700")}>
                            {db.memoryMb >= 1024 ? `${db.memoryMb / 1024} GB` : `${db.memoryMb} MB`}
                          </span>
                          <span className={cn("px-2 py-0.5 rounded font-mono text-[11px]", isDark ? "bg-white/5 text-zinc-300" : "bg-slate-100 text-slate-700")}>
                            {db.storageGb} GB
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", db.status === "RUNNING" ? (isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200") : (isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200"))}>
                          {db.status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {db.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {db.connectionDetails?.pmaUrl && (
                            <a
                              href={db.connectionDetails.pmaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-cyan-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-cyan-700")}
                              title="Open phpMyAdmin"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {db.connectionDetails?.pgadminUrl && (
                            <a
                              href={db.connectionDetails.pgadminUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-[#336791]" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-[#336791]")}
                              title="Open pgAdmin 4"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {db.connectionDetails?.mongoUrl && (
                            <a
                              href={db.connectionDetails.mongoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-[#47A248]" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-[#47A248]")}
                              title="Open Mongo Express"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteModalItem(db)}
                            className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100")}
                            title="Terminate Database Instance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete / Terminate Confirmation Modal */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={cn("rounded-2xl border p-6 max-w-md w-full shadow-2xl space-y-4", isDark ? "bg-[#0c0c0e] border-white/10" : "bg-white border-slate-200")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Terminate Database Instance
                </h3>
                <p className="text-xs text-red-400 font-medium">Irreversible Administrative Action</p>
              </div>
            </div>

            <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              Are you sure you want to terminate <strong>{deleteModalItem.name}</strong> belonging to <strong>{deleteModalItem.customerEmail}</strong>? This will permanently delete the Kubernetes container pod and PV/PVC disk volume.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                className={cn("px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer", isDark ? "border-white/10 text-zinc-300 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-all shadow-md"
              >
                {deleting ? "Terminating..." : "Terminate Instance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
