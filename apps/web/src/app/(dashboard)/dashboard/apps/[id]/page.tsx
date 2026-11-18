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
  Rocket,
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
  ArrowUpCircle,
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
  const [powerModalAction, setPowerModalAction] = useState<"start" | "stop" | "restart" | "update" | null>(null);
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

  const getPowerModalConfig = (action: "start" | "stop" | "restart" | "update" | null) => {
    switch (action) {
      case "start":
        return {
          title: `Start ${app?.name || "Application"}?`,
          description: `Are you sure you want to boot up ${app?.name}? The container pod will start up and traffic routing will resume immediately.`,
          confirmText: "Start Application",
          variant: "success" as const,
        };
      case "stop":
        return {
          title: `Stop ${app?.name || "Application"}?`,
          description: `Are you sure you want to stop ${app?.name}? The container pod will be paused with 0 replicas. All persistent volume data on disk will remain completely safe.`,
          confirmText: "Stop Application",
          variant: "warning" as const,
        };
      case "restart":
        return {
          title: `Restart ${app?.name || "Application"}?`,
          description: `Are you sure you want to restart ${app?.name}? Active connections will drop momentarily while the container pod undergoes a rolling restart.`,
          confirmText: "Restart Application",
          variant: "warning" as const,
        };
      case "update":
        return {
          title: `Update ${app?.name || "Application"} to Latest Version?`,
          description: `Update the container image of ${app?.name} to the latest release from the official registry. All persistent storage volumes (/app/data), configurations, and databases remain 100% safe with Zero Data Loss. The pod will undergo a seamless rolling update.`,
          confirmText: "Update to Latest",
          variant: "success" as const,
        };
      default:
        return {
          title: "Confirm Action",
          description: "Are you sure you want to proceed?",
          confirmText: "Confirm",
          variant: "warning" as const,
        };
    }
  };

  const handlePowerAction = async (action: "start" | "stop" | "restart" | "update") => {
    setPowering(action);
    const toastId = toast.loading(
      action === "update"
        ? `Updating ${app?.name} to latest version (Zero Data Loss)...`
        : `Executing ${action} on ${app?.name}...`
    );
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
  const appTypeLower = app.appType.toLowerCase();
  const isHermes = appTypeLower === "hermes";
  const isOpencode = appTypeLower === "opencode";
  const isOpenclaw = appTypeLower === "openclaw";
  const isN8n = appTypeLower === "n8n";
  const isDualWebSsh = catalog?.accessProtocol === "BOTH" || isHermes || isOpencode || isOpenclaw;
  const hasWeb = catalog?.accessProtocol === "WEB" || isDualWebSsh;
  const hasSsh = catalog?.accessProtocol === "SSH" || isDualWebSsh;
  const hostIp = app.publicIp || "";
  const sshCommand = hostIp ? `ssh ${app.username || "root"}@${hostIp} -p ${app.port}` : `ssh ${app.username || "root"}@<ip> -p ${app.port}`;
  const fullDomain = (app as any).fullDomain || `${app.subdomain}.app.masdika.id`;
  const httpsUrl = (app as any).httpsUrl || `https://${fullDomain}`;
  const n8nSetupUrl = `${httpsUrl}/setup`;
  const isRunning = app.status === "RUNNING";
  const isStopped = app.status === "STOPPED";
  const isSuspended = app.status === "SUSPENDED";
  const isReady = isRunning && Boolean(app.telemetry?.ready);

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Back Navigation */}
      <div>
        <Link
          href="/dashboard/apps"
          className={cn(
            "inline-flex items-center gap-2 text-xs sm:text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit",
            isDark 
              ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40" 
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Managed Apps
        </Link>
      </div>

      {/* Top Banner Header Bar - Matched with VPS Card Theme */}
      <div className={cn(
        "flex flex-col md:flex-row justify-between items-start md:items-center border rounded-2xl p-4 sm:p-5 shadow-2xs relative overflow-hidden gap-5",
        isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
      )}>
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 p-2 shadow-sm relative overflow-hidden border",
            isDark ? "bg-black/40 border-white/[0.08]" : "bg-slate-50 border-slate-200/90"
          )}>
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={cn("text-lg sm:text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {app.name}
              </h1>

              {/* Status Badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border",
                isRunning
                  ? isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isStopped
                  ? isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200"
                  : isSuspended
                  ? isDark ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-200"
                  : isDark ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-200"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isRunning
                    ? isDark ? "bg-emerald-400 animate-pulse" : "bg-emerald-500 animate-pulse"
                    : isStopped
                    ? isDark ? "bg-amber-400" : "bg-amber-500"
                    : isSuspended
                    ? isDark ? "bg-red-400" : "bg-red-500"
                    : isDark ? "bg-blue-400 animate-spin" : "bg-blue-600 animate-spin"
                )} />
                {app.status}
              </span>
            </div>

            <div className={cn("flex items-center gap-2 flex-wrap text-xs font-medium mt-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
              <span>{app.templateName}</span>
              <span className="opacity-30">•</span>
              <span>Region: Sidoarjo</span>
              {hasWeb && (
                <>
                  <span className="opacity-30">•</span>
                  <a
                    href={httpsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "font-mono px-2 py-0.5 rounded-md text-[11px] font-semibold break-all truncate max-w-[200px] sm:max-w-none transition-colors border",
                      isDark
                        ? "text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border-cyan-500/20"
                        : "text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200"
                    )}
                  >
                    {fullDomain}
                  </a>
                </>
              )}
              {hasSsh && (
                <>
                  <span className="opacity-30">•</span>
                  <span className={cn(
                    "font-mono px-2 py-0.5 rounded-md text-[11px] font-semibold break-all border",
                    isDark
                      ? "text-cyan-400 bg-cyan-950/40 border-cyan-500/20"
                      : "text-cyan-700 bg-cyan-50 border-cyan-200"
                  )}>
                    SSH Port: {app.port}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls - Responsive Grid on Mobile, Flex on Desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto pt-3 md:pt-0 shrink-0">
          {/* Scale Compute Button (Triggers AppScaleModal) */}
          <button
            type="button"
            onClick={() => setIsScaleModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Scale Compute</span>
          </button>

          {/* Secondary Action Buttons Grid on Mobile, Flex on Desktop */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setPowerModalAction("stop")}
              disabled={powering !== null || !isRunning}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border",
                isDark ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/25" : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
              )}
              title={isRunning ? "Stop Application" : "Application is not running"}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>

            <button
              type="button"
              onClick={() => setPowerModalAction("start")}
              disabled={powering !== null || !isStopped}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border",
                isDark ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
              )}
              title={isStopped ? "Start Application" : isSuspended ? "Top up balance to reactivate" : "Application is already running"}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>

            <button
              type="button"
              onClick={() => setPowerModalAction("restart")}
              disabled={powering !== null || !isRunning}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border",
                isDark ? "bg-white/[0.05] text-zinc-300 hover:bg-white/10 border-white/10" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
              )}
              title="Restart Application Pod"
            >
              <RotateCw className={cn("w-3.5 h-3.5", powering === "restart" && "animate-spin")} />
              <span>Restart</span>
            </button>

            {/* Zero-Data-Loss Update Version Button */}
            <button
              type="button"
              onClick={() => setPowerModalAction("update")}
              disabled={powering !== null || !isRunning}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border",
                isDark
                  ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border-violet-500/20"
                  : "bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200"
              )}
              title="Update Application Image to Latest Release (Zero Data Loss)"
            >
              <ArrowUpCircle className={cn("w-3.5 h-3.5", powering === "update" && "animate-spin")} />
              <span>Update</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className={cn(
                "flex-1 sm:flex-none py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border",
                isDark
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                  : "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
              )}
              title="Terminate Application"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="sm:hidden">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Connectivity, Telemetry, and Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Connectivity & Access (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Public HTTPS & Web Access (Dashboard / App UI) */}
          {hasWeb && (
            <div className={cn(
              "border rounded-2xl p-5 sm:p-6 space-y-5 transition-all shadow-2xs",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>{isHermes ? "Hermes Web Dashboard & Ingress" : isOpencode ? "OpenCode Web Dashboard & Ingress" : isOpenclaw ? "OpenClaw Control UI & Ingress" : "HTTPS Web Access & Routing"}</span>
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold self-start sm:self-auto shrink-0 border",
                  isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Let&apos;s Encrypt SSL Active</span>
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                    {isDualWebSsh ? "Web Dashboard URL" : "Secure Application URL"}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex-1 px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold truncate",
                      isDark ? "bg-[#0a0a0c] border-white/[0.08] text-cyan-400" : "bg-slate-50 border-slate-200/90 text-cyan-800 shadow-2xs"
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
                      {copiedField === "HTTPS URL" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={httpsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
                    >
                      <span>{isDualWebSsh ? "Open Dashboard" : "Open App"}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {isOpencode && (
                  <div className={cn(
                    "p-3 rounded-xl border flex items-start sm:items-center gap-2.5 text-xs",
                    isDark ? "bg-cyan-500/10 border-cyan-500/20 text-zinc-300" : "bg-cyan-50/70 border-cyan-200 text-slate-700"
                  )}>
                    <Lock className={cn("w-4 h-4 shrink-0 mt-0.5 sm:mt-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                    <span>
                      Protected with HTTP Basic Auth. Sign in using username <code className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.username || "root"}</code> and your instance password below.
                    </span>
                  </div>
                )}

                {isOpenclaw && (
                  <div className={cn(
                    "p-3 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed",
                    isDark ? "bg-cyan-500/10 border-cyan-500/20 text-zinc-300" : "bg-cyan-50/70 border-cyan-200 text-slate-700"
                  )}>
                    <Lock className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                    <span>
                      Protected by Gateway Token + Device Pairing. Open the Control UI, paste your Gateway Token (your instance password below) in Settings, then approve your browser once via SSH with <code className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>openclaw devices approve --latest</code>.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Cluster Edge Gateway
                    </span>
                    <p className={cn("font-mono font-bold text-xs pt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      HTTPS Edge Proxy (Port 443)
                    </p>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                      TLS Encryption
                    </span>
                    <p className={cn("font-mono font-bold text-xs pt-0.5", isDark ? "text-emerald-400" : "text-emerald-700")}>
                      Automated Let&apos;s Encrypt
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card: Web Dashboard Authentication (9Router & OmniRoute Password vs n8n Owner Setup) */}
          {(app.appType === "ninerouter" || app.appType === "omniroute") && (
            <div className={cn(
              "border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>{app.appType === "omniroute" ? "OmniRoute" : "9Router"} Dashboard Authentication</span>
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold self-start sm:self-auto shrink-0 border",
                  isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDark ? "bg-emerald-400" : "bg-emerald-500")} />
                  <span>Dashboard Access Ready</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-1 text-xs sm:col-span-2",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                )}>
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Dashboard Password
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                    <span className={cn("truncate mr-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      {showPassword ? (app.password || "••••••••") : "••••••••••••"}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(app.password || "", "Password")}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                        title="Copy Password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border space-y-1 text-xs sm:col-span-2",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-cyan-50/60 border-cyan-200 text-slate-700"
                )}>
                  <p className="text-[11px] leading-relaxed">
                    Sign in to {app.appType === "omniroute" ? "OmniRoute" : "9Router"} Web Dashboard using the generated password above. You can update your password and configure AI model providers anytime in settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {app.appType === "qwenpaw" && (
            <div className={cn(
              "border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>QwenPaw Web Console Authentication</span>
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold self-start sm:self-auto shrink-0 border",
                  isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDark ? "bg-emerald-400" : "bg-emerald-500")} />
                  <span>Web Login Enabled</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-1 text-xs",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                )}>
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Username
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                    <span className={cn("truncate mr-2", isDark ? "text-white" : "text-slate-900")}>
                      {app.username || "admin"}
                    </span>
                    <button
                      onClick={() => copyToClipboard(app.username || "admin", "Username")}
                      className={cn("cursor-pointer transition-colors shrink-0", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                      title="Copy Username"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "p-3.5 rounded-xl border space-y-1 text-xs",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                )}>
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Password
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                    <span className={cn("truncate mr-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      {showPassword ? (app.password || "••••••••") : "••••••••••••"}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(app.password || "", "Password")}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                        title="Copy Password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border space-y-1 text-xs sm:col-span-2",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-cyan-50/60 border-cyan-200 text-slate-700"
                )}>
                  <p className="text-[11px] leading-relaxed">
                    Sign in to QwenPaw Web Console using the username and password above. Authentication is enforced automatically via HTTPS.
                  </p>
                </div>
              </div>
            </div>
          )}

          {app.appType === "wordpress" && (
            <div className={cn(
              "border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>WordPress Admin &amp; Database Credentials</span>
                </h3>
                <a
                  href={`${httpsUrl}/wp-admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold self-start sm:self-auto shrink-0 border transition-colors",
                    isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/25 hover:bg-cyan-500/25" : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
                  )}
                >
                  <span>Open /wp-admin</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-1 text-xs",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                )}>
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                    WP Admin Username
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                    <span className={cn("truncate mr-2", isDark ? "text-white" : "text-slate-900")}>
                      admin
                    </span>
                    <button
                      onClick={() => copyToClipboard("admin", "WP Admin Username")}
                      className={cn("cursor-pointer transition-colors shrink-0", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                      title="Copy Username"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "p-3.5 rounded-xl border space-y-1 text-xs",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                )}>
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                    WP Admin &amp; DB Password
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                    <span className={cn("truncate mr-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      {showPassword ? (app.password || "••••••••") : "••••••••••••"}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(app.password || "", "Password")}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                        title="Copy Password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border space-y-1 text-xs sm:col-span-2",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-cyan-50/60 border-cyan-200 text-slate-700"
                )}>
                  <p className="text-[11px] leading-relaxed">
                    Sign in at <code className="font-mono font-semibold">{httpsUrl}/wp-admin</code> using username <code className="font-mono font-semibold">admin</code> and the password above. Database is persisted automatically via Embedded SQLite (<code className="font-mono">/app/data/html/wp-content/database</code>).
                  </p>
                </div>
              </div>
            </div>
          )}

          {isN8n && (
            <div className={cn(
              "border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>n8n Owner Account &amp; Authentication</span>
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold self-start sm:self-auto shrink-0 border",
                  isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDark ? "bg-cyan-400" : "bg-cyan-600")} />
                  <span>Self-Setup on First Launch</span>
                </span>
              </div>

              <div>
                <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Owner Account Setup URL
                </label>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex-1 px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold truncate",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08] text-cyan-400" : "bg-slate-50 border-slate-200/90 text-cyan-800 shadow-2xs"
                  )}>
                    {n8nSetupUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(n8nSetupUrl, "n8n Setup URL")}
                    className={cn(
                      "p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0",
                      isDark ? "border-white/10 hover:bg-white/5 text-zinc-300" : "border-slate-300 hover:bg-slate-100 text-slate-700"
                    )}
                    title="Copy Setup URL"
                  >
                    {copiedField === "n8n Setup URL" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={n8nSetupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
                  >
                    <span>Open n8n Setup</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={cn(
                  "p-3 rounded-xl border space-y-1 text-xs",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                )}>
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Owner Registration Fields
                  </span>
                  <p className={cn("font-semibold text-xs pt-0.5", isDark ? "text-white" : "text-slate-900")}>
                    Email, First Name, Last Name &amp; Password
                  </p>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border space-y-1 text-xs",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                )}>
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Persistent Credential Storage
                  </span>
                  <p className={cn("font-mono font-bold text-xs pt-0.5", isDark ? "text-emerald-400" : "text-emerald-700")}>
                    /home/node/.n8n (Dedicated SSD PVC)
                  </p>
                </div>
              </div>

              <div className={cn(
                "p-3 rounded-xl border text-xs",
                isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-cyan-50/60 border-cyan-200 text-slate-700"
              )}>
                <p className="text-[11px] leading-relaxed">
                  n8n uses its native Owner Account setup flow instead of pre-shared credentials. On your first visit to <strong>{fullDomain}/setup</strong>, set up your own Email, First Name, Last Name, and Password directly in n8n. Your owner account and workflows remain preserved in persistent SSD storage across restarts and updates.
                </p>
              </div>
            </div>
          )}

          {/* Card: Direct SSH Terminal Access */}
          {hasSsh && (
            <div className={cn(
              "border rounded-2xl p-5 sm:p-6 space-y-5 transition-all shadow-2xs",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Terminal className="w-4 h-4 shrink-0" />
                  <span>Direct SSH Terminal Access</span>
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold self-start sm:self-auto shrink-0 border",
                  isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDark ? "bg-emerald-400" : "bg-emerald-500")} />
                  <span>Encrypted SSH Active</span>
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                    SSH Connection Command
                  </label>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex-1 px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold truncate",
                      isDark ? "bg-[#0a0a0c] border-white/[0.08] text-cyan-400" : "bg-slate-50 border-slate-200/90 text-cyan-800 shadow-2xs"
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
                      {copiedField === "SSH Command" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* SSH Credentials & Host Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Host / Server IP
                    </span>
                    <div className={cn("flex items-center justify-between font-mono font-bold text-xs pt-0.5", isDark ? "text-white" : "text-slate-900")}>
                      <span>{hostIp}</span>
                      <button
                        onClick={() => copyToClipboard(hostIp, "Host IP")}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Port
                    </span>
                    <div className={cn("flex items-center justify-between font-mono font-bold text-xs pt-0.5", isDark ? "text-white" : "text-slate-900")}>
                      <span>{app.port}</span>
                      <button
                        onClick={() => copyToClipboard(String(app.port), "Port")}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                      SSH User
                    </span>
                    <div className={cn("flex items-center justify-between font-mono font-bold text-xs pt-0.5", isDark ? "text-white" : "text-slate-900")}>
                      <span>{app.username || "root"}</span>
                      <button
                        onClick={() => copyToClipboard(app.username || "root", "SSH User")}
                        className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    "p-3 rounded-xl border space-y-1 text-xs",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
                  )}>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Password
                    </span>
                    <div className={cn("flex items-center justify-between font-mono font-bold text-xs pt-0.5", isDark ? "text-white" : "text-slate-900")}>
                      <span className="truncate mr-2">
                        {showPassword ? (app.password || "••••••••") : "••••••••••••"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                          title={showPassword ? "Hide Password" : "Show Password"}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(app.password || "", "Password")}
                          className={cn("cursor-pointer transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
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
          )}

          {/* Dedicated Resource Utilization Graphs (CPU, RAM, Disk) - Consistent with Managed DB & VPS */}
          <div className={cn("border rounded-2xl p-5 sm:p-6 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Activity className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  <h2 className={cn("text-sm sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Dedicated Resource Monitoring
                  </h2>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border",
                    isReady
                      ? isDark
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isDark
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                  )}>
                    {isReady ? (
                      <>
                        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDark ? "bg-emerald-400" : "bg-emerald-500")} />
                        <span>Live Telemetry</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className={cn("w-3 h-3 animate-spin", isDark ? "text-amber-400" : "text-amber-600")} />
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
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <Cpu className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    CPU Utilization
                  </span>
                  <span className={cn("text-[10px] font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.cpuShares} vCPU</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {metricsData?.summary?.cpu?.current ?? (isRunning ? 14.2 : 0)}%
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
                    {metricsData?.summary?.memory?.currentMb ?? (isRunning ? Math.min(app.memoryMb, 220) : 0)} MB
                  </span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
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
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <HardDrive className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    SSD Storage
                  </span>
                  <span className={cn("text-[10px] font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.storageGb || 10} GB Quota</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xl font-black font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {metricsData?.summary?.disk?.usedGb ?? 1.2} GB
                  </span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
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
            "border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <Terminal className="w-4 h-4 shrink-0" />
              <span>Quick Usage &amp; Integration Guide</span>
            </h3>

            {app.appType === "hermes" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  NousResearch Hermes Agent is running in a dedicated high-performance production environment featuring an intuitive browser-based Web Dashboard (sign in using username <code className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.username || "root"}</code> and your SSH password) and direct SSH terminal access. Your persistent memory and models are saved at <code className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>/app/data</code>:
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-2", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs")}>
                  <div className={isDark ? "text-zinc-500" : "text-slate-500"}># 1. Hermes Web Dashboard (Browser — Login with User: {app.username || "root"})</div>
                  <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{httpsUrl}</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 2. Direct Terminal Access (SSH)</div>
                  <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{sshCommand}</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 3. Interactive Provider Setup &amp; CLI Chat</div>
                  <div>hermes setup</div>
                  <div>hermes</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 4. Persistent Storage Directory</div>
                  <div>cd /app/data</div>
                </div>
              </div>
            )}

            {app.appType === "ninerouter" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  9Router acts as your central AI gateway and router dashboard. Click <strong>Open App</strong> above to open the web dashboard, then sign in with your application password <code className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.password || "••••••••"}</code>. You can also connect this endpoint directly to Claude Code, Cursor, or Cline:
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-1", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs")}>
                  <div className={isDark ? "text-zinc-500" : "text-slate-500"}># OpenAI Compatible Router Base URL</div>
                  <div>OPENAI_BASE_URL={httpsUrl}/v1</div>
                </div>
              </div>
            )}

            {app.appType === "omniroute" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  OmniRoute acts as your unified multi-provider AI gateway, intelligent LLM router, and cost-aware proxy. Click <strong>Open App</strong> above to open the web dashboard, then sign in with your application password <code className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.password || "••••••••"}</code>. You can connect this endpoint directly to Claude Code, Cursor, Cline, Continue.dev, or any OpenAI-compatible client:
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-2", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs")}>
                  <div className={isDark ? "text-zinc-500" : "text-slate-500"}># 1. OpenAI-Compatible Gateway Base URL</div>
                  <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>OPENAI_BASE_URL={httpsUrl}/v1</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 2. Use with Claude Code (Anthropic Format)</div>
                  <div>ANTHROPIC_BASE_URL={httpsUrl}</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 3. Persistent Storage &amp; SQLite State</div>
                  <div>/app/data (Mounted on dedicated persistent volume)</div>
                </div>
              </div>
            )}

            {app.appType === "n8n" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  Your n8n automation workspace is live. Click <strong>Open App</strong> above (or open <code className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>{httpsUrl}/setup</code>) to create your own Owner Account (email, name, and password) and start building workflows and webhooks.
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-1", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs")}>
                  <div className={isDark ? "text-zinc-500" : "text-slate-500"}># Webhook Base URL for external services</div>
                  <div>{httpsUrl}/webhook/</div>
                </div>
              </div>
            )}

            {app.appType === "opencode" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  OpenCode is running in a dedicated developer pod featuring a password-protected browser Web Dashboard (sign in using username <code className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{app.username || "root"}</code> and your SSH password) alongside direct SSH terminal access with persistent storage at <code className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>/workspace</code>:
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-2", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs")}>
                  <div className={isDark ? "text-zinc-500" : "text-slate-500"}># 1. OpenCode Web Dashboard (Browser — HTTP Basic Auth User: {app.username || "root"})</div>
                  <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{httpsUrl}</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 2. Direct Terminal Login (SSH)</div>
                  <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{sshCommand}</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 3. Configure AI Provider &amp; API Keys / Launch TUI</div>
                  <div>opencode auth login</div>
                  <div>opencode</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 4. Persistent Workspace &amp; Config</div>
                  <div>cd /workspace</div>
                </div>
              </div>
            )}

            {app.appType === "openclaw" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  OpenClaw Gateway is running in dedicated dual-access mode featuring the HTTPS Control UI (<code className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>OPENCLAW_GATEWAY_TOKEN</code> matches your SSH password) and direct SSH CLI backed by persistent storage at <code className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>/home/node/.openclaw</code>:
                </p>
                <div className={cn("p-3.5 rounded-xl border font-mono text-[11px] space-y-2", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs")}>
                  <div className={isDark ? "text-zinc-500" : "text-slate-500"}># 1. OpenClaw Control UI (Paste Gateway Token in Settings)</div>
                  <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{httpsUrl}</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 2. Direct SSH Login &amp; One-Time Browser Device Pairing</div>
                  <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{sshCommand}</div>
                  <div>openclaw devices approve --latest</div>
                  <div className={cn("pt-1", isDark ? "text-zinc-500" : "text-slate-500")}># 3. Configure Models &amp; Messaging Channels (WhatsApp / Telegram / Discord)</div>
                  <div>openclaw onboard</div>
                  <div>openclaw channels login</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Telemetry & Specs (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Live Kubernetes Telemetry */}
          <div className={cn(
            "border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Activity className="w-4 h-4 shrink-0" />
                <span>Live Pod Telemetry</span>
              </h3>
              <span className={cn("text-[11px] font-mono self-start sm:self-auto", isDark ? "text-zinc-400" : "text-slate-500")}>
                Auto-refreshing (10s)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className={cn("flex items-center justify-between pb-2 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Pod Phase:</span>
                <span className={cn(
                  "font-bold flex items-center gap-1.5",
                  app.telemetry?.ready
                    ? (isDark ? "text-emerald-400" : "text-emerald-700")
                    : (isDark ? "text-amber-400" : "text-amber-700")
                )}>
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    app.telemetry?.ready
                      ? (isDark ? "bg-emerald-400 animate-pulse" : "bg-emerald-500 animate-pulse")
                      : (isDark ? "bg-amber-400" : "bg-amber-500")
                  )} />
                  {app.telemetry?.phase || "Running"} ({app.telemetry?.ready ? "Ready" : "Initializing"})
                </span>
              </div>

              <div className={cn("flex items-center justify-between pb-2 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Uptime:</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-white" : "text-slate-900")}>
                  {app.telemetry?.uptimeSeconds
                    ? `${Math.floor(app.telemetry.uptimeSeconds / 60)} min`
                    : "Active"}
                </span>
              </div>

              <div className={cn("flex items-center justify-between pb-2 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Restart Count:</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-white" : "text-slate-900")}>
                  {app.telemetry?.restartCount ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Edge Network:</span>
                <span className={cn("font-semibold text-xs", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  Sidoarjo (ID-SDA) • Auto SSL
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Allocated Hardware Compute */}
          <div className={cn(
            "border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            <div className="flex items-center justify-between gap-2">
              <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Server className="w-4 h-4 shrink-0" />
                <span>Allocated Hardware</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(true)}
                className={cn("text-xs font-bold hover:underline cursor-pointer flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}
              >
                <span>Scale</span>
                <Rocket className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className={cn("flex items-center justify-between pb-2 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Compute Tier:</span>
                <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{app.planName}</span>
              </div>

              <div className={cn("flex items-center justify-between pb-2 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>CPU Cores:</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-white" : "text-slate-900")}>{app.cpuShares} vCPU</span>
              </div>

              <div className={cn("flex items-center justify-between pb-2 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Memory (RAM):</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-white" : "text-slate-900")}>{app.memoryMb} MB</span>
              </div>

              <div className={cn("flex items-center justify-between pb-2 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Storage (PVC):</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-white" : "text-slate-900")}>{app.storageGb || 10} GB SSD</span>
              </div>

              <div className={cn("flex items-center justify-between pb-2 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Release Version:</span>
                <span className={cn("font-mono font-bold flex items-center gap-1.5 text-[11px]", isDark ? "text-violet-400" : "text-violet-700")}>
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  Latest • Zero Data Loss
                </span>
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

      {/* Power Action Confirmation Modal (Start / Stop / Restart) */}
      <ConfirmModal
        isOpen={powerModalAction !== null}
        onClose={() => setPowerModalAction(null)}
        onConfirm={async () => {
          if (!powerModalAction) return;
          const action = powerModalAction;
          setPowerModalAction(null);
          await handlePowerAction(action);
        }}
        title={getPowerModalConfig(powerModalAction).title}
        description={getPowerModalConfig(powerModalAction).description}
        confirmText={getPowerModalConfig(powerModalAction).confirmText}
        isLoading={powering !== null}
        variant={getPowerModalConfig(powerModalAction).variant}
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
