"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import {
  Database, ChevronLeft, Check, Copy, ExternalLink, RefreshCw,
  Power, Square, Play, RotateCw, Download, Upload, Trash2, Eye, EyeOff,
  Cpu, Layers, HardDrive, ShieldAlert, Activity, Server, FileText, Code2, AlertTriangle, UploadCloud
} from "lucide-react";
import { SiMysql, SiPostgresql, SiMariadb, SiMongodb } from "react-icons/si";

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDatabase = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/user/database/${dbId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setDb(json.data);
      } else {
        toast.error(json.error || "Failed to load database details");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchDatabase();
    const interval = setInterval(fetchDatabase, 15000); // 15s telemetry polling
    return () => clearInterval(interval);
  }, [dbId]);

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
    toast.info("Preparing SQL dump download from container...");
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
      toast.error("Please select a .sql or .json file to import");
      return;
    }
    setImporting(true);
    const toastId = toast.loading("Uploading and executing database import...");
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
      setDeleteModalOpen(false);
    }
  };

  const getEngineMeta = (type?: string) => {
    const t = (type || "").toUpperCase();
    switch (t) {
      case "MYSQL":
        return {
          name: "MySQL",
          icon: SiMysql,
          color: "text-[#00758F]",
          badgeBg: "bg-[#00758F]/15 border-[#00758F]/30 text-[#00758F]",
          webToolName: "phpMyAdmin",
          webToolUrl: db?.connectionDetails?.pmaUrl || ""
        };
      case "MARIADB":
        return {
          name: "MariaDB",
          icon: SiMariadb,
          color: "text-[#C0765A]",
          badgeBg: "bg-[#C0765A]/15 border-[#C0765A]/30 text-[#C0765A]",
          webToolName: "phpMyAdmin",
          webToolUrl: db?.connectionDetails?.pmaUrl || ""
        };
      case "POSTGRES":
      case "POSTGRESQL":
        return {
          name: "PostgreSQL",
          icon: SiPostgresql,
          color: "text-[#336791]",
          badgeBg: "bg-[#336791]/15 border-[#336791]/30 text-[#336791]",
          webToolName: "pgAdmin 4",
          webToolUrl: db?.connectionDetails?.pgadminUrl || ""
        };
      case "MONGODB":
      case "MONGO":
        return {
          name: "MongoDB",
          icon: SiMongodb,
          color: "text-[#47A248]",
          badgeBg: "bg-[#47A248]/15 border-[#47A248]/30 text-[#47A248]",
          webToolName: "Mongo Express",
          webToolUrl: db?.connectionDetails?.mongoUrl || db?.connectionDetails?.mongoExpressUrl || ""
        };
      default:
        return {
          name: type || "Database",
          icon: Database,
          color: "text-cyan-400",
          badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
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
      <div className={cn("rounded-2xl border p-10 text-center", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200")}>
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
  const EngineIcon = engine.icon;

  const nodejsSnippet = db.type.toUpperCase() === "MONGODB"
    ? `DATABASE_URL="${db.connectionDetails?.uri || `mongodb://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbName}?authSource=admin`}"`
    : `DATABASE_URL="${db.connectionDetails?.uri || `mysql://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbName}`}"`;

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard/database"
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0",
              isDark
                ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08]"
                : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
            )}
            title="Back to Databases"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center shrink-0", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                <EngineIcon className={cn("w-4 h-4", engine.color)} />
              </div>
              <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {db.name}
              </h1>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", engine.badgeBg)}>
                {engine.name} {db.version}
              </span>
              <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold border", db.status === "RUNNING" ? (isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200") : (isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200"))}>
                {db.status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block mr-1.5" />}
                {db.status}
              </span>
            </div>
            <p className={cn("text-xs sm:text-sm font-medium mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
              Endpoint: <span className="font-mono text-cyan-400">{db.host}:{db.port}</span> • Region: {db.region} • PAYG: {formatRupiah(db.hourlyRate || 28)}/jam
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchDatabase}
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
                onClick={() => handlePowerAction("restart")}
                disabled={actionLoading}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                  isDark ? "bg-white/5 border-white/10 text-zinc-300 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
                title="Restart container"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
              <button
                onClick={() => handlePowerAction("stop")}
                disabled={actionLoading}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                  isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                )}
                title="Stop container"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handlePowerAction("start")}
              disabled={actionLoading}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              )}
              title="Start container"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </button>
          )}

          {/* Import Dump Button */}
          <button
            onClick={() => setImportModalOpen(true)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs",
              isDark
                ? "bg-white/5 border-white/10 text-zinc-200 hover:text-white hover:bg-white/10"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            )}
            title="Import SQL / data dump file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Data</span>
          </button>

          {/* Export Dump Button */}
          <button
            onClick={handleDownloadDump}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Download SQL / data dump"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Dump</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column (Credentials & Snippets) + Right Column (Web GUI & Telemetry & Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Connection Credentials Card */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
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

          {/* Quick Connect Code Snippets (URI, Laravel, Node.js) */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
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
            <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Web GUI ({engine.webToolName})
                </h3>
              </div>

              <p className={cn("text-xs leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>
                Visual database management interface via browser. Log in using your instance host, port, username, and password.
              </p>

              <div className={cn("p-3 rounded-xl border text-xs font-mono mb-4 space-y-1", isDark ? "bg-[#0a0a0c] border-white/[0.06] text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                <div><strong>Server:</strong> {db.type?.toUpperCase().includes('MONGO') ? `db-${db.id}-mongo.db.masdika.id` : `${db.host}:${db.port}`}</div>
                <div><strong>User:</strong> {db.type?.toUpperCase().includes('POSTGRES') ? `${db.username}@db.masdika.id` : db.username}</div>
                <div><strong>Pass:</strong> ••••••••</div>
              </div>

              <a
                href={engine.webToolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>Launch {engine.webToolName}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Live Telemetry Card */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
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
                <span className={cn("font-bold", db.cpuShares >= 2.0 ? "text-purple-400" : "text-cyan-400")}>
                  {db.planName || (db.cpuShares >= 2.0 ? "Dedicated Database" : "Shared Database")}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Allocated Quota</span>
                <span className="font-semibold">{db.cpuShares} vCPU / {db.memoryMb >= 1024 ? `${db.memoryMb / 1024} GB` : `${db.memoryMb} MB`} RAM</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Storage Volume</span>
                <span className="font-semibold">{db.storageGb} GB NVMe</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Hourly Burn</span>
                <span className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  {formatRupiah(db.hourlyRate || 28)}/jam
                </span>
              </div>
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
              onClick={() => setDeleteModalOpen(true)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Terminate & Delete Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setDeleteModalOpen(false)} />
          <div className={cn("relative border rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl z-10", isDark ? "bg-[#0c0c0e] border-white/[0.1] text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className="flex flex-col items-center text-center">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border", isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600")}>
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold mb-2">Terminate {db.name}?</h3>
              <p className={cn("text-xs leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
                Are you sure you want to permanently delete this database? All stored tables, records, and configurations will be irreversibly erased from NVMe storage.
              </p>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                  className={cn("flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 border", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer shadow-md"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : "Terminate Instance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Database Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !importing && setImportModalOpen(false)} />
          <div className={cn("relative border rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl z-10", isDark ? "bg-[#0c0c0e] border-white/[0.1] text-white" : "bg-white border-slate-200 text-slate-900")}>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Import Database Dump</h3>
                  <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Execute SQL or JSON dump directly on {db.name}
                  </p>
                </div>
              </div>

              {/* Notice */}
              <div className={cn("p-3 rounded-xl border text-xs flex gap-2.5", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800")}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Executing an import will run all statements against the active database. Make sure you have exported a recent backup if needed.
                </p>
              </div>

              {/* File Input */}
              <div className={cn("p-4 rounded-xl border border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all", isDark ? "border-white/20 hover:border-cyan-400/50 bg-white/[0.02]" : "border-slate-300 hover:border-cyan-500 bg-slate-50/50")}>
                <input
                  type="file"
                  id="import-file-input"
                  accept=".sql,.dump,.json,.txt"
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
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to import`
                      : "Supports .sql, .dump, .json (Max 50MB)"}
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
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Start Import</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

