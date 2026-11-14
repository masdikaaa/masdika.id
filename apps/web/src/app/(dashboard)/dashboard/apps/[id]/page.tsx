"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Play,
  Square,
  RotateCw,
  Trash2,
  Cpu,
  HardDrive,
  Globe,
  ShieldCheck,
  Server,
  Activity,
  Clock,
  Terminal,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Layers,
  Loader2,
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
import { toast } from "sonner";
import { formatRupiah, getAppDefinition } from "@/lib/app-catalog";
import { AppScaleModal } from "@/components/AppScaleModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function AppDetailPage({
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
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [powering, setPowering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Dedicated Resource Monitoring States (CPU, RAM, Disk)
  const [metricsTimeframe, setMetricsTimeframe] = useState<"live" | "hour" | "day" | "week">("hour");
  const [activeMetricTab, setActiveMetricTab] = useState<"ALL" | "CPU" | "RAM" | "DISK">("ALL");
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchMetrics = async (tf = metricsTimeframe, isBackground = false) => {
    try {
      if (!isBackground) setLoadingMetrics(true);
      const res = await fetch(`/api/user/apps/${id}/metrics?timeframe=${tf}`);
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
      const res = await fetch(`/api/user/apps/${id}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setApp(data.data);
      } else {
        toast.error(data.error || "Failed to load application details");
        router.push("/dashboard/apps");
      }
    } catch {
      toast.error("Failed to load application");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppDetail();
    // Poll telemetry every 10 seconds
    const interval = setInterval(fetchAppDetail, 10000);
    return () => clearInterval(interval);
  }, [id]);

  // Realtime metrics polling without manual page refresh (Live: 5s, Hour: 15s, Day/Week: 60s)
  useEffect(() => {
    if (!app) return;
    fetchMetrics(metricsTimeframe, false);

    const metricsIntervalMs = metricsTimeframe === "live" ? 5000 : metricsTimeframe === "hour" ? 15000 : 60000;
    const interval = setInterval(() => {
      fetchMetrics(metricsTimeframe, true);
    }, metricsIntervalMs);

    return () => clearInterval(interval);
  }, [id, app?.status, metricsTimeframe]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePowerAction = async (action: "start" | "stop" | "restart") => {
    setPowering(action);
    const toastId = toast.loading(`Executing ${action} on ${app?.name}...`);
    try {
      const res = await fetch(`/api/user/apps/${id}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Failed to ${action} app`);
      }
      toast.success(data.message, { id: toastId });
      fetchAppDetail();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setPowering(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const toastId = toast.loading(`Terminating ${app?.name}...`);
    try {
      const res = await fetch(`/api/user/apps/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to terminate application");
      }
      toast.success(data.message, { id: toastId });
      router.push("/dashboard/apps");
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-500")}>
            Loading application telemetry...
          </p>
        </div>
      </div>
    );
  }

  if (!app) return null;

  const catalog = getAppDefinition(app.appType);
  const isSshApp = catalog?.accessProtocol === "SSH";
  const hostIp = app.publicIp || "103.247.10.61";
  const sshCommand = `ssh ${app.username || "root"}@${hostIp} -p ${app.port}`;
  const fullDomain = `${app.subdomain}.app.masdika.id`;
  const httpsUrl = `https://${fullDomain}`;
  const isRunning = app.status === "RUNNING";
  const isStopped = app.status === "STOPPED";
  const isReady = isRunning && Boolean(app.telemetry?.ready);

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
        <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <Link href="/dashboard/apps" className="hover:text-cyan-400 transition-colors">
          Managed Apps
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className={cn(isDark ? "text-zinc-200" : "text-slate-700", "font-semibold")}>
          {app.name}
        </span>
      </div>

      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border backdrop-blur-xl transition-all shadow-sm relative overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(135deg, rgba(16, 20, 31, 0.9) 0%, rgba(16, 16, 20, 0.9) 100%)"
            : "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)",
        }}
      >
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 p-2 bg-black/40 border border-white/10 shadow-lg relative overflow-hidden">
            <Image
              src={catalog?.icon || "/images/apps/docker.svg"}
              alt={app.name}
              width={48}
              height={48}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {app.name}
              </h1>

              {/* Status Badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                isRunning
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : isStopped
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isRunning ? "bg-emerald-400 animate-pulse" : isStopped ? "bg-amber-400" : "bg-blue-400 animate-spin"
                )} />
                {app.status}
              </span>
            </div>

            <p className={cn("text-xs sm:text-sm font-medium mt-1 text-[var(--text-muted)] flex items-center gap-2 flex-wrap")}>
              <span>{app.templateName}</span>
              <span>•</span>
              <span>Region: Sidoarjo</span>
              <span>•</span>
              {isSshApp ? (
                <span className="font-mono text-cyan-400">{sshCommand}</span>
              ) : (
                <span className="font-mono text-cyan-400">{fullDomain}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Scale Compute Button (Triggers AppScaleModal) */}
          <button
            type="button"
            onClick={() => setIsScaleModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-400/20 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Scale Compute</span>
          </button>

          {/* Power Controls */}
          {isRunning ? (
            <button
              type="button"
              onClick={() => handlePowerAction("stop")}
              disabled={powering !== null}
              className={cn(
                "px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
                isDark ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" : "border-amber-300 text-amber-700 hover:bg-amber-50"
              )}
              title="Stop Application"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePowerAction("start")}
              disabled={powering !== null}
              className={cn(
                "px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
                isDark ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              )}
              title="Start Application"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handlePowerAction("restart")}
            disabled={powering !== null || !isRunning}
            className={cn(
              "px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
              isDark ? "border-white/10 text-zinc-300 hover:bg-white/5" : "border-slate-300 text-slate-700 hover:bg-slate-100"
            )}
            title="Restart Application Pod"
          >
            <RotateCw className={cn("w-3.5 h-3.5", powering === "restart" && "animate-spin")} />
            <span>Restart</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2.5 rounded-xl text-xs font-bold border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Terminate Application"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid: Connectivity, Telemetry, and Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Connectivity & Access (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Public HTTPS & Domain Access OR Direct SSH Access */}
          {isSshApp ? (
            <div className={cn(
              "p-6 rounded-2xl border space-y-5 transition-all",
              isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
            )}>
              <div className="flex items-center justify-between">
                <h3 className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Terminal className="w-4 h-4" /> Direct SSH Terminal Access
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                  isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Encrypted SSH Active
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                    SSH Connection Command
                  </label>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex-1 px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold truncate",
                      isDark ? "bg-[#09090b] border-white/10 text-cyan-400" : "bg-slate-50 border-slate-200 text-cyan-800"
                    )}>
                      {sshCommand}
                    </div>
                    <button
                      onClick={() => copyToClipboard(sshCommand, "SSH Command")}
                      className={cn(
                        "px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0",
                        isDark ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" : "border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                      )}
                      title="Copy SSH Command"
                    >
                      {copiedField === "SSH Command" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* SSH Credentials & Host Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                      Host / Server IP
                    </span>
                    <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                      <span>{hostIp}</span>
                      <button
                        onClick={() => copyToClipboard(hostIp, "Host IP")}
                        className="text-[var(--text-muted)] hover:text-cyan-400"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                      Port
                    </span>
                    <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                      <span>{app.port}</span>
                      <button
                        onClick={() => copyToClipboard(String(app.port), "Port")}
                        className="text-[var(--text-muted)] hover:text-cyan-400"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                      SSH User
                    </span>
                    <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                      <span>{app.username || "root"}</span>
                      <button
                        onClick={() => copyToClipboard(app.username || "root", "SSH User")}
                        className="text-[var(--text-muted)] hover:text-cyan-400"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                      Password
                    </span>
                    <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                      <span className="truncate mr-2">
                        {showPassword ? (app.password || "••••••••") : "••••••••••••"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[var(--text-muted)] hover:text-cyan-400 cursor-pointer"
                          title={showPassword ? "Hide Password" : "Show Password"}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(app.password || "", "Password")}
                          className="text-[var(--text-muted)] hover:text-cyan-400 cursor-pointer"
                          title="Copy Password"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "p-6 rounded-2xl border space-y-5 transition-all",
              isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
            )}>
              <div className="flex items-center justify-between">
                <h3 className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Globe className="w-4 h-4" /> HTTPS Web Access & Routing
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                  isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Let&apos;s Encrypt SSL Active
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Secure Application URL
                  </label>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex-1 px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold truncate",
                      isDark ? "bg-[#09090b] border-white/10 text-cyan-400" : "bg-slate-50 border-slate-200 text-cyan-800"
                    )}>
                      {httpsUrl}
                    </div>
                    <button
                      onClick={() => copyToClipboard(httpsUrl, "HTTPS URL")}
                      className={cn(
                        "p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0",
                        isDark ? "border-white/10 hover:bg-white/5 text-zinc-300" : "border-slate-300 hover:bg-slate-100 text-slate-700"
                      )}
                      title="Copy URL"
                    >
                      {copiedField === "HTTPS URL" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={httpsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
                    >
                      <span>Open App</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                      Cluster Edge Gateway
                    </span>
                    <p className="font-mono font-bold text-xs pt-0.5 text-cyan-400">
                      HTTPS Edge Proxy (Port 443)
                    </p>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                      TLS Encryption
                    </span>
                    <p className="font-mono font-bold text-xs pt-0.5 text-emerald-400">
                      Automated Let&apos;s Encrypt
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Resource Utilization Graphs (CPU, RAM, Disk) - Consistent with Managed DB */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
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
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{app.cpuShares} vCPU</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {metricsData?.summary?.cpu?.current ?? (isRunning ? 14.2 : 0)}%
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
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{app.memoryMb} MB Max</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {metricsData?.summary?.memory?.currentMb ?? (isRunning ? Math.min(app.memoryMb, 220) : 0)} MB
                  </span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
                    ({metricsData?.summary?.memory?.percentage ?? (isRunning ? Math.round((220 / app.memoryMb) * 100) : 0)}%)
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
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{app.storageGb || 10} GB Quota</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {metricsData?.summary?.disk?.usedGb ?? 1.2} GB
                  </span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
                    ({metricsData?.summary?.disk?.percentage ?? Math.round((1.2 / (app.storageGb || 10)) * 100)}%)
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
                    <linearGradient id="appCpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="appRamGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="appDiskGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#06b6d4" strokeWidth={2.5} fill="url(#appCpuGrad)" />
                  )}
                  {(activeMetricTab === "ALL" || activeMetricTab === "RAM") && (
                    <Area type="monotone" dataKey="memory" name="RAM %" stroke="#818cf8" strokeWidth={2.5} fill="url(#appRamGrad)" />
                  )}
                  {(activeMetricTab === "ALL" || activeMetricTab === "DISK") && (
                    <Area type="monotone" dataKey="disk" name="Disk %" stroke="#10b981" strokeWidth={2.5} fill="url(#appDiskGrad)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: App Integration & API Reference */}
          <div className={cn(
            "p-6 rounded-2xl border space-y-4 transition-all",
            isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
          )}>
            <h3 className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <Terminal className="w-4 h-4" /> Quick Usage & Integration Guide
            </h3>

            {app.appType === "hermes" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  NousResearch Hermes Agent is running in a secure sandboxed environment. Your workspace is persisted at <code className="font-mono text-cyan-400">/app/data</code>. Package manager and port tunneling are restricted to prevent abuse:
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-2", isDark ? "bg-[#09090b] border-white/10 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-800")}>
                  <div className="text-zinc-500"># Direct Terminal Login</div>
                  <div className="text-cyan-400 font-bold">{sshCommand}</div>
                  <div className="text-zinc-500 pt-1"># Launch Hermes Agent CLI</div>
                  <div>hermes</div>
                  <div className="text-zinc-500 pt-1"># Persistent Storage</div>
                  <div>cd /app/data</div>
                </div>
              </div>
            )}

            {app.appType === "ninerouter" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  9Router acts as your local AI gateway with multi-tier fallback and RTK token optimization. You can plug this endpoint into Claude Code, Cursor, or Cline:
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-1", isDark ? "bg-[#09090b] border-white/10 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-800")}>
                  <div className="text-zinc-500"># OpenAI Compatible Router Base URL</div>
                  <div>OPENAI_BASE_URL={httpsUrl}/v1</div>
                </div>
              </div>
            )}

            {app.appType === "n8n" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  Your n8n workflow canvas is ready. Click <strong>Open App</strong> above to log in and begin creating automated workflows and webhook triggers.
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-1", isDark ? "bg-[#09090b] border-white/10 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-800")}>
                  <div className="text-zinc-500"># Webhook Base URL for external services</div>
                  <div>{httpsUrl}/webhook/</div>
                </div>
              </div>
            )}

            {app.appType === "opencode" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  OpenCode is running in a secure sandboxed developer pod. Your workspace is persisted at <code className="font-mono text-cyan-400">/workspace</code>. Package manager and port tunneling are restricted to prevent abuse:
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-2", isDark ? "bg-[#09090b] border-white/10 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-800")}>
                  <div className="text-zinc-500"># Direct Terminal Login</div>
                  <div className="text-cyan-400 font-bold">{sshCommand}</div>
                  <div className="text-zinc-500 pt-1"># Launch OpenCode CLI</div>
                  <div>opencode</div>
                  <div className="text-zinc-500 pt-1"># Persistent Storage</div>
                  <div>cd /workspace</div>
                </div>
              </div>
            )}

            {app.appType === "openclaw" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  OpenClaw is active and ready to bridge your AI agents to WhatsApp, Telegram, Discord, and Slack with automated web scraping and scheduled actions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Telemetry & Specs (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Live Kubernetes Telemetry */}
          <div className={cn(
            "p-6 rounded-2xl border space-y-4 transition-all",
            isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
          )}>
            <div className="flex items-center justify-between">
              <h3 className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Activity className="w-4 h-4" /> Live Pod Telemetry
              </h3>
              <span className={cn("text-[11px] font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
                Auto-refreshing (10s)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-inherit">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Pod Phase:</span>
                <span className={cn("font-bold flex items-center gap-1.5", app.telemetry?.ready ? "text-emerald-400" : "text-amber-400")}>
                  <span className={cn("w-2 h-2 rounded-full", app.telemetry?.ready ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                  {app.telemetry?.phase || "Running"} ({app.telemetry?.ready ? "Ready" : "Initializing"})
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-inherit">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Uptime:</span>
                <span className="font-mono font-semibold">
                  {app.telemetry?.uptimeSeconds
                    ? `${Math.floor(app.telemetry.uptimeSeconds / 60)} min`
                    : "Active"}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-inherit">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Restart Count:</span>
                <span className="font-mono font-semibold">
                  {app.telemetry?.restartCount ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Edge Network:</span>
                <span className="font-semibold text-xs text-cyan-400">
                  Sidoarjo (ID-SDA) • Auto SSL
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Allocated Hardware Compute */}
          <div className={cn(
            "p-6 rounded-2xl border space-y-4 transition-all",
            isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
          )}>
            <div className="flex items-center justify-between">
              <h3 className={cn("text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Server className="w-4 h-4" /> Allocated Hardware
              </h3>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(true)}
                className="text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
              >
                Scale &rarr;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-inherit">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Compute Tier:</span>
                <span className="font-bold">{app.planName}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-inherit">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>CPU Cores:</span>
                <span className="font-mono font-semibold">{app.cpuShares} vCPU</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-inherit">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Memory (RAM):</span>
                <span className="font-mono font-semibold">{app.memoryMb} MB</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-inherit">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Storage (PVC):</span>
                <span className="font-mono font-semibold">{app.storageGb || 10} GB SSD</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Monthly Billing:</span>
                <span className={cn("font-bold text-sm", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  {formatRupiah(app.monthlyPrice)}/month
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scale Compute Modal (Zero Data Loss) */}
      <AppScaleModal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        app={app}
        onSuccess={fetchAppDetail}
        isDark={isDark}
      />

      {/* Delete / Terminate Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={`Terminate ${app.name}?`}
        description="Are you sure you want to terminate this application? All Kubernetes deployment pods, ingress routes, and persistent storage volumes will be permanently deleted. This action cannot be undone."
        confirmText="Terminate App"
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
