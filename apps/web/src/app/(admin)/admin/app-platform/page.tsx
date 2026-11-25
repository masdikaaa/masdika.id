"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import Link from "next/link";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  AppWindow,
  RefreshCw,
  Search,
  Play,
  Square,
  RotateCw,
  Trash2,
  ExternalLink,
  Settings,
  Cpu,
  Server,
  Activity,
  Globe,
  Copy,
  Check,
  GitBranch,
  Container,
  ShieldAlert,
  ShieldCheck,
  Hammer,
  User,
} from "lucide-react";

interface AdminAppPlatformItem {
  id: number;
  userId: number;
  name: string;
  subdomain: string;
  customDomain: string | null;
  fullDomain: string;
  httpsUrl: string;
  port: number;
  appPort: number;
  publicIp: string;
  isDirectImage: boolean;
  sourceLabel: string;
  dockerImage: string | null;
  gitUrl: string;
  branch: string;
  buildMode: string;
  buildType: string;
  preDeployCommand: string | null;
  planName: string;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  billingMode: string;
  monthlyPrice: number;
  hourlyRate: number;
  accumulatedCost: number;
  status: string;
  suspendReason: string | null;
  lastBuildStatus: string | null;
  lastDeployedAt: string | null;
  deploymentsCount: number;
  customerName: string;
  customerEmail: string;
  createdAt: string;
}

interface ClusterStats {
  totalInstances: number;
  runningCount: number;
  buildingCount: number;
  stoppedCount: number;
  suspendedCount: number;
  totalCpu: number;
  totalMemoryGb: number;
  totalStorageGb: number;
  totalMonthlyRunRate: number;
  maxInstances: number;
  maxCpu: number;
  maxRamGb: number;
  maxDiskGb: number;
  publicDomain: string;
  publicIp: string;
}

export default function AdminAppPlatformPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [apps, setApps] = useState<AdminAppPlatformItem[]>([]);
  const [stats, setStats] = useState<ClusterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<"ALL" | "GIT" | "IMAGE">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [poweringId, setPoweringId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<AdminAppPlatformItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchApps = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/app-platform");
      const data = await res.json();
      if (res.ok) {
        setApps(data.apps || []);
        setStats(data.stats || null);
      } else {
        toast.error(data.error || "Failed to load App Platform instances");
      }
    } catch {
      toast.error("Failed to connect to App Platform admin API");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAction = async (
    id: number,
    action: "start" | "stop" | "restart" | "rebuild" | "suspend" | "unsuspend"
  ) => {
    setPoweringId(id);
    const labelMap: Record<typeof action, string> = {
      start: "Starting",
      stop: "Stopping",
      restart: "Restarting",
      rebuild: "Rebuilding / Redeploying",
      suspend: "Suspending",
      unsuspend: "Unsuspending",
    };
    const toastId = toast.loading(`${labelMap[action]} application...`);
    try {
      const res = await fetch("/api/admin/app-platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Action ${action} completed`, { id: toastId });
        fetchApps();
      } else {
        toast.error(data.error || `Failed to ${action} application`, { id: toastId });
      }
    } catch {
      toast.error("An error occurred while executing action", { id: toastId });
    } finally {
      setPoweringId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalItem) return;
    setDeleting(true);
    const toastId = toast.loading(`Terminating ${deleteModalItem.name} on cluster...`);
    try {
      const res = await fetch("/api/admin/app-platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteModalItem.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Application terminated successfully", { id: toastId });
        setDeleteModalItem(null);
        fetchApps();
      } else {
        toast.error(data.error || "Failed to terminate application", { id: toastId });
      }
    } catch {
      toast.error("An error occurred during termination", { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const filteredApps = apps.filter((app) => {
    if (selectedSource === "GIT" && app.isDirectImage) return false;
    if (selectedSource === "IMAGE" && !app.isDirectImage) return false;

    if (selectedStatus === "BUILDING") {
      if (app.lastBuildStatus !== "BUILDING" && app.lastBuildStatus !== "QUEUED") return false;
    } else if (selectedStatus !== "ALL" && app.status !== selectedStatus) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.name.toLowerCase().includes(q);
      const matchCustomer =
        app.customerName.toLowerCase().includes(q) ||
        app.customerEmail.toLowerCase().includes(q);
      const matchDomain = app.fullDomain.toLowerCase().includes(q);
      const matchSource = (app.dockerImage || app.gitUrl || "").toLowerCase().includes(q);
      if (!matchName && !matchCustomer && !matchDomain && !matchSource) return false;
    }
    return true;
  });

  const renderStatusBadge = (app: AdminAppPlatformItem) => {
    const isBuilding = app.lastBuildStatus === "BUILDING" || app.lastBuildStatus === "QUEUED";
    const displayStatus = isBuilding && app.status !== "SUSPENDED" ? app.lastBuildStatus! : app.status;

    const badgeStyles =
      displayStatus === "RUNNING"
        ? isDark
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"
        : displayStatus === "BUILDING" || displayStatus === "QUEUED" || displayStatus === "PROVISIONING"
          ? isDark
            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
            : "bg-cyan-50 text-cyan-700 border-cyan-200"
          : displayStatus === "SUSPENDED"
            ? isDark
              ? "bg-red-500/15 text-red-400 border-red-500/30"
              : "bg-red-50 text-red-700 border-red-200"
            : isDark
              ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
              : "bg-slate-100 text-slate-600 border-slate-200";

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0",
          badgeStyles
        )}
      >
        {displayStatus === "RUNNING" && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
        {(displayStatus === "BUILDING" || displayStatus === "QUEUED") && (
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
        )}
        {displayStatus}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1
            className={cn(
              "text-xl sm:text-2xl font-bold mb-1 tracking-tight",
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            App Platform Clusters
          </h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage all customer Git repositories, Docker images &amp; container workloads deployed on Kubernetes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchApps}
            disabled={refreshing || loading}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (refreshing || loading) && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/resource-finding"
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 border",
              isDark
                ? "bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border-cyan-500/20"
                : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Resource Monitor</span>
          </Link>
          <Link
            href="/admin/settings?tab=app-platform"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cluster Settings</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={cn(
            "rounded-2xl border p-5 transition-all",
            isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              TOTAL APPS
            </span>
            <div
              className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center",
                isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <AppWindow className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats?.totalInstances ?? apps.length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Active Instances
            </span>
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-5 transition-all",
            isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              RUNNING PODS
            </span>
            <div
              className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center",
                isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats?.runningCount ?? apps.filter((a) => a.status === "RUNNING").length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-emerald-400" : "text-emerald-600")}>
              Online
            </span>
            {(stats?.suspendedCount ?? 0) > 0 && (
              <span className={cn("text-[11px] font-semibold", isDark ? "text-red-400" : "text-red-600")}>
                ({stats?.suspendedCount} Suspended)
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-5 transition-all",
            isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              ALLOCATED COMPUTE
            </span>
            <div
              className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center",
                isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats ? `${stats.totalCpu} vCPU / ${stats.totalMemoryGb} GB` : "—"}
            </span>
          </div>
          <span className={cn("text-[11px] font-medium block mt-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>
            Est. Run Rate: {stats ? `${formatRupiah(stats.totalMonthlyRunRate)}/mo` : "—"}
          </span>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-5 transition-all",
            isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              KUBERNETES CAPACITY
            </span>
            <div
              className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center",
                isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats ? `${stats.totalInstances} / ${stats.maxInstances} Pods` : "—"}
            </span>
          </div>
          <span className={cn("text-[11px] font-medium block mt-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>
            Max: {stats ? `${stats.maxCpu} vCPU / ${stats.maxRamGb} GB RAM` : "—"}
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div
        className={cn(
          "rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4",
          isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-xs"
        )}
      >
        <div className="relative flex-1 min-w-0">
          <Search
            className={cn(
              "w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2",
              isDark ? "text-zinc-500" : "text-slate-400"
            )}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search app name, customer email, domain, repo or image..."
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors",
              isDark
                ? "bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500/50"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter */}
          <div className={cn("flex items-center gap-1 p-1 rounded-xl border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
            {(
              [
                { id: "ALL", label: "All Sources" },
                { id: "GIT", label: "Git Build" },
                { id: "IMAGE", label: "Docker Image" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedSource(opt.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                  selectedSource === opt.id
                    ? isDark
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-white text-cyan-700 border border-cyan-200 shadow-2xs"
                    : isDark
                      ? "text-zinc-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className={cn("flex flex-wrap items-center gap-1 p-1 rounded-xl border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
            {["ALL", "RUNNING", "BUILDING", "STOPPED", "SUSPENDED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                  selectedStatus === st
                    ? isDark
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-white text-cyan-700 border border-cyan-200 shadow-2xs"
                    : isDark
                      ? "text-zinc-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instances Table / Mobile Cards */}
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs"
        )}
      >
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={cn(
                  "border-b text-[11px] font-bold uppercase tracking-wider",
                  isDark ? "border-white/[0.08] bg-white/[0.02] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500"
                )}
              >
                <th className="py-3.5 px-4">Application &amp; Source</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Endpoint &amp; Port</th>
                <th className="py-3.5 px-4">Specs</th>
                <th className="py-3.5 px-4">Billing</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y text-xs", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                    Loading App Platform instances...
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No App Platform instances found matching filters.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className={cn("transition-colors", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/60")}
                  >
                    {/* Application & Source */}
                    <td className="py-3 px-4 max-w-[260px]">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                            isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                          )}
                        >
                          {app.isDirectImage ? <Container className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <span className={cn("font-bold text-sm block truncate", isDark ? "text-white" : "text-slate-900")}>
                            {app.name}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-mono block truncate",
                              isDark ? "text-zinc-400" : "text-slate-500"
                            )}
                            title={app.isDirectImage ? app.dockerImage || "" : `${app.gitUrl} (${app.branch})`}
                          >
                            {app.isDirectImage
                              ? app.dockerImage
                              : `${app.gitUrl.replace(/^https?:\/\//, "")} • ${app.branch}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/customers/${app.userId}`}
                        className={cn("font-semibold block hover:underline", isDark ? "text-zinc-200" : "text-slate-800")}
                      >
                        {app.customerName}
                      </Link>
                      <span className={cn("font-mono text-[11px] block", isDark ? "text-zinc-500" : "text-slate-500")}>
                        {app.customerEmail}
                      </span>
                    </td>

                    {/* Endpoint & Port */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(app.httpsUrl, `url-${app.id}`)}
                        className={cn(
                          "font-mono font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer",
                          isDark ? "text-cyan-400" : "text-cyan-700"
                        )}
                        title="Click to copy Web URL"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[180px]">{app.fullDomain}</span>
                        {copiedId === `url-${app.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60 shrink-0" />
                        )}
                      </button>
                      <span className={cn("text-[10px] font-mono block mt-0.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                        Port {app.appPort} → NodePort {app.port}
                      </span>
                    </td>

                    {/* Specs */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded font-mono text-[11px] font-semibold border",
                            isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                          )}
                        >
                          {app.cpuShares} vCPU
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded font-mono text-[11px] font-semibold border",
                            isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                          )}
                        >
                          {app.memoryMb >= 1024 ? `${app.memoryMb / 1024} GB` : `${app.memoryMb} MB`}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded font-mono text-[10px] font-medium border",
                            isDark ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]" : "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {app.storageGb} GB
                        </span>
                      </div>
                    </td>

                    {/* Billing */}
                    <td className="py-3 px-4">
                      <span className={cn("font-mono font-bold text-xs block", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        {formatRupiah(app.monthlyPrice)}/mo
                      </span>
                      <span className={cn("text-[10px] font-mono block", isDark ? "text-zinc-500" : "text-slate-500")}>
                        {app.billingMode} ({formatRupiah(app.hourlyRate)}/hr)
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {renderStatusBadge(app)}
                      {app.suspendReason && (
                        <span className="text-[10px] text-red-400 block mt-1 max-w-[130px] truncate" title={app.suspendReason}>
                          {app.suspendReason}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {app.status === "RUNNING" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAction(app.id, "stop")}
                              disabled={poweringId === app.id}
                              className={cn(
                                "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                                isDark
                                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                                  : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                              )}
                              title="Stop Application"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(app.id, "restart")}
                              disabled={poweringId === app.id}
                              className={cn(
                                "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                                isDark
                                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"
                                  : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                              )}
                              title="Restart Application"
                            >
                              <RotateCw className={cn("w-3.5 h-3.5", poweringId === app.id && "animate-spin")} />
                            </button>
                          </>
                        ) : app.status === "SUSPENDED" ? (
                          <button
                            type="button"
                            onClick={() => handleAction(app.id, "unsuspend")}
                            disabled={poweringId === app.id}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                              isDark
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            )}
                            title="Unsuspend Application"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAction(app.id, "start")}
                            disabled={poweringId === app.id}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                              isDark
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            )}
                            title="Start Application"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAction(app.id, "rebuild")}
                          disabled={poweringId === app.id}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                            isDark
                              ? "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                          title={app.isDirectImage ? "Refresh Image Deployment" : "Trigger Manual Rebuild"}
                        >
                          <Hammer className="w-3.5 h-3.5" />
                        </button>

                        {app.status !== "SUSPENDED" && (
                          <button
                            type="button"
                            onClick={() => handleAction(app.id, "suspend")}
                            disabled={poweringId === app.id}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                              isDark
                                ? "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
                                : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                            )}
                            title="Suspend Application"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <a
                          href={app.httpsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "p-1.5 rounded-lg border transition-all cursor-pointer",
                            isDark
                              ? "bg-white/5 border-white/10 hover:bg-white/10 text-cyan-300"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-cyan-700"
                          )}
                          title="Open Application Web URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => setDeleteModalItem(app)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all cursor-pointer",
                            isDark
                              ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                              : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                          )}
                          title="Terminate Application Instance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards (block md:hidden) */}
        <div className={cn("block md:hidden divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
          {loading ? (
            <div className="py-12 text-center text-zinc-500">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
              <span className="text-xs">Loading App Platform instances...</span>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No App Platform instances found matching filters.
            </div>
          ) : (
            filteredApps.map((app) => (
              <div key={app.id} className="p-4 space-y-3">
                {/* Card Top: Icon + Name + Status */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                        isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                      )}
                    >
                      {app.isDirectImage ? <Container className="w-5 h-5" /> : <GitBranch className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>
                        {app.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={cn("text-[10px] font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          {app.sourceLabel}
                        </span>
                        <span className="text-zinc-600 text-xs">•</span>
                        <span className={cn("font-mono font-bold text-[11px]", isDark ? "text-cyan-300" : "text-cyan-700")}>
                          {formatRupiah(app.monthlyPrice)}/mo
                        </span>
                      </div>
                    </div>
                  </div>

                  {renderStatusBadge(app)}
                </div>

                {/* Details Box */}
                <div
                  className={cn(
                    "p-2.5 rounded-xl border text-xs space-y-1.5",
                    isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200/80"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={cn("font-medium shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>Customer</span>
                    <Link
                      href={`/admin/customers/${app.userId}`}
                      className={cn("font-semibold truncate text-right hover:underline flex items-center gap-1", isDark ? "text-zinc-200" : "text-slate-800")}
                    >
                      <User className="w-3 h-3 shrink-0 opacity-70" />
                      <span className="truncate">{app.customerName}</span>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={cn("font-medium shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>Source</span>
                    <span className={cn("font-mono truncate text-right max-w-[200px]", isDark ? "text-zinc-300" : "text-slate-700")}>
                      {app.isDirectImage ? app.dockerImage : `${app.branch} • ${app.gitUrl.replace(/^https?:\/\//, "")}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={cn("font-medium shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>Endpoint</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(app.httpsUrl, `url-m-${app.id}`)}
                      className={cn(
                        "font-mono font-bold flex items-center gap-1 hover:underline cursor-pointer truncate max-w-[200px]",
                        isDark ? "text-cyan-400" : "text-cyan-700"
                      )}
                    >
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate">{app.fullDomain}</span>
                      {copiedId === `url-m-${app.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-60 shrink-0" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={cn("font-medium shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>Specs</span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded border font-semibold",
                          isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                        )}
                      >
                        {app.cpuShares} vCPU
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded border font-semibold",
                          isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                        )}
                      >
                        {app.memoryMb >= 1024 ? `${app.memoryMb / 1024} GB` : `${app.memoryMb} MB`}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded border font-semibold",
                          isDark ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                      >
                        {app.storageGb} GB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {app.status === "RUNNING" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction(app.id, "restart")}
                        disabled={poweringId === app.id}
                        className={cn(
                          "flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50",
                          isDark
                            ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20"
                            : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                        )}
                      >
                        <RotateCw className={cn("w-3.5 h-3.5", poweringId === app.id && "animate-spin")} />
                        <span>Restart</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(app.id, "stop")}
                        disabled={poweringId === app.id}
                        className={cn(
                          "py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50",
                          isDark
                            ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                        )}
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop</span>
                      </button>
                    </>
                  ) : app.status === "SUSPENDED" ? (
                    <button
                      type="button"
                      onClick={() => handleAction(app.id, "unsuspend")}
                      disabled={poweringId === app.id}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50",
                        isDark
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      )}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Unsuspend</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAction(app.id, "start")}
                      disabled={poweringId === app.id}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50",
                        isDark
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      )}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAction(app.id, "rebuild")}
                    disabled={poweringId === app.id}
                    className={cn(
                      "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center disabled:opacity-50",
                      isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                    )}
                    title={app.isDirectImage ? "Refresh Image" : "Rebuild"}
                  >
                    <Hammer className="w-3.5 h-3.5" />
                  </button>

                  {app.status !== "SUSPENDED" && (
                    <button
                      type="button"
                      onClick={() => handleAction(app.id, "suspend")}
                      disabled={poweringId === app.id}
                      className={cn(
                        "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center disabled:opacity-50",
                        isDark
                          ? "bg-orange-500/10 border-orange-500/25 text-orange-400 hover:bg-orange-500/20"
                          : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                      )}
                      title="Suspend Application"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <a
                    href={app.httpsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center",
                      isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-cyan-300"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-cyan-700"
                    )}
                    title="Open Application Web URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setDeleteModalItem(app)}
                    className={cn(
                      "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center",
                      isDark
                        ? "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
                        : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                    )}
                    title="Terminate Instance"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete / Terminate Confirmation Modal */}
      {deleteModalItem && (
        <ConfirmModal
          isOpen={!!deleteModalItem}
          onClose={() => setDeleteModalItem(null)}
          onConfirm={handleDelete}
          title="Terminate App Platform Instance"
          description={`Are you sure you want to terminate ${deleteModalItem.name} (${deleteModalItem.sourceLabel}) belonging to ${deleteModalItem.customerEmail}? This will permanently delete the Kubernetes deployment, service, ingress, and persistent storage.`}
          confirmText="Terminate Instance"
          cancelText="Cancel"
          variant="danger"
          icon={<Trash2 className="w-8 h-8" />}
          isLoading={deleting}
        />
      )}
    </div>
  );
}
