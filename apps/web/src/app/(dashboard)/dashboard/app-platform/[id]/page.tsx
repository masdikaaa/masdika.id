"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { MacCodeEditor } from "@/components/ui/MacCodeEditor";
import {
  Globe,
  ChevronLeft,
  ChevronRight,
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
  Rocket,
  History,
  Webhook,
  Undo2,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { AppScaleModal } from "@/components/AppScaleModal";
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
import { OFFICIAL_APP_PLATFORM_PLANS } from "@/lib/app-platform-plans";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdminCheckbox } from "@/components/ui/AdminCheckbox";
import { Select } from "@/components/ui/Select";

function cleanTerminalLogs(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\[\d{1,2}m/g, "")
    .replace(/\[\[[0-9;]*m/g, "")
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\[0m/g, "");
}

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
  const [activeTab, setActiveTab] = useState<"overview" | "deployments" | "build-logs" | "runtime-logs" | "terminal" | "settings">("overview");
  const [deployments, setDeployments] = useState<any[]>([]);
  const [deployingManual, setDeployingManual] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<number | null>(null);
  const [specificCommitHash, setSpecificCommitHash] = useState("");
  const [selectedDepLogs, setSelectedDepLogs] = useState<{ num: number; logs: string; status: string } | null>(null);

  // Web Terminal (Exec) State
  const [termCommand, setTermCommand] = useState("");
  const [termRunning, setTermRunning] = useState(false);
  const [termHistory, setTermHistory] = useState<{ cmd: string; stdout: string; stderr: string; exitCode: number }[]>([]);

  // Power actions & modal state
  const [actionLoading, setActionLoading] = useState(false);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    action: "start" | "stop" | "restart" | "rebuild" | "delete" | "delete-deployment" | "clear-old-deployments";
    deploymentId?: number;
    deploymentNumber?: number;
  } | null>(null);

  // Logs & pagination state
  const [deploymentsPage, setDeploymentsPage] = useState(1);
  const DEPLOYMENTS_PER_PAGE = 5;
  const [buildLogs, setBuildLogs] = useState("");
  const [runtimeLogs, setRuntimeLogs] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const buildLogsContainerRef = useRef<HTMLDivElement>(null);
  const runtimeLogsContainerRef = useRef<HTMLDivElement>(null);
  const depLogsPreRef = useRef<HTMLPreElement>(null);

  // Settings edit state
  const [settingsGitUrl, setSettingsGitUrl] = useState("");
  const [settingsBranch, setSettingsBranch] = useState("");
  const [settingsBuildType, setSettingsBuildType] = useState("DOCKERFILE");
  const [settingsDockerfilePath, setSettingsDockerfilePath] = useState("Dockerfile");
  const [settingsAppPort, setSettingsAppPort] = useState(3000);
  const [settingsBuildCmd, setSettingsBuildCmd] = useState("");
  const [settingsStartCmd, setSettingsStartCmd] = useState("");
  const [settingsEnvVars, setSettingsEnvVars] = useState("");
  const [settingsCustomDomain, setSettingsCustomDomain] = useState("");
  const [settingsAutoDeploy, setSettingsAutoDeploy] = useState(true);
  const [settingsDeployOnPush, setSettingsDeployOnPush] = useState(true);
  const [settingsBuildMode, setSettingsBuildMode] = useState("DOCKERFILE");
  const [settingsHealthCheckPath, setSettingsHealthCheckPath] = useState("");
  const [settingsPvPath, setSettingsPvPath] = useState("");
  const [settingsPvGb, setSettingsPvGb] = useState(0);
  const [settingsBuildCache, setSettingsBuildCache] = useState(true);
  const [settingsPrPreview, setSettingsPrPreview] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [upgradePlanCode, setUpgradePlanCode] = useState("1C1G");
  const [upgradingPlan, setUpgradingPlan] = useState(false);

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
        setDeployments(Array.isArray(json.data.deployments) ? json.data.deployments : []);
        setSettingsGitUrl(json.data.gitUrl || "");
        setSettingsBranch(json.data.branch || "main");
        setSettingsBuildType(json.data.buildType || "DOCKERFILE");
        setSettingsBuildMode("DOCKERFILE");
        setSettingsAutoDeploy(json.data.autoDeploy !== false);
        setSettingsDeployOnPush(json.data.deployOnPush !== false);
        setSettingsDockerfilePath(json.data.dockerfilePath || "Dockerfile");
        setSettingsAppPort(json.data.appPort || 3000);
        setSettingsBuildCmd(json.data.buildCommand || "");
        setSettingsStartCmd(json.data.startCommand || "");
        setSettingsEnvVars(json.data.envVars || "");
        setSettingsCustomDomain(json.data.customDomain || "");
        setSettingsHealthCheckPath(json.data.healthCheckPath || "");
        setSettingsPvPath(json.data.persistentVolumePath || "");
        setSettingsPvGb(json.data.persistentVolumeGb || 0);
        setSettingsBuildCache(json.data.enableBuildCache !== false);
        setSettingsPrPreview(Boolean(json.data.prPreviewEnabled));
        setUpgradePlanCode(json.data.planName || "1C1G");
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

  // Poll app status every 4 seconds if queued, building or provisioning
  useEffect(() => {
    const shouldPoll =
      app?.lastBuildStatus === "BUILDING" ||
      app?.lastBuildStatus === "QUEUED" ||
      app?.status === "BUILDING" ||
      app?.status === "PROVISIONING";
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      fetchAppDetail();
      if (activeTab === "build-logs") fetchLogs("build");
    }, 4000);
    return () => clearInterval(interval);
  }, [app?.lastBuildStatus, app?.status, activeTab]);

  // Fetch logs when user switches tabs
  useEffect(() => {
    if (activeTab === "build-logs") fetchLogs("build");
    if (activeTab === "runtime-logs") fetchLogs("runtime");
  }, [activeTab]);

  // Auto-scroll Build Logs, Runtime Logs, and Selected Deployment Logs to the latest lines (bottom)
  useEffect(() => {
    if (activeTab === "build-logs" && buildLogsContainerRef.current) {
      buildLogsContainerRef.current.scrollTop = buildLogsContainerRef.current.scrollHeight;
    }
  }, [activeTab, buildLogs, app?.lastBuildLog]);

  useEffect(() => {
    if (activeTab === "runtime-logs" && runtimeLogsContainerRef.current) {
      runtimeLogsContainerRef.current.scrollTop = runtimeLogsContainerRef.current.scrollHeight;
    }
  }, [activeTab, runtimeLogs]);

  useEffect(() => {
    if (selectedDepLogs && depLogsPreRef.current) {
      depLogsPreRef.current.scrollTop = depLogsPreRef.current.scrollHeight;
    }
  }, [selectedDepLogs]);

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

  const handleManualDeploy = async (commitHash?: string) => {
    setDeployingManual(true);
    const toastId = toast.loading(commitHash ? `Deploying commit ${commitHash}...` : "Triggering manual deployment...");
    try {
      const res = await fetch(`/api/user/app-platform/${id}/deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitHash: commitHash?.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Deployment triggered! Building container image...", { id: toastId });
        setSpecificCommitHash("");
        fetchAppDetail();
      } else {
        toast.error(json.error || "Failed to trigger deployment", { id: toastId });
      }
    } catch {
      toast.error("Connection error while triggering deploy", { id: toastId });
    } finally {
      setDeployingManual(false);
    }
  };

  const handleRollback = async (deploymentId: number, deploymentNumber: number) => {
    setRollingBackId(deploymentId);
    const toastId = toast.loading(`Rolling back to #deployment-${deploymentNumber}...`);
    try {
      const res = await fetch(`/api/user/app-platform/${id}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Rolled back to #deployment-${deploymentNumber}`, { id: toastId });
        fetchAppDetail();
      } else {
        toast.error(json.error || "Failed to rollback deployment", { id: toastId });
      }
    } catch {
      toast.error("Connection error during rollback", { id: toastId });
    } finally {
      setRollingBackId(null);
    }
  };

  const handleRunTerminalCmd = async (e?: React.FormEvent, presetCmd?: string) => {
    if (e) e.preventDefault();
    const cmdToRun = (presetCmd ?? termCommand).trim();
    if (!cmdToRun) return;
    setTermRunning(true);
    if (!presetCmd) setTermCommand("");
    try {
      const res = await fetch(`/api/user/app-platform/${id}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmdToRun }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTermHistory((prev) => [
          ...prev,
          {
            cmd: cmdToRun,
            stdout: json.data?.stdout || "",
            stderr: json.data?.stderr || "",
            exitCode: json.data?.exitCode ?? 0,
          },
        ]);
      } else {
        setTermHistory((prev) => [
          ...prev,
          { cmd: cmdToRun, stdout: "", stderr: json.error || "Execution failed", exitCode: 1 },
        ]);
      }
    } catch {
      setTermHistory((prev) => [
        ...prev,
        { cmd: cmdToRun, stdout: "", stderr: "Connection error", exitCode: 1 },
      ]);
    } finally {
      setTermRunning(false);
    }
  };

  const handleUpgradePlan = async () => {
    if (!upgradePlanCode || upgradePlanCode === app?.planName) return;
    setUpgradingPlan(true);
    const toastId = toast.loading(`Resizing compute tier to ${upgradePlanCode} (preserving all data)...`);
    try {
      const res = await fetch(`/api/user/app-platform/${id}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: upgradePlanCode }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message || `Upgraded to ${upgradePlanCode}`, { id: toastId });
        fetchAppDetail();
      } else {
        toast.error(json.error || "Failed to upgrade compute plan", { id: toastId });
      }
    } catch {
      toast.error("Connection error during plan resize", { id: toastId });
    } finally {
      setUpgradingPlan(false);
    }
  };

  const handleDeleteDeployment = async (deploymentId: number, deploymentNumber: number) => {
    try {
      const res = await fetch(`/api/user/app-platform/${id}/deployments?deploymentId=${deploymentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Removed #deployment-${deploymentNumber}`);
        setDeployments((prev) => prev.filter((d) => d.id !== deploymentId));
      } else {
        toast.error(json.error || "Failed to remove deployment record");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  const handleClearOldDeployments = async () => {
    const toastId = toast.loading("Cleaning old deployment history...");
    try {
      const res = await fetch(`/api/user/app-platform/${id}/deployments?clearOld=true`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message || "Old deployment history cleared", { id: toastId });
        fetchAppDetail();
      } else {
        toast.error(json.error || "Failed to clear history", { id: toastId });
      }
    } catch {
      toast.error("Connection error", { id: toastId });
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent, triggerRebuild = false) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    const toastId = toast.loading(triggerRebuild ? "Saving and queuing rebuild..." : "Updating app configuration...");
    try {
      const res = await fetch(`/api/user/app-platform/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gitUrl: settingsGitUrl.trim(),
          branch: settingsBranch.trim(),
          buildType: settingsBuildType,
          buildMode: settingsBuildMode,
          autoDeploy: settingsAutoDeploy,
          deployOnPush: settingsDeployOnPush,
          dockerfilePath: settingsDockerfilePath.trim() || "Dockerfile",
          appPort: Number(settingsAppPort) || 3000,
          buildCommand: settingsBuildCmd.trim() || null,
          startCommand: settingsStartCmd.trim() || null,
          envVars: settingsEnvVars.trim() || null,
          customDomain: settingsCustomDomain.trim() || null,
          healthCheckPath: settingsHealthCheckPath.trim() || null,
          persistentVolumePath: settingsPvPath.trim() || null,
          persistentVolumeGb: Number(settingsPvGb) || 0,
          enableBuildCache: settingsBuildCache,
          prPreviewEnabled: settingsPrPreview,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Configuration saved successfully", { id: toastId });
        fetchAppDetail();
        if (triggerRebuild) {
          handlePowerAction("rebuild");
        }
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
            {/* Scale Compute Button (Managed App Style) */}
            <button
              type="button"
              onClick={() => setShowScaleModal(true)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                isDark ? "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" : "border-cyan-300 text-cyan-700 hover:bg-cyan-50"
              )}
              title="Scale Compute (Zero Data Loss)"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Scale</span>
            </button>

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
      <div
        className={cn(
          "rounded-2xl border p-1.5 shadow-2xs flex items-center gap-1.5 overflow-x-auto transition-colors",
          isDark
            ? "bg-[#111115] border-white/[0.08]"
            : "bg-white border-slate-200/90"
        )}
      >
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "deployments", label: "Deployments", icon: History },
          { id: "build-logs", label: "Build Logs", icon: FileText },
          { id: "runtime-logs", label: "Runtime Logs", icon: Terminal },
          { id: "terminal", label: "Shell", icon: Code2 },
          { id: "settings", label: "Settings & Environment", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border",
                isActive
                  ? isDark
                    ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-2xs"
                    : "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-2xs"
                  : isDark
                  ? "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Primary Application Domain */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  <Globe className="w-4 h-4 text-cyan-500" />
                  Primary Application Domain
                </span>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SSL ACTIVE
                </span>
              </div>
              <div className={cn("text-xs flex items-center gap-1.5 font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span>Subdomain:</span>
                <span className="font-bold text-cyan-500">{app.subdomain}</span>
              </div>
            </div>

            <div className={cn(
              "p-3.5 rounded-xl border flex items-center justify-between gap-3 font-mono text-xs sm:text-sm",
              isDark ? "bg-black/40 border-white/[0.06] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            )}>
              <span className="truncate font-semibold text-cyan-500">{app.httpsUrl}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={app.httpsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5" : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100")}
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => copyToClipboard(app.httpsUrl, "httpsUrl")}
                  className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5" : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100")}
                  title="Copy URL"
                >
                  {copiedField === "httpsUrl" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
              Default zero-config HTTPS domain managed by Masdika Cloud with automated Traefik reverse proxy routing and Let&apos;s Encrypt automated SSL certificate renewal.
            </p>
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

      {/* TAB: DEPLOYMENTS HISTORY (RAILWAY STYLE) */}
      {activeTab === "deployments" && (
        <div className="space-y-4">
          <div className={cn(
            "rounded-2xl border p-5 sm:p-6 space-y-5 shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className={cn("text-sm sm:text-base font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>Deployments</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    Production
                  </span>
                </h3>
                <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Automated CI/CD deployment history, build logs, and instant rollbacks.
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {deployments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConfirmModal({ action: "clear-old-deployments" })}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer",
                        isDark
                          ? "bg-white/5 border-white/10 text-zinc-300 hover:text-rose-400 hover:border-rose-500/30"
                          : "bg-white border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300"
                      )}
                      title="Clear all older deployment records (keeps latest)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Old</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={specificCommitHash}
                      onChange={(e) => setSpecificCommitHash(e.target.value)}
                      placeholder="Commit SHA e.g. a81c2f9 (optional)"
                      title="Optional: Enter a Git commit SHA to build a specific commit instead of latest HEAD"
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-mono border w-56 sm:w-64 focus:outline-none focus:border-cyan-400",
                        isDark ? "bg-[#0a0a0c] border-white/10 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      )}
                    />
                    <button
                      type="button"
                      disabled={deployingManual || app?.status === "SUSPENDED"}
                      onClick={() => handleManualDeploy(specificCommitHash)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Rocket className={cn("w-3.5 h-3.5", deployingManual && "animate-pulse")} />
                      <span>{deployingManual ? "Deploying..." : "Manual Deploy"}</span>
                    </button>
                  </div>
                </div>
                <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Leave Commit SHA empty to deploy latest branch HEAD, or enter a commit hash (e.g. <code className="font-mono text-cyan-400">a81c2f9</code>) to deploy a specific commit.
                </p>
              </div>
            </div>

            {deployments.length > 0 ? (() => {
              const totalDeploymentPages = Math.max(1, Math.ceil(deployments.length / DEPLOYMENTS_PER_PAGE));
              const safeDeploymentsPage = Math.min(deploymentsPage, totalDeploymentPages);
              const paginatedDeployments = deployments.slice(
                (safeDeploymentsPage - 1) * DEPLOYMENTS_PER_PAGE,
                safeDeploymentsPage * DEPLOYMENTS_PER_PAGE
              );
              const latestSuccessId = deployments.find((d) => d.status === "SUCCESS")?.id;

              return (
                <div className="space-y-3">
                  {paginatedDeployments.map((dep, idx) => {
                    const globalIdx = (safeDeploymentsPage - 1) * DEPLOYMENTS_PER_PAGE + idx;
                    const isSuccess = dep.status === "SUCCESS";
                    const isFailed = dep.status === "FAILED";
                    const isBuilding = dep.status === "BUILDING" || dep.status === "QUEUED";
                    const isStaleBuilding =
                      isBuilding &&
                      (globalIdx > 0 || Date.now() - new Date(dep.createdAt).getTime() > 15 * 60 * 1000);
                    const canDelete = !isBuilding || isStaleBuilding;
                    const isCurrentActive = dep.id === latestSuccessId && isSuccess;

                    return (
                      <div
                        key={dep.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                          isCurrentActive
                            ? isDark
                              ? "bg-emerald-500/[0.04] border-emerald-500/30"
                              : "bg-emerald-50/70 border-emerald-200"
                            : isDark
                            ? "bg-[#0a0a0c] border-white/[0.06] hover:border-white/15"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("font-mono text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>
                              #deployment-{dep.deploymentNumber || dep.id}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                isSuccess
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : isFailed
                                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              )}
                            >
                              {isSuccess ? "Success" : isFailed ? "Failed" : dep.status}
                            </span>
                            {isCurrentActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                Active
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-zinc-500">
                              {dep.trigger === "GIT_PUSH" ? "Git Push" : dep.trigger === "ROLLBACK" ? "Rollback" : "Manual"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono">
                            <span className="flex items-center gap-1 text-cyan-400">
                              <GitBranch className="w-3 h-3" />
                              {dep.branch || app?.branch || "main"}
                            </span>
                            {dep.commitHash && (
                              <>
                                <span>·</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                                  {dep.commitHash}
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span>{new Date(dep.createdAt).toLocaleString()}</span>
                            {dep.durationSeconds ? (
                              <>
                                <span>·</span>
                                <span>{dep.durationSeconds}s</span>
                              </>
                            ) : null}
                          </div>

                          <p className={cn("text-xs truncate", isDark ? "text-zinc-300" : "text-slate-700")}>
                            {dep.commitMessage || (isSuccess ? "Build completed · Deployment healthy" : isFailed ? "Build failed · Check build logs" : "Building image in cluster...")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (dep.buildLogs) {
                                setSelectedDepLogs({
                                  num: dep.deploymentNumber || dep.id,
                                  logs: dep.buildLogs,
                                  status: dep.status,
                                });
                              } else {
                                setActiveTab("build-logs");
                              }
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5",
                              isDark
                                ? "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Logs</span>
                          </button>

                          {isSuccess && dep.imageTag && dep.id !== latestSuccessId && (
                            <button
                              type="button"
                              disabled={rollingBackId === dep.id}
                              onClick={() => handleRollback(dep.id, dep.deploymentNumber || dep.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5",
                                isDark
                                  ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                                  : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                              )}
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>{rollingBackId === dep.id ? "Rolling back..." : "Rollback"}</span>
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  action: "delete-deployment",
                                  deploymentId: dep.id,
                                  deploymentNumber: dep.deploymentNumber || dep.id,
                                })
                              }
                              className={cn(
                                "p-1.5 rounded-lg border transition-colors cursor-pointer",
                                isDark
                                  ? "bg-white/5 border-white/10 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30"
                                  : "bg-white border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300"
                              )}
                              title="Delete deployment record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Consistent Pagination */}
                  {totalDeploymentPages > 1 && (
                    <div
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 pt-3 border-t text-xs",
                        isDark ? "border-white/[0.06]" : "border-slate-200/80"
                      )}
                    >
                      <span className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                        Showing {(safeDeploymentsPage - 1) * DEPLOYMENTS_PER_PAGE + 1} -{" "}
                        {Math.min(safeDeploymentsPage * DEPLOYMENTS_PER_PAGE, deployments.length)} of{" "}
                        {deployments.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={safeDeploymentsPage === 1}
                          onClick={() => setDeploymentsPage((p) => Math.max(1, p - 1))}
                          className={cn(
                            "p-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
                            isDark
                              ? "bg-white/[0.04] border-white/10 text-zinc-300 hover:text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                          title="Previous page"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span
                          className={cn(
                            "px-2 font-mono font-bold text-xs",
                            isDark ? "text-cyan-400" : "text-cyan-700"
                          )}
                        >
                          {safeDeploymentsPage} / {totalDeploymentPages}
                        </span>
                        <button
                          type="button"
                          disabled={safeDeploymentsPage === totalDeploymentPages}
                          onClick={() => setDeploymentsPage((p) => Math.min(totalDeploymentPages, p + 1))}
                          className={cn(
                            "p-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
                            isDark
                              ? "bg-white/[0.04] border-white/10 text-zinc-300 hover:text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                          title="Next page"
                          aria-label="Next page"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="py-10 text-center space-y-2 border border-dashed rounded-xl border-white/10">
                <History className="w-8 h-8 text-zinc-500 mx-auto" />
                <p className="text-xs text-zinc-400">No deployment records yet. Trigger a Manual Deploy to start.</p>
              </div>
            )}

            {selectedDepLogs && (
              <div className={cn(
                "mt-4 rounded-2xl border overflow-hidden shadow-sm transition-colors",
                isDark ? "bg-[#090d16] border-white/[0.08]" : "bg-white border-slate-200"
              )}>
                <div className={cn(
                  "px-4 py-2.5 border-b flex items-center justify-between",
                  isDark ? "bg-[#14161f] border-white/[0.08]" : "bg-slate-50/90 border-slate-200"
                )}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block" />
                    <span className={cn("text-xs font-mono font-bold ml-1.5", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      #deployment-{selectedDepLogs.num} Build Logs ({selectedDepLogs.status})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDepLogs(null)}
                    className={cn("text-xs font-semibold cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                  >
                    Close
                  </button>
                </div>
                <pre ref={depLogsPreRef} className={cn("p-4 font-mono text-xs whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed", isDark ? "text-emerald-400" : "text-slate-800")}>
                  {cleanTerminalLogs(selectedDepLogs.logs)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BUILD LOGS */}
      {activeTab === "build-logs" && (
        <div className={cn(
          "rounded-2xl border overflow-hidden shadow-sm transition-all",
          isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200"
        )}>
          {/* macOS Title Bar */}
          <div className={cn(
            "px-4 py-3 border-b flex items-center justify-between gap-3 select-none",
            isDark ? "bg-[#14161f] border-white/[0.08]" : "bg-slate-50/90 border-slate-200"
          )}>
            {/* Traffic Light Dots + Window Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-2xs" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-2xs" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-2xs" />
              </div>
              <div className={cn(
                "flex items-center gap-2 pl-2 border-l min-w-0 font-mono text-xs font-bold",
                isDark ? "border-white/10 text-zinc-200" : "border-slate-300 text-slate-800"
              )}>
                <FileText className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span className="truncate">buildkit.log</span>
                <span className={cn(
                  "hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md font-mono font-medium border shrink-0",
                  isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-white border-slate-200 text-slate-600 shadow-2xs"
                )}>
                  pipeline - 80x24
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => fetchLogs("build")}
                disabled={logsLoading}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer",
                  isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
                )}
              >
                <RefreshCw className={cn("w-3 h-3 text-cyan-500", logsLoading && "animate-spin")} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => copyToClipboard(cleanTerminalLogs(buildLogs), "buildLogs")}
                className={cn(
                  "p-1.5 rounded-lg border transition-all cursor-pointer",
                  isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
                )}
                title="Copy build logs"
              >
                {copiedField === "buildLogs" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Terminal Console Screen (Light in Light Mode like macOS window, dark in Dark Mode) */}
          <div
            ref={buildLogsContainerRef}
            className={cn(
              "p-4 sm:p-5 font-mono text-xs overflow-x-auto overflow-y-auto max-h-[550px] leading-relaxed whitespace-pre-wrap select-text transition-colors",
              isDark
                ? "bg-[#090d16] text-emerald-400 selection:bg-cyan-500/30 selection:text-white"
                : "bg-white text-slate-800 selection:bg-cyan-100 selection:text-slate-900"
            )}
          >
            <div className={cn(
              "flex items-center gap-2 text-[11px] pb-2 mb-3 border-b select-none",
              isDark ? "text-zinc-500 border-white/[0.08]" : "text-slate-400 border-slate-100"
            )}>
              <Terminal className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span className={isDark ? "text-zinc-400" : "text-slate-600 font-medium"}>Masdika Cloud App Engine • Kaniko In-Cluster Pipeline</span>
              <span>•</span>
              <span className={cn("truncate", isDark ? "text-zinc-500" : "text-slate-400")}>Target: {app.name} ({app.buildType})</span>
            </div>
            <pre className={cn("font-mono text-xs leading-relaxed whitespace-pre-wrap", isDark ? "text-emerald-400" : "text-slate-800")}>
              {cleanTerminalLogs(buildLogs || app.lastBuildLog) || "No build logs available yet. Trigger a rebuild to see pipeline execution."}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: RUNTIME LOGS */}
      {activeTab === "runtime-logs" && (
        <div className={cn(
          "rounded-2xl border overflow-hidden shadow-sm transition-all",
          isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200"
        )}>
          {/* macOS Title Bar */}
          <div className={cn(
            "px-4 py-3 border-b flex items-center justify-between gap-3 select-none",
            isDark ? "bg-[#14161f] border-white/[0.08]" : "bg-slate-50/90 border-slate-200"
          )}>
            {/* Traffic Light Dots + Window Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-2xs" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-2xs" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-2xs" />
              </div>
              <div className={cn(
                "flex items-center gap-2 pl-2 border-l min-w-0 font-mono text-xs font-bold",
                isDark ? "border-white/10 text-zinc-200" : "border-slate-300 text-slate-800"
              )}>
                <Terminal className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span className="truncate">runtime-stdout.log</span>
                <span className={cn(
                  "hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md font-mono font-medium border shrink-0",
                  isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-white border-slate-200 text-slate-600 shadow-2xs"
                )}>
                  container-stream
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => fetchLogs("runtime")}
                disabled={logsLoading}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer",
                  isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
                )}
              >
                <RefreshCw className={cn("w-3 h-3 text-cyan-500", logsLoading && "animate-spin")} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => copyToClipboard(cleanTerminalLogs(runtimeLogs), "runtimeLogs")}
                className={cn(
                  "p-1.5 rounded-lg border transition-all cursor-pointer",
                  isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
                )}
                title="Copy runtime logs"
              >
                {copiedField === "runtimeLogs" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Terminal Console Screen (Light in Light Mode like macOS window, dark in Dark Mode) */}
          <div
            ref={runtimeLogsContainerRef}
            className={cn(
              "p-4 sm:p-5 font-mono text-xs overflow-x-auto overflow-y-auto max-h-[550px] leading-relaxed whitespace-pre-wrap select-text transition-colors",
              isDark
                ? "bg-[#090d16] text-emerald-400 selection:bg-cyan-500/30 selection:text-white"
                : "bg-white text-slate-800 selection:bg-cyan-100 selection:text-slate-900"
            )}
          >
            <div className={cn(
              "flex items-center gap-2 text-[11px] pb-2 mb-3 border-b select-none",
              isDark ? "text-zinc-500 border-white/[0.08]" : "text-slate-400 border-slate-100"
            )}>
              <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className={isDark ? "text-zinc-400" : "text-slate-600 font-medium"}>Kubernetes Pod Standard Output (STDOUT/STDERR)</span>
              <span>•</span>
              <span className={cn("truncate", isDark ? "text-zinc-500" : "text-slate-400")}>Stream: Active</span>
            </div>
            <pre className={cn("font-mono text-xs leading-relaxed whitespace-pre-wrap", isDark ? "text-emerald-400" : "text-slate-800")}>
              {cleanTerminalLogs(runtimeLogs) || "Waiting for container logs..."}
            </pre>
          </div>
        </div>
      )}

      {/* TAB: WEB TERMINAL (EXEC SHELL) */}
      {activeTab === "terminal" && (
        <div className={cn(
          "rounded-2xl border overflow-hidden shadow-sm transition-all",
          isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200"
        )}>
          <div className={cn(
            "px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 select-none",
            isDark ? "bg-[#14161f] border-white/[0.08]" : "bg-slate-50/90 border-slate-200"
          )}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block" />
              </div>
              <div className={cn(
                "flex items-center gap-2 pl-2 border-l font-mono text-xs font-bold",
                isDark ? "border-white/10 text-zinc-200" : "border-slate-300 text-slate-800"
              )}>
                <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                <span>pod-shell — sh</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {["ls -la", "env", "df -h", "php artisan migrate --force", "npx prisma migrate deploy"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={termRunning || app?.status !== "RUNNING"}
                  onClick={() => handleRunTerminalCmd(undefined, preset)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer disabled:opacity-40",
                    isDark ? "bg-white/5 border-white/10 text-zinc-300 hover:text-cyan-400" : "bg-white border-slate-200 text-slate-700 hover:text-cyan-700 shadow-2xs"
                  )}
                >
                  {preset}
                </button>
              ))}
              {termHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTermHistory([])}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className={cn(
            "p-4 sm:p-5 font-mono text-xs min-h-[340px] max-h-[500px] overflow-y-auto space-y-3 transition-colors",
            isDark ? "bg-[#090d16] text-emerald-400" : "bg-white text-slate-800"
          )}>
            {app?.status !== "RUNNING" ? (
              <div className={isDark ? "text-amber-400" : "text-amber-700 font-medium"}>
                Container must be RUNNING to open an interactive shell session. Current status: {app?.status}.
              </div>
            ) : termHistory.length === 0 ? (
              <div className={isDark ? "text-zinc-500" : "text-slate-500"}>
                Connected to container pod ({app?.subdomain}). Run any shell command below (e.g. <code>ls -la</code>, <code>php artisan migrate</code>).
              </div>
            ) : (
              termHistory.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    $ {item.cmd}
                  </div>
                  {item.stdout && (
                    <pre className={cn("whitespace-pre-wrap break-words leading-relaxed", isDark ? "text-emerald-400" : "text-slate-800")}>{item.stdout}</pre>
                  )}
                  {item.stderr && (
                    <pre className={cn("whitespace-pre-wrap break-words leading-relaxed", isDark ? "text-rose-400" : "text-rose-600")}>{item.stderr}</pre>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={(e) => handleRunTerminalCmd(e)} className={cn(
            "p-3 border-t flex items-center gap-2 transition-colors",
            isDark ? "border-white/[0.08] bg-[#0d111a]" : "border-slate-200 bg-slate-50/90"
          )}>
            <span className={cn("font-mono text-xs font-bold pl-1", isDark ? "text-cyan-400" : "text-cyan-700")}>$</span>
            <input
              type="text"
              value={termCommand}
              onChange={(e) => setTermCommand(e.target.value)}
              disabled={termRunning || app?.status !== "RUNNING"}
              placeholder="Enter shell command (e.g. php artisan migrate --force)..."
              className={cn(
                "flex-1 bg-transparent text-xs font-mono focus:outline-none",
                isDark ? "text-white placeholder-zinc-500" : "text-slate-900 placeholder-slate-400"
              )}
            />
            <button
              type="submit"
              disabled={termRunning || !termCommand.trim() || app?.status !== "RUNNING"}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer disabled:opacity-40"
            >
              {termRunning ? "Running..." : "Run"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: SETTINGS & ENVIRONMENT */}
      {activeTab === "settings" && (
        <form onSubmit={(e) => handleSaveSettings(e, false)} className="space-y-6">
          {/* CARD 1: BUILD STRATEGY & REPOSITORY CONFIGURATION */}
          <div className={cn(
            "rounded-2xl border p-5 sm:p-6 space-y-5 transition-all shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
              <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Settings className="w-4 h-4 shrink-0" />
                <span>Build Strategy &amp; Source Repository</span>
              </h3>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold self-start sm:self-auto shrink-0 border",
                settingsBuildType === "DOCKERFILE"
                  ? isDark ? "bg-blue-500/15 text-blue-400 border-blue-500/25" : "bg-blue-50 text-blue-700 border-blue-200"
                  : isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" : "bg-cyan-50 text-cyan-700 border-cyan-200"
              )}>
                <span>{settingsBuildType === "DOCKERFILE" ? "Native Dockerfile" : `Auto Framework (${settingsBuildType})`}</span>
              </span>
            </div>

            {/* Build Mode Selector Toggle */}
            <div>
              <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                Build Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettingsBuildType(settingsBuildType === "DOCKERFILE" ? (app?.buildType && app.buildType !== "DOCKERFILE" ? app.buildType : "LARAVEL") : settingsBuildType)}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                    settingsBuildType !== "DOCKERFILE"
                      ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                      : isDark ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/20" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Code2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>Automated Framework Engine</div>
                    <div className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Masdika Cloud automatically provisions Dockerfile and dependencies for your stack.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsBuildType("DOCKERFILE")}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                    settingsBuildType === "DOCKERFILE"
                      ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                      : isDark ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/20" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <SiDocker className="w-4 h-4 text-[#2496ED] shrink-0 mt-0.5" />
                  <div>
                    <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>Native Custom Dockerfile</div>
                    <div className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Kaniko directly builds from your repository&apos;s Dockerfile. Zero automatic overrides.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Git URL & Branch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Git Repository URL
                </label>
                <input
                  type="url"
                  required
                  value={settingsGitUrl}
                  onChange={(e) => setSettingsGitUrl(e.target.value)}
                  placeholder="https://github.com/username/repository.git"
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Git Branch
                </label>
                <input
                  type="text"
                  required
                  value={settingsBranch}
                  onChange={(e) => setSettingsBranch(e.target.value)}
                  placeholder="main"
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>
            </div>

            {/* Framework or Dockerfile Fields */}
            {settingsBuildType === "DOCKERFILE" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Dockerfile Path in Repository
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsDockerfilePath}
                    onChange={(e) => setSettingsDockerfilePath(e.target.value)}
                    placeholder="Dockerfile"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                      isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                  <p className={cn("text-[11px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Relative path to Dockerfile inside repo (e.g. <code>Dockerfile</code> or <code>docker/Dockerfile.prod</code>).
                  </p>
                </div>

                <div>
                  <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Container Exposed Port
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={65535}
                    value={settingsAppPort}
                    onChange={(e) => setSettingsAppPort(parseInt(e.target.value, 10) || 3000)}
                    placeholder="3000"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                      isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                  <p className={cn("text-[11px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                    The internal TCP port exposed by your Dockerfile (e.g. 3000, 80, 8080).
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                      Framework Preset
                    </label>
                    <Select
                      value={settingsBuildType}
                      onChange={(val) => {
                        const v = String(val);
                        setSettingsBuildType(v);
                        if (["PHP", "LARAVEL", "WORDPRESS", "STATIC", "VITE"].includes(v)) setSettingsAppPort(80);
                        else if (["GOLANG", "RUST"].includes(v)) setSettingsAppPort(8080);
                        else if (["FASTAPI", "DJANGO"].includes(v)) setSettingsAppPort(8000);
                        else setSettingsAppPort(3000);
                      }}
                      className="h-[42px] px-3.5 py-0 text-xs font-bold"
                      options={[
                        { value: "LARAVEL", label: "Laravel (PHP 8.3)" },
                        { value: "NEXTJS", label: "Next.js (App Router)" },
                        { value: "NODEJS", label: "Node.js / Express" },
                        { value: "FASTAPI", label: "FastAPI (Python)" },
                        { value: "DJANGO", label: "Django (Python)" },
                        { value: "PYTHON", label: "Python (General)" },
                        { value: "GOLANG", label: "Go (Golang)" },
                        { value: "PHP", label: "PHP (Native Apache)" },
                        { value: "NESTJS", label: "NestJS" },
                        { value: "VITE", label: "Vite (React / Vue SPA)" },
                        { value: "ASTRO", label: "Astro" },
                        { value: "SVELTE", label: "Svelte / SvelteKit" },
                        { value: "REMIX", label: "Remix" },
                        { value: "WORDPRESS", label: "WordPress" },
                        { value: "RUST", label: "Rust" },
                        { value: "RUBY", label: "Ruby on Rails" },
                        { value: "STATIC", label: "Static HTML" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                      Build Command (Optional)
                    </label>
                    <input
                      type="text"
                      value={settingsBuildCmd}
                      onChange={(e) => setSettingsBuildCmd(e.target.value)}
                      placeholder={settingsBuildType === "LARAVEL" || settingsBuildType === "PHP" ? "composer install" : settingsBuildType === "FASTAPI" ? "pip install -r requirements.txt" : "npm run build"}
                      className={cn(
                        "w-full h-[42px] px-3.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                        isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                      Start Command (Optional)
                    </label>
                    <input
                      type="text"
                      value={settingsStartCmd}
                      onChange={(e) => setSettingsStartCmd(e.target.value)}
                      placeholder={settingsBuildType === "FASTAPI" ? "uvicorn main:app --port 8000" : settingsBuildType === "LARAVEL" || settingsBuildType === "PHP" ? "apache2-foreground" : "npm start"}
                      className={cn(
                        "w-full h-[42px] px-3.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                        isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: CUSTOM DOMAIN & SSL ROUTING */}
          <div className={cn(
            "rounded-2xl border p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
              <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Globe className="w-4 h-4 shrink-0" />
                <span>Custom Domain &amp; SSL Routing</span>
              </h3>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold self-start sm:self-auto shrink-0 border",
                isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Automatic Let&apos;s Encrypt TLS</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={cn(
                "p-3.5 rounded-xl border space-y-1 text-xs",
                isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
              )}>
                <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Primary Ingress Domain (CNAME Target)
                </span>
                <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                  <span className={cn("truncate mr-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    {app?.fullDomain}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(app?.fullDomain || "", "Primary Domain")}
                    className={cn("cursor-pointer transition-colors shrink-0", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                    title="Copy CNAME Target"
                  >
                    {copiedField === "Primary Domain" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className={cn(
                "p-3.5 rounded-xl border space-y-1 text-xs",
                isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200/90 shadow-2xs"
              )}>
                <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Server IP (A Record Target)
                </span>
                <div className="flex items-center justify-between font-mono font-bold text-xs pt-0.5">
                  <span className={cn("truncate mr-2", isDark ? "text-white" : "text-slate-900")}>
                    {app?.publicIp || "206.237.98.230"}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(app?.publicIp || "206.237.98.230", "Server IP")}
                    className={cn("cursor-pointer transition-colors shrink-0", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700")}
                    title="Copy Server IP"
                  >
                    {copiedField === "Server IP" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                Custom Domain (Apex or Subdomain)
              </label>
              <input
                type="text"
                value={settingsCustomDomain}
                onChange={(e) => setSettingsCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="app.mycompany.com"
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                )}
              />
              <p className={cn("text-[11px] mt-1.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                To point your custom domain, create a <strong>CNAME</strong> record pointing to <code className="font-mono text-cyan-400">{app?.fullDomain}</code> (or an <strong>A</strong> record pointing to <code className="font-mono text-cyan-400">{app?.publicIp || "206.237.98.230"}</code>) in your DNS manager. SSL certificate will be issued automatically upon DNS resolution.
              </p>
            </div>
          </div>

          {/* CARD: CI/CD AUTOMATION & GITHUB WEBHOOK */}
          <div className={cn(
            "rounded-2xl border p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
              <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Webhook className="w-4 h-4 shrink-0" />
                <span>CI/CD Automation &amp; Git Push Webhook</span>
              </h3>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                settingsAutoDeploy && settingsDeployOnPush
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
              )}>
                {settingsAutoDeploy && settingsDeployOnPush ? "Auto Deploy Active" : "Manual Only"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={cn(
                "p-3.5 rounded-xl border",
                isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200"
              )}>
                <AdminCheckbox
                  checked={settingsAutoDeploy}
                  onChange={setSettingsAutoDeploy}
                  label={
                    <div>
                      <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>Auto Deploy</div>
                      <div className="text-[11px] text-zinc-500 font-normal">Automatically build &amp; deploy on trigger events</div>
                    </div>
                  }
                />
              </div>

              <div className={cn(
                "p-3.5 rounded-xl border",
                isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200"
              )}>
                <AdminCheckbox
                  checked={settingsDeployOnPush}
                  onChange={setSettingsDeployOnPush}
                  label={
                    <div>
                      <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>Deploy on Push</div>
                      <div className="text-[11px] text-zinc-500 font-normal">Trigger rebuild when pushing to branch {settingsBranch || "main"}</div>
                    </div>
                  }
                />
              </div>

              <div className={cn(
                "p-3.5 rounded-xl border",
                isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200"
              )}>
                <AdminCheckbox
                  checked={settingsBuildCache}
                  onChange={setSettingsBuildCache}
                  label={
                    <div>
                      <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>Registry Layer Build Cache</div>
                      <div className="text-[11px] text-zinc-500 font-normal">Cache Docker layers in cluster registry for faster rebuilds</div>
                    </div>
                  }
                />
              </div>

              <div className={cn(
                "p-3.5 rounded-xl border",
                isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200"
              )}>
                <AdminCheckbox
                  checked={settingsPrPreview}
                  onChange={setSettingsPrPreview}
                  label={
                    <div>
                      <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>PR Preview Environments</div>
                      <div className="text-[11px] text-zinc-500 font-normal">Auto-deploy ephemeral preview URLs on Pull Requests</div>
                    </div>
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Health Check Path (Zero-Downtime)
                </label>
                <input
                  type="text"
                  value={settingsHealthCheckPath}
                  onChange={(e) => setSettingsHealthCheckPath(e.target.value)}
                  placeholder="/health or /"
                  className={cn(
                    "w-full h-[42px] px-3.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Persistent Volume Mount Path
                </label>
                <input
                  type="text"
                  value={settingsPvPath}
                  onChange={(e) => setSettingsPvPath(e.target.value)}
                  placeholder="/var/www/html/storage"
                  className={cn(
                    "w-full h-[42px] px-3.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("text-[11px] font-semibold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Persistent Disk Size (GB)
                </label>
                <Select
                  value={settingsPvGb}
                  onChange={(val) => setSettingsPvGb(Number(val))}
                  className="h-[42px] px-3.5 py-0 text-xs font-mono"
                  options={[
                    { value: 0, label: "Disabled (Ephemeral)" },
                    { value: 1, label: "1 GB Persistent Disk" },
                    { value: 5, label: "5 GB Persistent Disk" },
                    { value: 10, label: "10 GB Persistent Disk" },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={cn("p-3.5 rounded-xl border space-y-1", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  GitHub / GitLab Payload Webhook URL
                </span>
                <div className="flex items-center justify-between font-mono text-xs pt-0.5">
                  <span className={cn("truncate mr-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/app-platform/${id}` : `/api/webhooks/app-platform/${id}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/app-platform/${id}` : `/api/webhooks/app-platform/${id}`,
                      "Webhook URL"
                    )}
                    className="text-zinc-400 hover:text-cyan-400 cursor-pointer shrink-0"
                  >
                    {copiedField === "Webhook URL" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className={cn("p-3.5 rounded-xl border space-y-1", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Webhook Secret Token
                </span>
                <div className="flex items-center justify-between font-mono text-xs pt-0.5 gap-2">
                  <span className={cn("truncate", isDark ? "text-zinc-300" : "text-slate-700")}>
                    {app?.webhookSecret
                      ? showWebhookSecret
                        ? app.webhookSecret
                        : "*".repeat(Math.min(32, app.webhookSecret.length))
                      : "Auto-generated"}
                  </span>
                  {app?.webhookSecret && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowWebhookSecret((prev) => !prev)}
                        className="text-zinc-400 hover:text-cyan-400 cursor-pointer"
                        title={showWebhookSecret ? "Hide secret" : "Show secret"}
                        aria-label={showWebhookSecret ? "Hide secret" : "Show secret"}
                      >
                        {showWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(app.webhookSecret, "Webhook Secret")}
                        className="text-zinc-400 hover:text-cyan-400 cursor-pointer"
                        title="Copy secret token"
                      >
                        {copiedField === "Webhook Secret" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: CONTAINER ENVIRONMENT VARIABLES */}
          <div className={cn(
            "rounded-2xl border p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
              <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Terminal className="w-4 h-4 shrink-0" />
                <span>Container Environment Variables</span>
              </h3>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold self-start sm:self-auto shrink-0 border",
                isDark ? "bg-white/5 text-zinc-300 border-white/10" : "bg-slate-100 text-slate-700 border-slate-200"
              )}>
                KEY=VALUE per line
              </span>
            </div>

            <MacCodeEditor
              value={settingsEnvVars}
              onChange={setSettingsEnvVars}
              filename=".env"
              badge="KEY=VALUE per line"
              placeholder={"APP_ENV=production\nAPP_DEBUG=false\nDATABASE_URL=mysql://user:pass@host:3306/db\nAPI_SECRET=my-secret-key"}
              rows={6}
              isDark={isDark}
            />
            <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
              Variables are securely mounted into the Kubernetes Pod container environment.
            </p>
          </div>

          {/* ACTION BUTTONS (MANAGED APP STYLE) */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-400/20 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {savingSettings ? "Saving Settings..." : "Save Configuration"}
            </button>

            <button
              type="button"
              disabled={savingSettings || actionLoading}
              onClick={() => handleSaveSettings(undefined, true)}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer border disabled:opacity-50 active:scale-95",
                isDark
                  ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/30"
                  : "bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border-cyan-300"
              )}
            >
              <RotateCw className={cn("w-3.5 h-3.5", (savingSettings || actionLoading) && "animate-spin")} />
              <span>Save &amp; Trigger Rebuild</span>
            </button>
          </div>
        </form>
      )}

      {/* Zero Data Loss Scaling Modal (Managed App Style) */}
      {showScaleModal && app && (
        <AppScaleModal
          isOpen={showScaleModal}
          onClose={() => setShowScaleModal(false)}
          app={{
            id: app.id,
            name: app.name,
            appType: app.buildType || "APP",
            planName: app.planName,
            cpuShares: app.cpuShares,
            memoryMb: app.memoryMb,
            monthlyPrice: app.monthlyPrice,
            hourlyRate: app.hourlyRate,
            status: app.status,
          }}
          apiEndpoint={`/api/user/app-platform/${app.id}/upgrade`}
          onSuccess={fetchAppDetail}
          isDark={isDark}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          onConfirm={() => {
            const { action, deploymentId, deploymentNumber } = confirmModal;
            setConfirmModal(null);
            if (action === "delete") {
              handleDelete();
            } else if (action === "delete-deployment") {
              if (deploymentId) {
                handleDeleteDeployment(deploymentId, deploymentNumber || deploymentId);
              }
            } else if (action === "clear-old-deployments") {
              handleClearOldDeployments();
            } else {
              handlePowerAction(action);
            }
          }}
          title={
            confirmModal.action === "delete"
              ? "Terminate Application"
              : confirmModal.action === "delete-deployment"
              ? `Delete #deployment-${confirmModal.deploymentNumber}`
              : confirmModal.action === "clear-old-deployments"
              ? "Clear Old Deployment History"
              : confirmModal.action === "rebuild"
              ? "Trigger Rebuild"
              : `${confirmModal.action.toUpperCase()} Application`
          }
          description={
            confirmModal.action === "delete"
              ? `WARNING: This will permanently delete ${app.name} and clean up all Kubernetes deployments, services, and SSL certs.`
              : confirmModal.action === "delete-deployment"
              ? `Are you sure you want to remove #deployment-${confirmModal.deploymentNumber} from deployment history?`
              : confirmModal.action === "clear-old-deployments"
              ? `This will remove all older deployment history records for ${app.name}, keeping only the latest deployment.`
              : confirmModal.action === "rebuild"
              ? `A new build job will clone ${app.gitUrl} (${app.branch}) and deploy a fresh image upon completion.`
              : `Are you sure you want to execute ${confirmModal.action} on ${app.name}?`
          }
          confirmText={
            confirmModal.action === "delete"
              ? "Delete Permanently"
              : confirmModal.action === "delete-deployment" || confirmModal.action === "clear-old-deployments"
              ? "Delete"
              : "Confirm"
          }
          variant={
            confirmModal.action === "delete" ||
            confirmModal.action === "delete-deployment" ||
            confirmModal.action === "clear-old-deployments"
              ? "danger"
              : "warning"
          }
        />
      )}
    </div>
  );
}
