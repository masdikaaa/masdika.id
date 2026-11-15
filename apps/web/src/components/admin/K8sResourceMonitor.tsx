"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Ban,
  Boxes,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  Eye,
  HardDrive,
  Mail,
  Play,
  RotateCw,
  Search,
  Server,
  ShieldAlert,
  SlidersHorizontal,
  Square,
  User,
  X,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Select, SelectOption } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { K8sResourceItem, K8sResourceSummary } from "@/app/api/admin/resource-finding/k8s/route";
import type { K8sNodeLiveMetric } from "@/lib/k8s-metrics";

interface K8sResourceMonitorProps {
  kind: "database" | "app";
  summary: K8sResourceSummary;
  items: K8sResourceItem[];
  clusterNodes: K8sNodeLiveMetric[];
  metricsAvailable: boolean;
  clusterError: string | null;
  onRefresh: () => Promise<void> | void;
}

type K8sFilterTab = "ALL" | "CRITICAL" | "HIGH_CPU" | "HIGH_RAM" | "RESTARTS" | "OFFLINE";
type K8sSortOption = "CPU_DESC" | "RAM_DESC" | "RESTARTS_DESC" | "DISK_DESC" | "NEWEST";

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0 || Number.isNaN(bytes)) return "0 B";
  const k = 1024;
  const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function formatMillicores(m: number): string {
  if (!m || m <= 0) return "0m";
  return m >= 1000 ? `${(m / 1000).toFixed(2)}c` : `${Math.round(m)}m`;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getBarColor(pct: number, warnAt: number, critAt: number): string {
  if (pct >= critAt) return "bg-rose-500";
  if (pct >= warnAt) return "bg-amber-500";
  return "bg-cyan-500";
}

function getMetricTextColor(pct: number, warnAt: number, critAt: number, isDark: boolean): string {
  if (pct >= critAt) return "text-rose-500";
  if (pct >= warnAt) return "text-amber-500";
  return isDark ? "text-zinc-200" : "text-slate-800";
}

export function K8sResourceMonitor({
  kind,
  summary,
  items,
  clusterNodes,
  metricsAvailable,
  clusterError,
  onRefresh,
}: K8sResourceMonitorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isDb = kind === "database";
  const entityLabel = isDb ? "Database" : "App";

  const [activeTab, setActiveTab] = useState<K8sFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<K8sSortOption>("RAM_DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<K8sResourceItem | null>(null);
  const [suspendItem, setSuspendItem] = useState<K8sResourceItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "danger" | "warning" | "success";
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    variant: "warning",
    onConfirm: async () => {},
  });

  const itemsPerPage = 15;

  const sortOptions: SelectOption[] = [
    { value: "RAM_DESC", label: "Highest RAM (%)" },
    { value: "CPU_DESC", label: "Highest CPU (%)" },
    { value: "RESTARTS_DESC", label: "Most Restarts" },
    { value: "DISK_DESC", label: "Largest Disk (GiB)" },
    { value: "NEWEST", label: "Newest Deployed" },
  ];

  const copyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(text);
    toast.success(`Copied ${text}`);
    setTimeout(() => setCopiedEndpoint(null), 1800);
  };

  const handlePowerAction = async (item: K8sResourceItem, action: "start" | "stop" | "restart") => {
    const endpoint = item.kind === "database" ? "/api/admin/database" : "/api/admin/apps";
    const toastId = toast.loading(`Executing ${action} on ${item.name}...`);
    setActionLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `${item.name} ${action} complete`, { id: toastId });
        await onRefresh();
      } else {
        toast.error(data.error || `Failed to ${action} ${item.name}`, { id: toastId });
      }
    } catch {
      toast.error(`Network error while sending ${action}`, { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendToggle = async (item: K8sResourceItem, suspend: boolean, reason?: string) => {
    const serviceType = item.kind === "database" ? "database" : "apps";
    const toastId = toast.loading(
      suspend ? `Suspending ${item.name} & scaling pod to 0...` : `Reactivating ${item.name}...`
    );
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceType}/${item.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suspend,
          reason:
            reason ||
            `[RESOURCE_LIMIT] Sustained high CPU/RAM or OOM events (${item.memPercent.toFixed(1)}% RAM). Suspended by administrator.`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          suspend
            ? `${item.name} suspended (3-day grace period notified)`
            : `${item.name} unsuspended & restored`,
          { id: toastId }
        );
        setSuspendItem(null);
        setSuspendReason("");
        await onRefresh();
      } else {
        toast.error(data.error || "Failed to update service status", { id: toastId });
      }
    } catch {
      toast.error("Network error updating service status", { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (activeTab === "CRITICAL" && item.severity !== "CRITICAL") return false;
        if (activeTab === "HIGH_CPU" && item.cpuPercent < 60) return false;
        if (activeTab === "HIGH_RAM" && item.memPercent < 75) return false;
        if (activeTab === "RESTARTS" && item.restarts === 0 && !item.oomKilled) return false;
        if (activeTab === "OFFLINE" && item.isOnline && item.dbStatus !== "SUSPENDED") return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            item.name.toLowerCase().includes(q) ||
            item.subtitle.toLowerCase().includes(q) ||
            item.podName.toLowerCase().includes(q) ||
            item.endpoint.toLowerCase().includes(q) ||
            item.nodeName.toLowerCase().includes(q) ||
            item.user.name.toLowerCase().includes(q) ||
            item.user.email.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "CPU_DESC":
            return b.cpuPercent - a.cpuPercent;
          case "RAM_DESC":
            return b.memPercent - a.memPercent;
          case "RESTARTS_DESC":
            return b.restarts - a.restarts;
          case "DISK_DESC":
            return b.storageGb - a.storageGb;
          case "NEWEST":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
  }, [items, activeTab, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Cluster Alert Banner if Offline or Metrics Server Disabled */}
      {(clusterError || (!metricsAvailable && items.length > 0)) && (
        <div
          className={cn(
            "p-3.5 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm",
            clusterError
              ? isDark
                ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                : "bg-rose-50 border-rose-200 text-rose-800"
              : isDark
              ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
              : "bg-amber-50 border-amber-200 text-amber-800"
          )}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">
              {clusterError
                ? `${entityLabel} Cluster Connection Issue`
                : "Kubernetes Metrics Server Unavailable"}
            </p>
            <p className="text-xs opacity-85 mt-0.5">
              {clusterError ||
                "Pod lifecycle & restarts are shown, while live CPU/RAM metrics require metrics-server running in kube-system."}
            </p>
          </div>
        </div>
      )}

      {/* Kubernetes Node Health Bar */}
      {clusterNodes.length > 0 && (
        <div
          className={cn(
            "p-4 rounded-2xl border",
            isDark ? "bg-[#0c0c0e] border-white/10" : "bg-white border-slate-200"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-500 shrink-0" />
              <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                Kubernetes Cluster Node Health
              </span>
            </div>
            <span className={cn("text-[11px] font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
              Allocated Workload Quota: {summary.allocatedCpu}c / {formatBytes(summary.allocatedMemBytes)} RAM / {summary.allocatedStorageGb} GiB Storage
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clusterNodes.map((node) => (
              <div
                key={node.name}
                className={cn(
                  "p-3 rounded-xl border space-y-2.5",
                  isDark ? "bg-black/30 border-white/[0.07]" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        node.ready ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                      )}
                    />
                    <span className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                      {node.name}
                    </span>
                    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0", isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-white border-slate-200 text-slate-600")}>
                      {node.kubeletVersion}
                    </span>
                  </div>
                  <span className={cn("text-[11px] font-mono shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {node.podCount} pods
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Node CPU</span>
                      <span className={cn("font-mono font-bold", getMetricTextColor(node.cpuPercent, 60, 80, isDark))}>
                        {node.cpuPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                      <div
                        className={cn("h-full transition-all", getBarColor(node.cpuPercent, 60, 80))}
                        style={{ width: `${Math.min(node.cpuPercent, 100)}%` }}
                      />
                    </div>
                    <div className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>
                      {formatMillicores(node.cpuUsageMillicores)} / {formatMillicores(node.cpuCapacityMillicores)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Node RAM</span>
                      <span className={cn("font-mono font-bold", getMetricTextColor(node.memPercent, 75, 90, isDark))}>
                        {node.memPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                      <div
                        className={cn("h-full transition-all", getBarColor(node.memPercent, 75, 90))}
                        style={{ width: `${Math.min(node.memPercent, 100)}%` }}
                      />
                    </div>
                    <div className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>
                      {formatBytes(node.memUsageBytes)} / {formatBytes(node.memCapacityBytes)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Top KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Critical / OOM Alerts */}
        <div
          onClick={() => {
            setActiveTab(activeTab === "CRITICAL" ? "ALL" : "CRITICAL");
            setCurrentPage(1);
          }}
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
            activeTab === "CRITICAL"
              ? isDark
                ? "border-cyan-500/60 ring-2 ring-cyan-500/30 bg-cyan-500/[0.04]"
                : "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/40"
              : isDark
              ? "bg-[#0c0c0e] border-white/10 hover:border-cyan-500/30"
              : "bg-white border-slate-200 hover:border-cyan-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              Critical / OOM
            </span>
            <div
              className={cn(
                "p-2 rounded-xl border shrink-0",
                summary.criticalCount > 0
                  ? isDark
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                  : isDark
                  ? "bg-white/5 border-white/10 text-zinc-400"
                  : "bg-slate-100 border-slate-200 text-slate-600"
              )}
            >
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {summary.criticalCount}
            </span>
            {summary.criticalCount > 0 && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
            )}
          </div>
          <p className={cn("text-[11px] sm:text-xs mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            OOMKilled, CrashLoop, CPU ≥ 80%
          </p>
        </div>

        {/* Card 2: High CPU Pods */}
        <div
          onClick={() => {
            setActiveTab(activeTab === "HIGH_CPU" ? "ALL" : "HIGH_CPU");
            setCurrentPage(1);
          }}
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer",
            activeTab === "HIGH_CPU"
              ? isDark
                ? "border-cyan-500/60 ring-2 ring-cyan-500/30 bg-cyan-500/[0.04]"
                : "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/40"
              : isDark
              ? "bg-[#0c0c0e] border-white/10 hover:border-cyan-500/30"
              : "bg-white border-slate-200 hover:border-cyan-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              High CPU Load
            </span>
            <div className={cn("p-2 rounded-xl border shrink-0", isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200")}>
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {summary.highCpuCount}
            </span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-400")}>/ {summary.runningCount} ready</span>
          </div>
          <p className={cn("text-[11px] sm:text-xs mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            Live: {formatMillicores(summary.usedCpuMillicores)} / {summary.allocatedCpu}c quota
          </p>
        </div>

        {/* Card 3: High RAM Usage */}
        <div
          onClick={() => {
            setActiveTab(activeTab === "HIGH_RAM" ? "ALL" : "HIGH_RAM");
            setCurrentPage(1);
          }}
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer",
            activeTab === "HIGH_RAM"
              ? isDark
                ? "border-cyan-500/60 ring-2 ring-cyan-500/30 bg-cyan-500/[0.04]"
                : "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/40"
              : isDark
              ? "bg-[#0c0c0e] border-white/10 hover:border-cyan-500/30"
              : "bg-white border-slate-200 hover:border-cyan-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              High RAM Usage
            </span>
            <div className={cn("p-2 rounded-xl border shrink-0", isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200")}>
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {summary.highRamCount}
            </span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-400")}>/ {summary.runningCount} ready</span>
          </div>
          <p className={cn("text-[11px] sm:text-xs mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            Live: {formatBytes(summary.usedMemBytes)} / {formatBytes(summary.allocatedMemBytes)}
          </p>
        </div>

        {/* Card 4: Pod Restarts & Storage */}
        <div
          onClick={() => {
            setActiveTab(activeTab === "RESTARTS" ? "ALL" : "RESTARTS");
            setCurrentPage(1);
          }}
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer",
            activeTab === "RESTARTS"
              ? isDark
                ? "border-cyan-500/60 ring-2 ring-cyan-500/30 bg-cyan-500/[0.04]"
                : "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/40"
              : isDark
              ? "bg-[#0c0c0e] border-white/10 hover:border-cyan-500/30"
              : "bg-white border-slate-200 hover:border-cyan-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              Pod Restarts
            </span>
            <div className={cn("p-2 rounded-xl border shrink-0", isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200")}>
              <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {summary.totalRestarts}
            </span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-400")}>
              ({summary.oomCount} OOM)
            </span>
          </div>
          <p className={cn("text-[11px] sm:text-xs mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            PVC Allocated: {summary.allocatedStorageGb} GiB
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search / Sort Bar */}
      <div className={cn("p-4 rounded-2xl border space-y-4 relative z-20", isDark ? "bg-[#0c0c0e] border-white/10" : "bg-white border-slate-200")}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-none">
          {[
            { id: "ALL", label: isDb ? "All Databases" : "All Apps", count: summary.totalCount },
            { id: "CRITICAL", label: "Critical / OOM", count: summary.criticalCount },
            { id: "HIGH_CPU", label: "High CPU (>60%)", count: summary.highCpuCount },
            { id: "HIGH_RAM", label: "High RAM (>75%)", count: summary.highRamCount },
            { id: "RESTARTS", label: "Restarts (>0)", count: summary.restartAlertCount },
            { id: "OFFLINE", label: "Offline / Suspended", count: summary.totalCount - summary.runningCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as K8sFilterTab);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                  isActive
                    ? isDark
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                      : "bg-cyan-50 border-cyan-300 text-cyan-800"
                    : isDark
                    ? "bg-white/5 border-transparent text-zinc-400 hover:text-white hover:bg-white/10"
                    : "bg-slate-50 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[11px] font-bold",
                    isActive
                      ? isDark
                        ? "bg-cyan-500/30 text-cyan-200"
                        : "bg-cyan-200 text-cyan-900"
                      : isDark
                      ? "bg-white/10 text-zinc-400"
                      : "bg-slate-200 text-slate-600"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder={
                isDb
                  ? "Search DB name, Engine, Customer, Pod, Host:Port..."
                  : "Search App name, Template, Customer, Pod, Subdomain..."
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-colors",
                isDark
                  ? "bg-black/30 border-white/10 text-white placeholder-zinc-500 focus:border-cyan-500/50"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
            <span className={cn("text-xs font-medium whitespace-nowrap hidden sm:inline", isDark ? "text-zinc-400" : "text-slate-600")}>
              Sort:
            </span>
            <div className="w-full sm:w-56 shrink-0 relative z-30">
              <Select
                value={sortBy}
                onChange={(val) => setSortBy(val as K8sSortOption)}
                options={sortOptions}
                className="py-2.5 px-3.5 text-xs sm:text-sm font-semibold rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="block lg:hidden space-y-3">
        {paginatedItems.length === 0 ? (
          <div className={cn("p-10 rounded-2xl border text-center", isDark ? "bg-[#0c0c0e] border-white/10" : "bg-white border-slate-200")}>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
              No {entityLabel} matches this filter
            </p>
            <p className="text-xs text-zinc-500 mt-1">All active {entityLabel.toLowerCase()} pods are healthy.</p>
          </div>
        ) : (
          paginatedItems.map((item) => {
            const cpuBar = getBarColor(item.cpuPercent, 60, 80);
            const memBar = getBarColor(item.memPercent, 75, 90);
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className={cn(
                  "p-4 rounded-2xl border space-y-3 transition-colors",
                  item.severity === "CRITICAL"
                    ? isDark
                      ? "bg-rose-500/[0.04] border-rose-500/30"
                      : "bg-rose-50/60 border-rose-200"
                    : isDark
                    ? "bg-[#0c0c0e] border-white/10"
                    : "bg-white border-slate-200"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>
                        {item.name}
                      </span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border whitespace-nowrap", isDark ? "bg-white/5 border-white/10 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                        {item.subtitle}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className={cn("font-medium truncate", isDark ? "text-zinc-200" : "text-slate-800")}>
                          {item.user.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className={cn("text-[11px] truncate font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
                          {item.user.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status + Severity */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0",
                        item.isOnline
                          ? isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.dbStatus === "SUSPENDED" || item.oomKilled || item.podPhase === "CrashLoopBackOff"
                          ? isDark
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                          : isDark
                          ? "bg-white/5 text-zinc-400 border-white/10"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          item.isOnline
                            ? "bg-emerald-500 animate-pulse"
                            : item.dbStatus === "SUSPENDED" || item.oomKilled
                            ? "bg-rose-500"
                            : "bg-zinc-500"
                        )}
                      />
                      {item.dbStatus === "SUSPENDED" ? "Suspended" : item.podPhase}
                    </span>
                    {item.oomKilled && (
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border", isDark ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-200")}>
                        OOMKilled
                      </span>
                    )}
                  </div>
                </div>

                {/* Endpoint & Restarts Bar */}
                <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => copyEndpoint(item.endpoint)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold truncate max-w-[65%]",
                      isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-200" : "bg-slate-100 border-slate-200 text-slate-800"
                    )}
                  >
                    <span className="truncate">{item.endpoint}</span>
                    {copiedEndpoint === item.endpoint ? (
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 text-zinc-400 shrink-0" />
                    )}
                  </button>
                  <div className="text-[11px] font-mono shrink-0">
                    <span className={item.restarts > 0 ? "text-amber-400 font-bold" : "text-zinc-400"}>
                      {item.restarts} restarts
                    </span>
                    <span className="text-zinc-500 mx-1">•</span>
                    <span className="text-zinc-400">{formatUptime(item.uptime)}</span>
                  </div>
                </div>

                {/* Metrics Box */}
                <div className={cn("p-3 rounded-xl border space-y-2.5 text-xs", isDark ? "bg-black/25 border-white/5" : "bg-slate-50 border-slate-200")}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                          CPU ({item.cpuShares}c)
                        </span>
                        <span className={cn("font-bold font-mono", getMetricTextColor(item.cpuPercent, 60, 80, isDark))}>
                          {item.cpuPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                        <div className={cn("h-full transition-all", cpuBar)} style={{ width: `${Math.min(item.cpuPercent, 100)}%` }} />
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {formatMillicores(item.cpuMillicores)} / {formatMillicores(item.cpuLimitMillicores)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                          RAM ({item.memoryMb}MB)
                        </span>
                        <span className={cn("font-bold font-mono", getMetricTextColor(item.memPercent, 75, 90, isDark))}>
                          {item.memPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                        <div className={cn("h-full transition-all", memBar)} style={{ width: `${Math.min(item.memPercent, 100)}%` }} />
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {formatBytes(item.memBytes)} / {formatBytes(item.maxMemBytes)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <button
                    onClick={() => setInspectItem(item)}
                    className={cn("h-9 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer", isDark ? "bg-white/5 border-white/10 text-zinc-200 hover:text-cyan-300" : "bg-white border-slate-200 text-slate-700")}
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Inspect</span>
                  </button>
                  {item.isOnline ? (
                    <button
                      onClick={() => handlePowerAction(item, "restart")}
                      className={cn("h-9 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer", isDark ? "bg-white/5 border-white/10 text-zinc-200" : "bg-white border-slate-200 text-slate-700")}
                    >
                      <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Restart</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePowerAction(item, "start")}
                      className={cn("h-9 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700")}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start</span>
                    </button>
                  )}
                  <button
                    disabled={!item.isOnline}
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        title: `Stop ${item.name}?`,
                        description: `Scale ${item.podName} deployment replicas down to 0?`,
                        confirmText: "Stop Pod",
                        variant: "warning",
                        onConfirm: async () => handlePowerAction(item, "stop"),
                      })
                    }
                    className={cn("h-9 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1", !item.isOnline ? "opacity-35 cursor-not-allowed border-white/5 text-zinc-500" : isDark ? "bg-white/5 border-white/10 text-zinc-200 cursor-pointer" : "bg-white border-slate-200 text-slate-700 cursor-pointer")}
                  >
                    <Square className="w-3 h-3 text-rose-400" />
                    <span>Stop</span>
                  </button>
                  <button
                    onClick={() =>
                      item.dbStatus === "SUSPENDED"
                        ? handleSuspendToggle(item, false)
                        : setSuspendItem(item)
                    }
                    className={cn(
                      "h-9 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer",
                      item.dbStatus === "SUSPENDED"
                        ? isDark
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : isDark
                        ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    )}
                  >
                    <Ban className="w-3 h-3" />
                    <span>{item.dbStatus === "SUSPENDED" ? "Restore" : "Suspend"}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className={cn("hidden lg:block rounded-2xl border overflow-hidden shadow-sm", isDark ? "bg-[#0c0c0e] border-white/10" : "bg-white border-slate-200")}>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700/40 scrollbar-track-transparent">
          <table className="w-full min-w-[1260px] text-left text-sm border-collapse">
            <thead>
              <tr className={cn("border-b text-[11px] uppercase font-bold tracking-wider select-none", isDark ? "bg-white/[0.02] border-white/10 text-zinc-400" : "bg-slate-50/80 border-slate-200 text-slate-500")}>
                <th className="py-3.5 px-4 min-w-[230px]">{entityLabel} & Customer</th>
                <th className="py-3.5 px-4 min-w-[210px]">Endpoint & Pod</th>
                <th className="py-3.5 px-4 min-w-[170px]">CPU Load</th>
                <th className="py-3.5 px-4 min-w-[190px]">Memory (RAM)</th>
                <th className="py-3.5 px-4 min-w-[150px]">Storage & Restarts</th>
                <th className="py-3.5 px-4 text-center min-w-[120px]">Pod State</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">Severity</th>
                <th className="py-3.5 px-4 text-right min-w-[250px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                        No High Resource {entityLabel} Pods Found
                      </h3>
                      <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                        All active customer {entityLabel.toLowerCase()} pods are operating smoothly.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const cpuBar = getBarColor(item.cpuPercent, 60, 80);
                  const memBar = getBarColor(item.memPercent, 75, 90);
                  return (
                    <tr
                      key={`${item.kind}-${item.id}`}
                      className={cn(
                        "transition-colors",
                        item.severity === "CRITICAL"
                          ? isDark
                            ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06]"
                            : "bg-rose-50/50 hover:bg-rose-50"
                          : isDark
                          ? "hover:bg-white/[0.02]"
                          : "hover:bg-slate-50/70"
                      )}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-bold truncate max-w-[150px]", isDark ? "text-white" : "text-slate-900")}>
                            {item.name}
                          </span>
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border whitespace-nowrap", isDark ? "bg-white/5 border-white/10 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                            {item.subtitle}
                          </span>
                        </div>
                        <div className={cn("text-xs mt-1 truncate max-w-[220px]", isDark ? "text-zinc-300" : "text-slate-700")}>
                          {item.user.id ? (
                            <Link href={`/admin/customers/${item.user.id}`} className="hover:text-cyan-400 transition-colors">
                              {item.user.name}
                            </Link>
                          ) : (
                            item.user.name
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 truncate max-w-[220px]">{item.user.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => copyEndpoint(item.endpoint)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-mono font-semibold max-w-[210px] cursor-pointer",
                            isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:border-cyan-500/40" : "bg-slate-100 border-slate-200 text-slate-800"
                          )}
                          title={item.endpoint}
                        >
                          <span className="truncate">{item.endpoint}</span>
                          {copiedEndpoint === item.endpoint ? (
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 text-zinc-400 shrink-0" />
                          )}
                        </button>
                        <div className="text-[11px] font-mono text-zinc-500 mt-1 truncate max-w-[210px]" title={item.podName}>
                          {item.podName !== "-" ? `${item.podName} (${item.podIp})` : "No active pod"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={cn("font-bold font-mono", getMetricTextColor(item.cpuPercent, 60, 80, isDark))}>
                            {item.cpuPercent.toFixed(1)}%
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {formatMillicores(item.cpuMillicores)} / {item.cpuShares}c
                          </span>
                        </div>
                        <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                          <div className={cn("h-full transition-all", cpuBar)} style={{ width: `${Math.min(item.cpuPercent, 100)}%` }} />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={cn("font-bold font-mono", getMetricTextColor(item.memPercent, 75, 90, isDark))}>
                            {item.memPercent.toFixed(1)}%
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {formatBytes(item.memBytes)} / {formatBytes(item.maxMemBytes)}
                          </span>
                        </div>
                        <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                          <div className={cn("h-full transition-all", memBar)} style={{ width: `${Math.min(item.memPercent, 100)}%` }} />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className={cn("font-semibold", isDark ? "text-zinc-200" : "text-slate-800")}>
                          {item.storageGb} GiB PVC
                        </div>
                        <div className="text-[11px] mt-0.5 flex items-center gap-1.5">
                          <span className={item.restarts > 0 ? "text-amber-400 font-bold" : "text-zinc-500"}>
                            {item.restarts} restarts
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-500">{formatUptime(item.uptime)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap",
                            item.isOnline
                              ? isDark
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.dbStatus === "SUSPENDED" || item.oomKilled
                              ? isDark
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                              : isDark
                              ? "bg-white/5 text-zinc-400 border-white/10"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", item.isOnline ? "bg-emerald-500 animate-pulse" : item.oomKilled ? "bg-rose-500" : "bg-zinc-500")} />
                          {item.dbStatus === "SUSPENDED" ? "Suspended" : item.podPhase}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.severity === "CRITICAL" ? (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border", isDark ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-200")}>
                            {item.oomKilled ? "OOM" : "Critical"}
                          </span>
                        ) : item.severity === "WARNING" ? (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border", isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")}>
                            Warning
                          </span>
                        ) : item.severity === "OFFLINE" ? (
                          <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border", isDark ? "bg-white/5 text-zinc-500 border-white/10" : "bg-slate-100 text-slate-500 border-slate-200")}>
                            Offline
                          </span>
                        ) : (
                          <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border", isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectItem(item)}
                            className={cn("p-2 rounded-lg border transition-colors cursor-pointer", isDark ? "bg-white/5 border-white/10 text-zinc-300 hover:text-cyan-400" : "bg-white border-slate-200 text-slate-600 hover:text-cyan-700")}
                            title="Inspect Pod Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {item.isOnline ? (
                            <button
                              disabled={actionLoading}
                              onClick={() => handlePowerAction(item, "restart")}
                              className={cn("p-2 rounded-lg border transition-colors cursor-pointer", isDark ? "bg-white/5 border-white/10 text-zinc-300 hover:text-cyan-400" : "bg-white border-slate-200 text-slate-600")}
                              title="Restart Pod"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled={actionLoading}
                              onClick={() => handlePowerAction(item, "start")}
                              className={cn("p-2 rounded-lg border transition-colors cursor-pointer", isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}
                              title="Start Pod"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            disabled={!item.isOnline || actionLoading}
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                title: `Stop ${item.name}?`,
                                description: `Scale ${item.podName} deployment replicas to 0?`,
                                confirmText: "Stop Pod",
                                variant: "warning",
                                onConfirm: async () => handlePowerAction(item, "stop"),
                              })
                            }
                            className={cn("p-2 rounded-lg border transition-colors", !item.isOnline ? "opacity-35 cursor-not-allowed border-white/5 text-zinc-500" : isDark ? "bg-white/5 border-white/10 text-zinc-300 hover:text-amber-400 cursor-pointer" : "bg-white border-slate-200 text-slate-600 cursor-pointer")}
                            title="Stop Pod"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() =>
                              item.dbStatus === "SUSPENDED"
                                ? handleSuspendToggle(item, false)
                                : setSuspendItem(item)
                            }
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                              item.dbStatus === "SUSPENDED"
                                ? isDark
                                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20"
                                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : isDark
                                ? "bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20"
                                : "bg-rose-50 border-rose-200 text-rose-700"
                            )}
                          >
                            {item.dbStatus === "SUSPENDED" ? "Unsuspend" : "Suspend"}
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

      {/* Pagination */}
      {filteredItems.length > itemsPerPage && (
        <div className={cn("p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3", isDark ? "bg-[#0c0c0e] border-white/10" : "bg-white border-slate-200")}>
          <div className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
            Showing <span className="font-semibold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold text-white">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of{" "}
            <span className="font-semibold text-white">{filteredItems.length}</span> workloads
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} />
        </div>
      )}

      {/* Inspect Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className={cn("w-full max-w-xl rounded-2xl border p-6 space-y-4 shadow-2xl", isDark ? "bg-[#0c0c0e] border-white/15 text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {inspectItem.kind === "database" ? (
                    <Database className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Boxes className="w-5 h-5 text-cyan-400" />
                  )}
                  <h3 className="text-lg font-bold">{inspectItem.name}</h3>
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                    {inspectItem.subtitle}
                  </span>
                </div>
                <p className={cn("text-xs font-mono mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Namespace: {inspectItem.namespace} • Pod: {inspectItem.podName}
                </p>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className={cn("p-1.5 rounded-lg border", isDark ? "border-white/10 hover:bg-white/10" : "border-slate-200 hover:bg-slate-100")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={cn("p-3 rounded-xl border", isDark ? "bg-black/30 border-white/10" : "bg-slate-50 border-slate-200")}>
                <div className="text-zinc-500 mb-1">CPU Utilization</div>
                <div className={cn("text-base font-bold font-mono", getMetricTextColor(inspectItem.cpuPercent, 60, 80, isDark))}>
                  {inspectItem.cpuPercent.toFixed(1)}%
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  {formatMillicores(inspectItem.cpuMillicores)} / {formatMillicores(inspectItem.cpuLimitMillicores)} ({inspectItem.cpuShares}c)
                </div>
              </div>
              <div className={cn("p-3 rounded-xl border", isDark ? "bg-black/30 border-white/10" : "bg-slate-50 border-slate-200")}>
                <div className="text-zinc-500 mb-1">Memory (RAM)</div>
                <div className={cn("text-base font-bold font-mono", getMetricTextColor(inspectItem.memPercent, 75, 90, isDark))}>
                  {inspectItem.memPercent.toFixed(1)}%
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  {formatBytes(inspectItem.memBytes)} / {formatBytes(inspectItem.maxMemBytes)}
                </div>
              </div>
              <div className={cn("p-3 rounded-xl border", isDark ? "bg-black/30 border-white/10" : "bg-slate-50 border-slate-200")}>
                <div className="text-zinc-500 mb-1">Container Health</div>
                <div className="font-bold">{inspectItem.podPhase}</div>
                <div className="text-[11px] text-zinc-400">
                  Restarts: {inspectItem.restarts} {inspectItem.oomKilled ? "• OOMKilled" : ""}
                </div>
              </div>
              <div className={cn("p-3 rounded-xl border", isDark ? "bg-black/30 border-white/10" : "bg-slate-50 border-slate-200")}>
                <div className="text-zinc-500 mb-1">Node & Network</div>
                <div className="font-bold font-mono truncate">{inspectItem.nodeName}</div>
                <div className="text-[11px] font-mono text-zinc-400 truncate">Pod IP: {inspectItem.podIp}</div>
              </div>
            </div>

            {inspectItem.suspendReason && (
              <div className={cn("p-3 rounded-xl border text-xs", isDark ? "bg-rose-500/10 border-rose-500/25 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700")}>
                <span className="font-bold">Suspend Reason:</span> {inspectItem.suspendReason}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {inspectItem.user.id > 0 ? (
                <Link
                  href={`/admin/customers/${inspectItem.user.id}`}
                  className="text-xs font-semibold text-cyan-400 hover:underline"
                >
                  Open Customer Profile →
                </Link>
              ) : (
                <span />
              )}
              <button
                onClick={() => setInspectItem(null)}
                className={cn("px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer", isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-slate-100 border-slate-200")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className={cn("w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl", isDark ? "bg-[#0c0c0e] border-white/15 text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Suspend {suspendItem.name}</h3>
              <button onClick={() => setSuspendItem(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              Pod replicas will be scaled to 0 immediately, a 3-day grace period deadline will be recorded, and suspension notifications will be sent to both customer and admin.
            </p>
            <textarea
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder={`Reason for suspending ${suspendItem.name}...`}
              className={cn("w-full p-3 rounded-xl text-xs border outline-none", isDark ? "bg-black/40 border-white/10 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900")}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSuspendItem(null)}
                className={cn("px-4 py-2 rounded-xl text-xs font-semibold border", isDark ? "border-white/10 text-zinc-300" : "border-slate-200 text-slate-700")}
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleSuspendToggle(suspendItem, true, suspendReason)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white cursor-pointer"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
      />
    </div>
  );
}
