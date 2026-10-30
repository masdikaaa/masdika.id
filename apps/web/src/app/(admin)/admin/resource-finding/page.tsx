"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  Cpu,
  Network,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Copy,
  ExternalLink,
  Power,
  PowerOff,
  RotateCw,
  Play,
  Square,
  Ban,
  X,
  Server,
  User,
  Mail,
  Clock,
  ArrowDown,
  ArrowUp,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronRight,
  HardDrive,
  Eye,
  Gauge,
  Wifi,
  WifiOff,
  Info,
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
import { useTheme } from "@/components/ThemeProvider";
import { AdminLoader } from "@/components/admin/AdminLoader";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select, SelectOption } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VpsResourceItem {
  id: number;
  vmid: number | null;
  hostname: string;
  osTemplate: string;
  node: string;
  dbStatus: string;
  liveStatus: string;
  isOnline: boolean;
  primaryIp: string;
  cpuPercent: number;
  cpuCores: number;
  memBytes: number;
  maxMemBytes: number;
  memPercent: number;
  diskBytes: number;
  maxDiskBytes: number;
  diskPercent: number;
  netIn: number;
  netOut: number;
  totalBandwidth: number;
  netSpeedIn: number; // Real-time Bytes/sec matching Proxmox GUI graph
  netSpeedOut: number; // Real-time Bytes/sec
  netSpeedTotal: number;
  rateLimit?: number | null; // in MB/s
  isThrottled?: boolean;
  isNetDisabled?: boolean;
  uptime: number;
  severity: "CRITICAL" | "WARNING" | "NORMAL" | "OFFLINE";
  suspendReason?: string | null;
  createdAt: string;
  user: {
    id?: number;
    name: string;
    email: string;
    image?: string | null;
  };
}

interface SummaryData {
  totalVps: number;
  runningCount: number;
  criticalCount: number;
  warningCount: number;
  highCpuCount: number;
  highRamCount: number;
  highNetCount: number;
  throttledCount?: number;
  netDisabledCount?: number;
  totalNetIn: number;
  totalNetOut: number;
  totalBandwidth: number;
  totalNetSpeedIn: number;
  totalNetSpeedOut: number;
}

type FilterTab = "ALL" | "CRITICAL" | "WARNING" | "HIGH_CPU" | "HIGH_RAM" | "HIGH_NET" | "THROTTLED" | "ISOLATED" | "OFFLINE";
type SortOption = "CPU_DESC" | "RAM_DESC" | "NET_SPEED_DESC" | "NET_DESC" | "DISK_DESC" | "VMID_ASC" | "VMID_DESC";

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0 || isNaN(bytesPerSec)) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(1024));
  const clampedI = Math.min(Math.max(i, 0), units.length - 1);
  const val = bytesPerSec / Math.pow(1024, clampedI);
  return `${val >= 100 || clampedI === 0 ? Math.round(val) : val.toFixed(1)} ${units[clampedI]}`;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

function formatUptime(seconds: number) {
  if (!seconds || seconds <= 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function AdminResourceFindingPage() {
  const sortOptions: SelectOption[] = [
    { value: "CPU_DESC", label: "Highest CPU (%)" },
    { value: "RAM_DESC", label: "Highest RAM (%)" },
    { value: "NET_SPEED_DESC", label: "Highest Network Speed" },
    { value: "NET_DESC", label: "Highest Total Bandwidth" },
    { value: "DISK_DESC", label: "Highest Disk (%)" },
    { value: "VMID_ASC", label: "VMID (Ascending)" },
    { value: "VMID_DESC", label: "VMID (Descending)" },
  ];

  const refreshOptions: SelectOption[] = [
    { value: 0, label: "Refresh: Off" },
    { value: 15, label: "Refresh: 15s" },
    { value: 30, label: "Refresh: 30s" },
    { value: 60, label: "Refresh: 60s" },
  ];
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // in seconds, 0 = off

  const [summary, setSummary] = useState<SummaryData>({
    totalVps: 0,
    runningCount: 0,
    criticalCount: 0,
    warningCount: 0,
    highCpuCount: 0,
    highRamCount: 0,
    highNetCount: 0,
    totalNetIn: 0,
    totalNetOut: 0,
    totalBandwidth: 0,
    totalNetSpeedIn: 0,
    totalNetSpeedOut: 0,
  });
  const [vpsList, setVpsList] = useState<VpsResourceItem[]>([]);

  // Filtering & Search
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("CPU_DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Inspect Modal State
  const [inspectVps, setInspectVps] = useState<VpsResourceItem | null>(null);
  const [inspectTimeframe, setInspectTimeframe] = useState<"hour" | "day" | "week">("hour");
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectMetrics, setInspectMetrics] = useState<any[]>([]);

  // Action Modals State
  const [suspendModalVps, setSuspendModalVps] = useState<VpsResourceItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [throttleModalVps, setThrottleModalVps] = useState<VpsResourceItem | null>(null);
  const [throttleRate, setThrottleRate] = useState<string>("1.25");
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "danger" | "warning" | "success";
    icon?: React.ReactNode;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    variant: "warning",
    onConfirm: async () => {},
  });

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/resource-finding", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSummary(data.summary);
        setVpsList(data.vpsList || []);
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } else {
        toast.error(data.error || "Failed to load resource metrics");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while fetching resource finding metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      fetchData();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(timer);
  }, [autoRefreshInterval]);

  // Fetch RRD deep inspection data
  const fetchRrdMetrics = async (vps: VpsResourceItem, timeframe: "hour" | "day" | "week") => {
    if (!vps.vmid) return;
    setInspectLoading(true);
    try {
      const res = await fetch(
        `/api/admin/resource-finding?rrd=true&vmid=${vps.vmid}&node=${encodeURIComponent(vps.node)}&timeframe=${timeframe}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.rrd)) {
        const formatted = data.rrd
          .map((pt: any) => {
            const date = new Date((pt.time || 0) * 1000);
            return {
              time:
                timeframe === "hour"
                  ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" }),
              cpu: pt.cpu !== undefined ? parseFloat((pt.cpu * 100).toFixed(2)) : 0,
              memory:
                pt.maxmem && pt.mem ? parseFloat(((pt.mem / pt.maxmem) * 100).toFixed(2)) : 0,
              netin: pt.netin ? parseFloat((pt.netin / (1024 * 1024)).toFixed(2)) : 0,
              netout: pt.netout ? parseFloat((pt.netout / (1024 * 1024)).toFixed(2)) : 0,
            };
          })
          .filter((p: any) => p.cpu > 0 || p.memory > 0 || p.netin > 0 || p.netout > 0);
        setInspectMetrics(formatted);
      } else {
        setInspectMetrics([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load historical RRD data");
    } finally {
      setInspectLoading(false);
    }
  };

  const openInspectModal = (vps: VpsResourceItem) => {
    setInspectVps(vps);
    setInspectTimeframe("hour");
    fetchRrdMetrics(vps, "hour");
  };

  const handleTimeframeChange = (tf: "hour" | "day" | "week") => {
    setInspectTimeframe(tf);
    if (inspectVps) {
      fetchRrdMetrics(inspectVps, tf);
    }
  };

  // Perform Power / Suspend / Throttle Actions
  const handleVpsAction = async (id: number, action: string, reason?: string, rate?: number) => {
    setActionLoading(true);
    const toastId = toast.loading(`Executing ${action}...`);
    try {
      const res = await fetch("/api/admin/resource-finding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId: id, id, action, reason, rate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Action ${action} successful`, { id: toastId });
        setSuspendModalVps(null);
        setSuspendReason("");
        setThrottleModalVps(null);
        fetchData();
      } else {
        toast.error(data.error || `Failed to execute ${action}`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Internal error performing action", { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("IP copied to clipboard");
  };

  // Filtered & Sorted VPS List
  const filteredVps = useMemo(() => {
    let list = [...vpsList];

    // Quick Tab Filter
    if (activeTab === "CRITICAL") {
      list = list.filter((v) => v.severity === "CRITICAL");
    } else if (activeTab === "WARNING") {
      list = list.filter((v) => v.severity === "WARNING");
    } else if (activeTab === "HIGH_CPU") {
      list = list.filter((v) => v.cpuPercent >= 60);
    } else if (activeTab === "HIGH_RAM") {
      list = list.filter((v) => v.memPercent >= 75);
    } else if (activeTab === "HIGH_NET") {
      list = list.filter((v) => (v.netSpeedTotal || 0) >= 3 * 1024 * 1024 || v.totalBandwidth >= 100 * 1024 * 1024 * 1024);
    } else if (activeTab === "THROTTLED") {
      list = list.filter((v) => v.rateLimit && v.rateLimit > 0 && !v.isNetDisabled);
    } else if (activeTab === "ISOLATED") {
      list = list.filter((v) => v.isNetDisabled);
    } else if (activeTab === "OFFLINE") {
      list = list.filter((v) => v.severity === "OFFLINE" || !v.isOnline);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (v) =>
          v.hostname.toLowerCase().includes(q) ||
          (v.vmid && v.vmid.toString().includes(q)) ||
          v.primaryIp.toLowerCase().includes(q) ||
          v.node.toLowerCase().includes(q) ||
          v.user.name.toLowerCase().includes(q) ||
          v.user.email.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case "CPU_DESC":
          return b.cpuPercent - a.cpuPercent;
        case "RAM_DESC":
          return b.memPercent - a.memPercent;
        case "NET_SPEED_DESC":
          return (b.netSpeedTotal || 0) - (a.netSpeedTotal || 0);
        case "NET_DESC":
          return b.totalBandwidth - a.totalBandwidth;
        case "DISK_DESC":
          return b.diskPercent - a.diskPercent;
        case "VMID_ASC":
          return (a.vmid || 0) - (b.vmid || 0);
        case "VMID_DESC":
          return (b.vmid || 0) - (a.vmid || 0);
        default:
          return b.cpuPercent - a.cpuPercent;
      }
    });

    return list;
  }, [vpsList, activeTab, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredVps.length / itemsPerPage) || 1;
  const paginatedVps = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVps.slice(start, start + itemsPerPage);
  }, [filteredVps, currentPage, itemsPerPage]);

  if (loading) {
    return <AdminLoader />;
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header - Responsive Stack on Mobile */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1
            className={cn(
              "text-2xl sm:text-3xl font-extrabold tracking-tight",
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            Resource Finding
          </h1>
          <p className={cn("text-xs sm:text-sm mt-1 max-w-2xl", isDark ? "text-zinc-400" : "text-slate-500")}>
            Identify customer VPS instances consuming high CPU, saturated RAM, or heavy network bandwidth in real-time.
          </p>
        </div>

        {/* Action Controls & Auto-refresh (Mobile Friendly Wrap) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="w-36 shrink-0 relative z-30">
            <Select
              value={autoRefreshInterval}
              onChange={(val) => setAutoRefreshInterval(Number(val))}
              options={refreshOptions}
              className="py-2 px-3 text-xs font-semibold rounded-xl"
            />
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all active:scale-95 disabled:opacity-50",
              isDark
                ? "bg-[#0b1322] hover:bg-white/5 border-white/10 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
            )}
            title="Refresh now"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-cyan-500")} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            {lastUpdated && <span className="text-[11px] font-normal hidden md:inline opacity-60">({lastUpdated})</span>}
          </button>

          <Link
            href="/admin/vps"
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
              isDark
                ? "bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-500/20"
                : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200"
            )}
          >
            <Server className="w-3.5 h-3.5" />
            <span>VPS Manager</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </Link>
        </div>
      </div>

      {/* 4 Top KPI Stat Cards - Unified Design.md Containers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Critical Alerts */}
        <div
          onClick={() => setActiveTab(activeTab === "CRITICAL" ? "ALL" : "CRITICAL")}
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
            activeTab === "CRITICAL"
              ? isDark
                ? "border-cyan-500/60 ring-2 ring-cyan-500/30 bg-cyan-500/[0.04]"
                : "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/40"
              : isDark
              ? "bg-[#0b1322] border-white/10 hover:border-cyan-500/30"
              : "bg-white border-slate-200 hover:border-cyan-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              Critical Alerts
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
            <span className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {summary.criticalCount}
            </span>
            {summary.criticalCount > 0 && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </div>
          <p className={cn("text-[11px] sm:text-xs mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            CPU ≥ 80% or RAM ≥ 90%
          </p>
        </div>

        {/* Card 2: High CPU Load */}
        <div
          onClick={() => setActiveTab(activeTab === "HIGH_CPU" ? "ALL" : "HIGH_CPU")}
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
            activeTab === "HIGH_CPU"
              ? isDark
                ? "border-cyan-500/60 ring-2 ring-cyan-500/30 bg-cyan-500/[0.04]"
                : "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/40"
              : isDark
              ? "bg-[#0b1322] border-white/10 hover:border-cyan-500/30"
              : "bg-white border-slate-200 hover:border-cyan-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              High CPU Load
            </span>
            <div
              className={cn(
                "p-2 rounded-xl border shrink-0",
                isDark ? "bg-white/5 border-white/10 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700"
              )}
            >
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {summary.highCpuCount}
            </span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-400")}>/ {summary.runningCount} online</span>
          </div>
          <p className={cn("text-[11px] sm:text-xs mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            CPU load ≥ 60%
          </p>
        </div>

        {/* Card 3: High RAM Usage */}
        <div
          onClick={() => setActiveTab(activeTab === "HIGH_RAM" ? "ALL" : "HIGH_RAM")}
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
            activeTab === "HIGH_RAM"
              ? isDark
                ? "border-cyan-500/60 ring-2 ring-cyan-500/30 bg-cyan-500/[0.04]"
                : "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/40"
              : isDark
              ? "bg-[#0b1322] border-white/10 hover:border-cyan-500/30"
              : "bg-white border-slate-200 hover:border-cyan-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              High RAM Usage
            </span>
            <div
              className={cn(
                "p-2 rounded-xl border shrink-0",
                isDark ? "bg-white/5 border-white/10 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700"
              )}
            >
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {summary.highRamCount}
            </span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-400")}>/ {summary.runningCount} online</span>
          </div>
          <p className={cn("text-[11px] sm:text-xs mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            Memory usage ≥ 75%
          </p>
        </div>

        {/* Card 4: Total Network Traffic */}
        <div
          onClick={() => setActiveTab(activeTab === "HIGH_NET" ? "ALL" : "HIGH_NET")}
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
            activeTab === "HIGH_NET"
              ? isDark
                ? "border-cyan-500/60 ring-2 ring-cyan-500/30 bg-cyan-500/[0.04]"
                : "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/40"
              : isDark
              ? "bg-[#0b1322] border-white/10 hover:border-cyan-500/30"
              : "bg-white border-slate-200 hover:border-cyan-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              Total Network I/O
            </span>
            <div
              className={cn(
                "p-2 rounded-xl border shrink-0",
                isDark ? "bg-white/5 border-white/10 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700"
              )}
            >
              <Network className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
              {formatBytes(summary.totalBandwidth)}
            </span>
          </div>
          <p className={cn("text-[11px] sm:text-xs mt-1 flex items-center gap-2 truncate font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
            <span className="inline-flex items-center gap-1 text-cyan-400">
              <span className="text-zinc-400 font-sans">Live:</span>
              <ArrowDown className="w-3.5 h-3.5 shrink-0" />
              <span>{formatSpeed(summary.totalNetSpeedIn)}</span>
            </span>
            <span className="text-zinc-500">•</span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <ArrowUp className="w-3.5 h-3.5 shrink-0" />
              <span>{formatSpeed(summary.totalNetSpeedOut)}</span>
            </span>
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search / Sort Bar */}
      <div className={cn("p-4 rounded-2xl border space-y-4 relative z-20", isDark ? "bg-[#0b1322] border-white/10" : "bg-white border-slate-200")}>
        {/* Quick Filter Tabs - Mobile Horizontal Touch Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-none">
          {[
            { id: "ALL", label: "All VPS", count: summary.totalVps },
            { id: "CRITICAL", label: "Critical Abuse", count: summary.criticalCount },
            { id: "HIGH_CPU", label: "High CPU (>60%)", count: summary.highCpuCount },
            { id: "HIGH_RAM", label: "High RAM (>75%)", count: summary.highRamCount },
            { id: "HIGH_NET", label: "High Bandwidth", count: summary.highNetCount },
            { id: "THROTTLED", label: "Throttled", count: summary.throttledCount || 0 },
            { id: "ISOLATED", label: "Net Disabled", count: summary.netDisabledCount || 0 },
            { id: "OFFLINE", label: "Offline / Suspended", count: summary.totalVps - summary.runningCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as FilterTab);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 border",
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

        {/* Search & Sort Controls - Responsive Flex Stack */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search Hostname, VMID, Customer, IP, Node..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors",
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

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
            <span className={cn("text-xs font-medium whitespace-nowrap hidden sm:inline", isDark ? "text-zinc-400" : "text-slate-600")}>
              Sort:
            </span>
            <div className="w-full sm:w-56 shrink-0 relative z-30">
              <Select
                value={sortBy}
                onChange={(val) => setSortBy(val as SortOption)}
                options={sortOptions}
                className="py-2.5 px-3.5 text-xs sm:text-sm font-semibold rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (block lg:hidden) - Zero horizontal clutter on phones! */}
      <div className="block lg:hidden space-y-3">
        {paginatedVps.length === 0 ? (
          <div className={cn("p-10 rounded-2xl border text-center", isDark ? "bg-[#0b1322] border-white/10" : "bg-white border-slate-200")}>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>No VPS matches this filter</p>
            <p className="text-xs text-zinc-500 mt-1">All customer VPS instances are within normal bounds.</p>
          </div>
        ) : (
          paginatedVps.map((vps) => {
            const cpuColor =
              vps.cpuPercent >= 80 ? "bg-rose-500" : vps.cpuPercent >= 60 ? "bg-amber-500" : "bg-cyan-500";
            const memColor =
              vps.memPercent >= 90 ? "bg-rose-500" : vps.memPercent >= 75 ? "bg-amber-500" : "bg-cyan-500";

            return (
              <div
                key={vps.id}
                className={cn(
                  "p-4 rounded-2xl border space-y-3 transition-colors",
                  vps.severity === "CRITICAL"
                    ? isDark
                      ? "bg-rose-500/[0.04] border-rose-500/30"
                      : "bg-rose-50/60 border-rose-200"
                    : isDark
                    ? "bg-[#0b1322] border-white/10"
                    : "bg-white border-slate-200"
                )}
              >
                {/* Header: Hostname, VMID, Node, Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>
                        {vps.hostname}
                      </span>
                      {vps.vmid && (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border", isDark ? "bg-white/5 border-white/10 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                          #{vps.vmid}
                        </span>
                      )}
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", isDark ? "bg-white/5 border-white/5 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-600")}>
                        {vps.node}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className={cn("font-medium truncate", isDark ? "text-zinc-200" : "text-slate-800")} title={vps.user.name}>
                          {vps.user.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className={cn("text-[11px] truncate font-mono", isDark ? "text-zinc-400" : "text-slate-500")} title={vps.user.email}>
                          {vps.user.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Severity Badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0",
                        vps.isOnline
                          ? isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : vps.dbStatus === "SUSPENDED"
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
                          "w-1.5 h-1.5 rounded-full",
                          vps.isOnline
                            ? "bg-emerald-500 animate-pulse"
                            : vps.dbStatus === "SUSPENDED"
                            ? "bg-rose-500"
                            : "bg-zinc-500"
                        )}
                      />
                      {vps.dbStatus === "SUSPENDED" ? "Suspended" : vps.isOnline ? "Running" : "Stopped"}
                    </span>

                    {vps.severity === "CRITICAL" && (
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", isDark ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-200")}>
                        <AlertTriangle className="w-3 h-3" /> Critical
                      </span>
                    )}
                    {vps.severity === "WARNING" && (
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")}>
                        Warning
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary IP & Uptime bar */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={cn("text-[11px] font-sans font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>IP:</span>
                    <span className={cn("font-bold text-xs", isDark ? "text-zinc-200" : "text-slate-800")}>{vps.primaryIp}</span>
                    {vps.primaryIp !== "-" && (
                      <button
                        onClick={() => copyToClipboard(vps.primaryIp)}
                        className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                        title="Copy IP"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className={cn("text-[11px] font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <span className="font-sans text-zinc-500 mr-1">Uptime:</span>
                    <span className="font-semibold">{formatUptime(vps.uptime)}</span>
                  </div>
                </div>

                {/* Resource Metrics Box */}
                <div className={cn("p-3 rounded-xl border space-y-2.5 text-xs transition-colors", isDark ? "bg-black/25 border-white/5" : "bg-slate-50 border-slate-200")}>
                  {/* CPU & RAM 2-Column Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* CPU */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[11px] font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>CPU ({vps.cpuCores}c)</span>
                        <span className={cn("font-bold font-mono text-xs", vps.cpuPercent >= 80 ? "text-rose-500" : vps.cpuPercent >= 60 ? "text-amber-500" : isDark ? "text-zinc-200" : "text-slate-800")}>
                          {vps.cpuPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                        <div className={cn("h-full transition-all duration-500", cpuColor)} style={{ width: `${Math.min(vps.cpuPercent, 100)}%` }} />
                      </div>
                    </div>

                    {/* RAM */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[11px] font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>RAM</span>
                        <span className={cn("font-bold font-mono text-xs", vps.memPercent >= 90 ? "text-rose-500" : vps.memPercent >= 75 ? "text-amber-500" : isDark ? "text-zinc-200" : "text-slate-800")}>
                          {vps.memPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                        <div className={cn("h-full transition-all duration-500", memColor)} style={{ width: `${Math.min(vps.memPercent, 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Bandwidth Traffic Row */}
                  <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Network:</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 font-mono font-semibold">
                      <span className="inline-flex items-center gap-0.5 text-cyan-400" title="Incoming">
                        <ArrowDown className="w-3 h-3 shrink-0" />
                        <span>{formatSpeed(vps.netSpeedIn)}</span>
                      </span>
                      <span className="text-zinc-500 font-normal">/</span>
                      <span className="inline-flex items-center gap-0.5 text-emerald-400" title="Outgoing">
                        <ArrowUp className="w-3 h-3 shrink-0" />
                        <span>{formatSpeed(vps.netSpeedOut)}</span>
                      </span>
                      <span className={cn("text-[10px] font-normal pl-1 border-l border-slate-200 dark:border-white/10", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {formatBytes(vps.totalBandwidth)}
                      </span>
                    </div>
                  </div>

                  {/* Rate Limit or Network Isolated Active Pill */}
                  {vps.isNetDisabled ? (
                    <div
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] transition-colors",
                        isDark
                          ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate"><strong>Net Disabled</strong> (Isolated)</span>
                      </div>
                      <button
                        onClick={() => handleVpsAction(vps.id, "enable-net")}
                        disabled={actionLoading}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 ml-2 active:scale-95",
                          isDark
                            ? "bg-rose-500/20 hover:bg-emerald-500 hover:text-black text-rose-200 border-rose-500/30"
                            : "bg-white hover:bg-emerald-600 hover:text-white text-rose-800 border-rose-200"
                        )}
                        title="Re-enable internet access"
                      >
                        Restore
                      </button>
                    </div>
                  ) : vps.rateLimit && vps.rateLimit > 0 ? (
                    <div
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] transition-colors",
                        isDark
                          ? "bg-cyan-950/30 border-cyan-500/25 text-cyan-300"
                          : "bg-cyan-50 border-cyan-200 text-cyan-800"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">Throttled: <strong>{vps.rateLimit} Mbps</strong></span>
                      </div>
                      <button
                        onClick={() => handleVpsAction(vps.id, "unthrottle")}
                        disabled={actionLoading}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 ml-2 active:scale-95",
                          isDark
                            ? "bg-white/10 hover:bg-cyan-500 hover:text-black text-white border-white/15"
                            : "bg-white hover:bg-cyan-600 hover:text-white text-cyan-800 border-cyan-200"
                        )}
                        title="Restore full unthrottled speed"
                      >
                        Restore
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Mobile Actions Toolbar */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/5">
                  {/* Row 1: Primary Actions (Inspect, Throttle, Suspend) - 3 Equal Balanced Columns */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Inspect */}
                    <button
                      onClick={() => openInspectModal(vps)}
                      className={cn(
                        "h-9 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95",
                        isDark
                          ? "bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border-cyan-500/30"
                          : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
                      )}
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>Inspect</span>
                    </button>

                    {/* Throttle */}
                    <button
                      onClick={() => {
                        setThrottleModalVps(vps);
                        setThrottleRate(vps.rateLimit ? vps.rateLimit.toString() : "10");
                      }}
                      className={cn(
                        "h-9 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95",
                        vps.isNetDisabled
                          ? isDark
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                          : vps.rateLimit && vps.rateLimit > 0
                          ? isDark
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                            : "bg-cyan-50 text-cyan-700 border-cyan-200"
                          : isDark
                          ? "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      )}
                      title={vps.isNetDisabled ? "Internet access is disabled" : vps.rateLimit ? `Currently throttled: ${vps.rateLimit} Mbps` : "Set Bandwidth Rate Limit"}
                    >
                      {vps.isNetDisabled ? <WifiOff className="w-3.5 h-3.5 shrink-0" /> : <Gauge className="w-3.5 h-3.5 shrink-0" />}
                      <span>{vps.isNetDisabled ? "Net Off" : vps.rateLimit && vps.rateLimit > 0 ? "Throttled" : "Throttle"}</span>
                    </button>

                    {/* Suspend / Unsuspend */}
                    {vps.dbStatus === "SUSPENDED" ? (
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: `Unsuspend VPS #${vps.vmid || vps.id}?`,
                            description: `Unsuspend ${vps.hostname}? This will restore access and boot the VPS.`,
                            confirmText: "Unsuspend",
                            variant: "success",
                            onConfirm: async () => {
                              await handleVpsAction(vps.id, "unsuspend");
                            },
                          });
                        }}
                        className={cn(
                          "h-9 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95",
                          isDark
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        )}
                        title="Unsuspend VPS"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Unsuspend</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSuspendModalVps(vps);
                          setSuspendReason(
                            vps.cpuPercent >= 80
                              ? `[RESOURCE_LIMIT] Excessive CPU load detected (${vps.cpuPercent.toFixed(1)}%). Suspended to protect node stability.`
                              : `[RESOURCE_LIMIT] High resource consumption detected. Please contact administrator.`
                          );
                        }}
                        className={cn(
                          "h-9 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95",
                          isDark
                            ? "bg-white/5 border-white/10 text-zinc-300 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                        )}
                        title="Suspend VPS"
                      >
                        <Ban className="w-3.5 h-3.5 shrink-0" />
                        <span>Suspend</span>
                      </button>
                    )}
                  </div>

                  {/* Row 2: Power Controls Toolbar (Start | Reboot | Shutdown | Stop) - 4 Equal Balanced Columns */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {/* Start */}
                    <button
                      disabled={vps.isOnline || vps.dbStatus === "SUSPENDED"}
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: `Start VPS #${vps.vmid || vps.id}?`,
                          description: `Power on ${vps.hostname}? This will boot up the operating system.`,
                          confirmText: "Start VPS",
                          variant: "success",
                          onConfirm: async () => {
                            await handleVpsAction(vps.id, "start");
                          },
                        });
                      }}
                      className={cn(
                        "h-9 rounded-xl border text-[10.5px] sm:text-[11px] font-semibold flex items-center justify-center px-1 transition-all active:scale-95",
                        vps.isOnline || vps.dbStatus === "SUSPENDED"
                          ? isDark
                            ? "opacity-30 cursor-not-allowed bg-white/[0.02] border-white/5 text-zinc-500"
                            : "opacity-35 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                          : isDark
                          ? "bg-white/5 hover:bg-emerald-500/15 text-zinc-300 hover:text-emerald-300 border-white/10 hover:border-emerald-500/30"
                          : "bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300"
                      )}
                      title={vps.isOnline ? "VPS is already running" : "Start VPS"}
                    >
                      <Play className={cn("w-3 h-3 shrink-0 mr-1.5", !vps.isOnline && vps.dbStatus !== "SUSPENDED" ? "text-emerald-400 fill-emerald-400" : "fill-current")} />
                      <span className="truncate">Start</span>
                    </button>

                    {/* Reboot */}
                    <button
                      disabled={!vps.isOnline}
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: `Reboot VPS #${vps.vmid || vps.id}?`,
                          description: `Reboot ${vps.hostname}? This will momentarily restart customer services.`,
                          confirmText: "Reboot",
                          variant: "warning",
                          onConfirm: async () => {
                            await handleVpsAction(vps.id, "reboot");
                          },
                        });
                      }}
                      className={cn(
                        "h-9 rounded-xl border text-[10.5px] sm:text-[11px] font-semibold flex items-center justify-center px-1 transition-all active:scale-95",
                        !vps.isOnline
                          ? isDark
                            ? "opacity-30 cursor-not-allowed bg-white/[0.02] border-white/5 text-zinc-500"
                            : "opacity-35 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                          : isDark
                          ? "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-cyan-300 border-white/10 hover:border-cyan-500/30"
                          : "bg-white hover:bg-slate-50 text-slate-700 hover:text-cyan-800 border-slate-200 hover:border-cyan-300"
                      )}
                      title={!vps.isOnline ? "VPS is offline" : "Reboot VPS"}
                    >
                      <RotateCw className={cn("w-3 h-3 shrink-0 mr-1.5", vps.isOnline ? "text-cyan-400" : "")} />
                      <span className="truncate">Reboot</span>
                    </button>

                    {/* Shutdown */}
                    <button
                      disabled={!vps.isOnline}
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: `Shutdown VPS #${vps.vmid || vps.id}?`,
                          description: `Send graceful ACPI shutdown to ${vps.hostname}? System will safely close open files and stop.`,
                          confirmText: "Shutdown",
                          variant: "warning",
                          onConfirm: async () => {
                            await handleVpsAction(vps.id, "shutdown");
                          },
                        });
                      }}
                      className={cn(
                        "h-9 rounded-xl border text-[10.5px] sm:text-[11px] font-semibold flex items-center justify-center px-1 transition-all active:scale-95",
                        !vps.isOnline
                          ? isDark
                            ? "opacity-30 cursor-not-allowed bg-white/[0.02] border-white/5 text-zinc-500"
                            : "opacity-35 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                          : isDark
                          ? "bg-white/5 hover:bg-amber-500/15 text-zinc-300 hover:text-amber-300 border-white/10 hover:border-amber-500/30"
                          : "bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200 hover:border-amber-300"
                      )}
                      title={!vps.isOnline ? "VPS is offline" : "Graceful Shutdown (Power Off)"}
                    >
                      <Power className={cn("w-3.5 h-3.5 shrink-0 mr-1.5", vps.isOnline ? "text-amber-400" : "")} />
                      <span className="truncate">Shutdown</span>
                    </button>

                    {/* Stop */}
                    <button
                      disabled={!vps.isOnline}
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: `Force Stop VPS #${vps.vmid || vps.id}?`,
                          description: `Force stop ${vps.hostname}? Power will be cut immediately. Use if VPS is unresponsive or abusing CPU.`,
                          confirmText: "Force Stop",
                          variant: "danger",
                          onConfirm: async () => {
                            await handleVpsAction(vps.id, "stop");
                          },
                        });
                      }}
                      className={cn(
                        "h-9 rounded-xl border text-[10.5px] sm:text-[11px] font-semibold flex items-center justify-center px-1 transition-all active:scale-95",
                        !vps.isOnline
                          ? isDark
                            ? "opacity-30 cursor-not-allowed bg-white/[0.02] border-white/5 text-zinc-500"
                            : "opacity-35 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                          : isDark
                          ? "bg-white/5 hover:bg-rose-500/15 text-zinc-300 hover:text-rose-300 border-white/10 hover:border-rose-500/30"
                          : "bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-800 border-slate-200 hover:border-rose-300"
                      )}
                      title={!vps.isOnline ? "VPS is offline" : "Force Stop VPS"}
                    >
                      <Square className={cn("w-3 h-3 shrink-0 mr-1.5", vps.isOnline ? "text-rose-400 fill-rose-400" : "fill-current")} />
                      <span className="truncate">Stop</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {filteredVps.length > itemsPerPage && (
          <div
            className={cn(
              "p-4 rounded-2xl border flex flex-col items-center justify-center gap-3",
              isDark ? "bg-[#0b1322] border-white/10" : "bg-white border-slate-200"
            )}
          >
            <div className={cn("text-xs text-center", isDark ? "text-zinc-400" : "text-slate-500")}>
              Showing <span className="font-semibold text-slate-800 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-semibold text-slate-800 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredVps.length)}</span> of{" "}
              <span className="font-semibold text-slate-800 dark:text-white">{filteredVps.length}</span> instances
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* DESKTOP FULL-SPACE DATA TABLE (hidden lg:block) */}
      <div className={cn("hidden lg:block rounded-2xl border overflow-hidden", isDark ? "bg-[#0b1322] border-white/10" : "bg-white border-slate-200")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className={cn("border-b text-xs uppercase font-bold tracking-wider", isDark ? "bg-white/[0.02] border-white/10 text-zinc-400" : "bg-slate-50/80 border-slate-200 text-slate-500")}>
                <th className="py-3.5 px-4">VPS & Customer</th>
                <th className="py-3.5 px-4">Network & IP</th>
                <th className="py-3.5 px-4 min-w-[170px]">CPU Load</th>
                <th className="py-3.5 px-4 min-w-[170px]">Memory (RAM)</th>
                <th className="py-3.5 px-4 min-w-[170px]">Disk & Uptime</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Severity</th>
                <th className="py-3.5 px-4 text-right min-w-[280px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-normal">
              {paginatedVps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className={cn("w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border", isDark ? "bg-white/5 border-white/10 text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-400")}>
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      </div>
                      <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                        No Abusive or High Resource VPS Found
                      </h3>
                      <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {searchQuery
                          ? "No instances matched your search criteria. Try clearing search filters."
                          : "All customer VPS instances are running within normal and healthy performance thresholds."}
                      </p>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="mt-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          Clear Search Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVps.map((vps) => {
                  const cpuColor =
                    vps.cpuPercent >= 80 ? "bg-rose-500" : vps.cpuPercent >= 60 ? "bg-amber-500" : "bg-cyan-500";
                  const memColor =
                    vps.memPercent >= 90 ? "bg-rose-500" : vps.memPercent >= 75 ? "bg-amber-500" : "bg-cyan-500";

                  return (
                    <tr
                      key={vps.id}
                      className={cn(
                        "transition-colors",
                        vps.severity === "CRITICAL"
                          ? isDark
                            ? "bg-rose-500/[0.04] hover:bg-rose-500/[0.08]"
                            : "bg-rose-50/50 hover:bg-rose-50"
                          : isDark
                          ? "hover:bg-white/[0.02]"
                          : "hover:bg-slate-50/70"
                      )}
                    >
                      {/* VPS & Customer */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-xl mt-0.5 border shrink-0", isDark ? "bg-black/30 border-white/10" : "bg-slate-100 border-slate-200")}>
                            <Server className={cn("w-4 h-4", vps.isOnline ? "text-cyan-500" : "text-zinc-400")} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("font-bold text-sm truncate max-w-[170px]", isDark ? "text-white" : "text-slate-900")} title={vps.hostname}>
                                {vps.hostname}
                              </span>
                              {vps.vmid && (
                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border", isDark ? "bg-white/5 border-white/10 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                                  #{vps.vmid}
                                </span>
                              )}
                              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", isDark ? "bg-white/5 border-white/5 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-600")}>
                                {vps.node}
                              </span>
                            </div>
                            <div className="mt-1 space-y-1 text-xs">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                                <span className={cn("font-medium truncate max-w-[180px]", isDark ? "text-zinc-200" : "text-slate-800")} title={vps.user.name}>
                                  {vps.user.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                                <span className={cn("text-[11px] truncate max-w-[180px] font-mono", isDark ? "text-zinc-400" : "text-slate-500")} title={vps.user.email}>
                                  {vps.user.email}
                                </span>
                              </div>
                            </div>
                            {vps.suspendReason && (
                              <div className="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400 line-clamp-1" title={vps.suspendReason}>
                                Reason: {vps.suspendReason}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Network & IP */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                            <span className={isDark ? "text-zinc-200" : "text-slate-800"}>{vps.primaryIp}</span>
                            {vps.primaryIp !== "-" && (
                              <button
                                onClick={() => copyToClipboard(vps.primaryIp)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                title="Copy IP address"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-mono font-medium">
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-cyan-400 font-semibold" title="Live Incoming Throughput">
                              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" /> {formatSpeed(vps.netSpeedIn)}
                            </span>
                            <span className="opacity-30">/</span>
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-400 font-semibold" title="Live Outgoing Throughput">
                              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> {formatSpeed(vps.netSpeedOut)}
                            </span>
                          </div>
                          <div className={cn("text-[11px] font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
                            Total: <span className="font-semibold">{formatBytes(vps.totalBandwidth)}</span>
                          </div>
                          {vps.isNetDisabled ? (
                            <div className="pt-1">
                              <div
                                className={cn(
                                  "inline-flex items-center gap-2 pl-2 pr-1.5 py-0.5 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-colors",
                                  isDark
                                    ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                                    : "bg-rose-50 border-rose-200 text-rose-900"
                                )}
                              >
                                <div className="flex items-center gap-1.5 font-mono">
                                  <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <span><strong className="font-bold">Net Disabled</strong> (Isolated)</span>
                                </div>
                                <button
                                  onClick={() => handleVpsAction(vps.id, "enable-net")}
                                  disabled={actionLoading}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all active:scale-95",
                                    isDark
                                      ? "bg-rose-500/20 hover:bg-emerald-500 hover:text-black border-rose-500/30 text-rose-200"
                                      : "bg-white hover:bg-emerald-600 hover:text-white border-rose-200 text-rose-800"
                                  )}
                                  title="Re-enable internet access"
                                >
                                  Restore
                                </button>
                              </div>
                            </div>
                          ) : vps.rateLimit && vps.rateLimit > 0 ? (
                            <div className="pt-1">
                              <div
                                className={cn(
                                  "inline-flex items-center gap-2 pl-2 pr-1.5 py-0.5 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-colors",
                                  isDark
                                    ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-300"
                                    : "bg-cyan-50 border-cyan-200 text-cyan-900"
                                )}
                              >
                                <div className="flex items-center gap-1.5 font-mono">
                                  <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span>Throttled: <strong className="font-bold">{vps.rateLimit} Mbps</strong></span>
                                </div>
                                <button
                                  onClick={() => handleVpsAction(vps.id, "unthrottle")}
                                  disabled={actionLoading}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all active:scale-95",
                                    isDark
                                      ? "bg-white/10 hover:bg-cyan-500 hover:text-black border-white/15 text-white"
                                      : "bg-white hover:bg-cyan-600 hover:text-white border-cyan-200 text-cyan-800"
                                  )}
                                  title="Remove bandwidth limit & restore full speed"
                                >
                                  Restore
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* CPU Load - Perfectly Level & Symmetric */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between h-5">
                            <span
                              className={cn(
                                "font-extrabold text-sm font-mono leading-none",
                                vps.cpuPercent >= 80
                                  ? "text-rose-500"
                                  : vps.cpuPercent >= 60
                                  ? "text-amber-500"
                                  : isDark
                                  ? "text-zinc-300"
                                  : "text-slate-700"
                              )}
                            >
                              {vps.cpuPercent.toFixed(1)}%
                            </span>
                            <span className={cn("text-[11px] font-mono leading-none", isDark ? "text-zinc-400" : "text-slate-500")}>
                              {vps.cpuCores} {vps.cpuCores > 1 ? "Cores" : "Core"}
                            </span>
                          </div>
                          <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                            <div
                              className={cn("h-full transition-all duration-500", cpuColor, vps.cpuPercent >= 80 && "animate-pulse")}
                              style={{ width: `${Math.min(vps.cpuPercent, 100)}%` }}
                            />
                          </div>
                          <div className={cn("text-[10px] leading-none truncate h-4 flex items-center", isDark ? "text-zinc-500" : "text-slate-400")}>
                            {vps.cpuPercent >= 80 ? "Critical Strain" : vps.cpuPercent >= 60 ? "Elevated Usage" : "Normal Load"}
                          </div>
                        </div>
                      </td>

                      {/* Memory (RAM) - Perfectly Level & Symmetric */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between h-5">
                            <span
                              className={cn(
                                "font-extrabold text-sm font-mono leading-none",
                                vps.memPercent >= 90
                                  ? "text-rose-500"
                                  : vps.memPercent >= 75
                                  ? "text-amber-500"
                                  : isDark
                                  ? "text-zinc-300"
                                  : "text-slate-700"
                              )}
                            >
                              {vps.memPercent.toFixed(1)}%
                            </span>
                            <span className={cn("text-[11px] font-mono leading-none", isDark ? "text-zinc-400" : "text-slate-500")}>
                              {formatBytes(vps.memBytes, 1)} / {formatBytes(vps.maxMemBytes, 0)}
                            </span>
                          </div>
                          <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                            <div
                              className={cn("h-full transition-all duration-500", memColor)}
                              style={{ width: `${Math.min(vps.memPercent, 100)}%` }}
                            />
                          </div>
                          <div className={cn("text-[10px] leading-none truncate h-4 flex items-center", isDark ? "text-zinc-500" : "text-slate-400")}>
                            {vps.memPercent >= 90 ? "Out-of-Memory Danger" : vps.memPercent >= 75 ? "High Allocation" : "Optimal Memory"}
                          </div>
                        </div>
                      </td>

                      {/* Disk & Uptime - Perfectly Level & Symmetric */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between h-5">
                            <span
                              className={cn(
                                "font-extrabold text-sm font-mono leading-none",
                                vps.diskPercent >= 90
                                  ? "text-rose-500"
                                  : isDark
                                  ? "text-zinc-300"
                                  : "text-slate-700"
                              )}
                            >
                              {vps.diskPercent.toFixed(1)}%
                            </span>
                            <span className={cn("text-[11px] font-mono leading-none", isDark ? "text-zinc-400" : "text-slate-500")}>
                              {formatBytes(vps.maxDiskBytes, 0)}
                            </span>
                          </div>
                          <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                            <div
                              className={cn("h-full transition-all duration-500", vps.diskPercent >= 90 ? "bg-rose-500" : "bg-cyan-500")}
                              style={{ width: `${Math.min(vps.diskPercent, 100)}%` }}
                            />
                          </div>
                          <div className={cn("text-[10px] leading-none truncate h-4 flex items-center gap-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>Uptime: {formatUptime(vps.uptime)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                            vps.isOnline
                              ? isDark
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : vps.dbStatus === "SUSPENDED"
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
                              "w-1.5 h-1.5 rounded-full",
                              vps.isOnline
                                ? "bg-emerald-500 animate-pulse"
                                : vps.dbStatus === "SUSPENDED"
                                ? "bg-rose-500"
                                : "bg-zinc-500"
                            )}
                          />
                          {vps.dbStatus === "SUSPENDED" ? "Suspended" : vps.isOnline ? "Running" : "Stopped"}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        {vps.severity === "CRITICAL" ? (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", isDark ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-200")}>
                            <AlertTriangle className="w-3.5 h-3.5" /> Critical
                          </span>
                        ) : vps.severity === "WARNING" ? (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200")}>
                            Warning
                          </span>
                        ) : (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border", isDark ? "bg-white/5 text-zinc-400 border-white/10" : "bg-slate-100 text-slate-600 border-slate-200")}>
                            {vps.isOnline ? "Normal" : "Offline"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Modal Trigger */}
                          <button
                            onClick={() => openInspectModal(vps)}
                            className={cn(
                              "p-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5",
                              isDark
                                ? "bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border-cyan-500/30"
                                : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
                            )}
                            title="Inspect Deep Telemetry & Graphs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Inspect</span>
                          </button>

                          {/* Power Actions: Start */}
                          <button
                            disabled={vps.isOnline || vps.dbStatus === "SUSPENDED"}
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: `Start VPS #${vps.vmid || vps.id}?`,
                                description: `Power on ${vps.hostname}? This will boot up the operating system.`,
                                confirmText: "Start VPS",
                                variant: "success",
                                onConfirm: async () => {
                                  await handleVpsAction(vps.id, "start");
                                },
                              });
                            }}
                            className={cn(
                              "p-2 rounded-xl border transition-all text-xs font-semibold flex items-center justify-center",
                              vps.isOnline || vps.dbStatus === "SUSPENDED"
                                ? "opacity-30 cursor-not-allowed border-transparent text-zinc-500"
                                : isDark
                                ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                            )}
                            title={vps.isOnline ? "VPS is already running" : "Start VPS"}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {/* Power Actions: Reboot */}
                          <button
                            disabled={!vps.isOnline}
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: `Reboot VPS #${vps.vmid || vps.id}?`,
                                description: `Are you sure you want to reboot ${vps.hostname}? This will momentarily disrupt customer workloads.`,
                                confirmText: "Reboot Now",
                                variant: "warning",
                                onConfirm: async () => {
                                  await handleVpsAction(vps.id, "reboot");
                                },
                              });
                            }}
                            className={cn(
                              "p-2 rounded-xl border transition-all text-xs font-semibold flex items-center justify-center",
                              !vps.isOnline
                                ? "opacity-30 cursor-not-allowed border-transparent text-zinc-500"
                                : isDark
                                ? "bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border-white/10 hover:border-cyan-500/30"
                                : "bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border-slate-200 hover:border-cyan-300"
                            )}
                            title={!vps.isOnline ? "VPS is offline" : "Reboot VPS"}
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Power Actions: Shutdown (Graceful) */}
                          <button
                            disabled={!vps.isOnline}
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: `Shutdown VPS #${vps.vmid || vps.id}?`,
                                description: `Send graceful ACPI shutdown signal to ${vps.hostname}? Operating system will safely close processes and power off.`,
                                confirmText: "Shutdown",
                                variant: "warning",
                                onConfirm: async () => {
                                  await handleVpsAction(vps.id, "shutdown");
                                },
                              });
                            }}
                            className={cn(
                              "p-2 rounded-xl border transition-all text-xs font-semibold flex items-center justify-center",
                              !vps.isOnline
                                ? "opacity-30 cursor-not-allowed border-transparent text-zinc-500"
                                : isDark
                                ? "bg-white/5 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border-white/10 hover:border-amber-500/30"
                                : "bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200 hover:border-amber-300"
                            )}
                            title={!vps.isOnline ? "VPS is offline" : "Graceful Shutdown (Power Off)"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Power Actions: Force Stop */}
                          <button
                            disabled={!vps.isOnline}
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: `Force Stop VPS #${vps.vmid || vps.id}?`,
                                description: `Are you sure you want to forcefully stop ${vps.hostname}? Use this if the VM is consuming 100% CPU or unresponsive.`,
                                confirmText: "Force Stop",
                                variant: "danger",
                                onConfirm: async () => {
                                  await handleVpsAction(vps.id, "stop");
                                },
                              });
                            }}
                            className={cn(
                              "p-2 rounded-xl border transition-all text-xs font-semibold flex items-center justify-center",
                              !vps.isOnline
                                ? "opacity-30 cursor-not-allowed border-transparent text-zinc-500"
                                : isDark
                                ? "bg-white/5 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border-white/10 hover:border-rose-500/30"
                                : "bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-800 border-slate-200 hover:border-rose-300"
                            )}
                            title={!vps.isOnline ? "VPS is offline" : "Force Stop VPS"}
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {/* Bandwidth Throttle / Rate Limiter */}
                          <button
                            onClick={() => {
                              setThrottleModalVps(vps);
                              setThrottleRate(vps.rateLimit ? vps.rateLimit.toString() : "10");
                            }}
                            className={cn(
                              "p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center",
                              vps.isNetDisabled
                                ? isDark
                                  ? "bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                : vps.rateLimit && vps.rateLimit > 0
                                ? isDark
                                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25"
                                  : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
                                : isDark
                                ? "bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border-white/10 hover:border-cyan-500/30"
                                : "bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border-slate-200 hover:border-cyan-200"
                            )}
                            title={
                              vps.isNetDisabled
                                ? "Internet access is disabled (Click to manage)"
                                : vps.rateLimit && vps.rateLimit > 0
                                ? `Currently throttled to ${vps.rateLimit} Mbps. Click to adjust or unthrottle.`
                                : "Throttle Bandwidth (Set Rate Limit)"
                            }
                          >
                            {vps.isNetDisabled ? <WifiOff className="w-3.5 h-3.5" /> : <Gauge className="w-3.5 h-3.5" />}
                          </button>

                          {/* Suspend / Lock or Unsuspend */}
                          {vps.dbStatus === "SUSPENDED" ? (
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: `Unsuspend VPS #${vps.vmid || vps.id}?`,
                                  description: `Unsuspend and restore ${vps.hostname}? Customer access will be reinstated and the VPS will boot.`,
                                  confirmText: "Unsuspend VPS",
                                  variant: "success",
                                  onConfirm: async () => {
                                    await handleVpsAction(vps.id, "unsuspend");
                                  },
                                });
                              }}
                              className={cn(
                                "p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center",
                                isDark
                                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              )}
                              title="Unsuspend and restore customer VPS"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSuspendModalVps(vps);
                                setSuspendReason(
                                  vps.cpuPercent >= 80
                                    ? `[RESOURCE_LIMIT] Excessive CPU load detected (${vps.cpuPercent.toFixed(1)}%). Suspended to protect node stability.`
                                    : `[RESOURCE_LIMIT] High resource consumption detected. Please contact administrator.`
                                );
                              }}
                              className={cn(
                                "p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center",
                                isDark ? "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-rose-400 border-white/10" : "bg-white hover:bg-slate-100 text-slate-600 hover:text-rose-600 border-slate-200"
                              )}
                              title="Suspend & Lock VPS due to resource abuse"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        {filteredVps.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
              Showing <span className="font-semibold text-slate-800 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-semibold text-slate-800 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredVps.length)}</span> of{" "}
              <span className="font-semibold text-slate-800 dark:text-white">{filteredVps.length}</span> instances
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* Inspect Deep Telemetry & RRD Modal */}
      {inspectVps && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div
            className={cn(
              "w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl border p-4 sm:p-7 space-y-5 sm:space-y-6 transition-colors my-auto shadow-2xl",
              isDark ? "bg-[#0b1322] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight">
                    {inspectVps.hostname}
                  </h2>
                  {inspectVps.vmid && (
                    <span className={cn("px-2 py-0.5 rounded-lg text-xs font-mono font-bold border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                      VMID #{inspectVps.vmid}
                    </span>
                  )}
                  <span className={cn("px-2 py-0.5 rounded-lg text-xs font-semibold border", isDark ? "bg-white/5 border-white/10 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700")}>
                    Node: {inspectVps.node}
                  </span>
                </div>
                <p className={cn("text-xs sm:text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Customer: <span className="font-semibold">{inspectVps.user.name}</span> ({inspectVps.user.email}) • IP: <span className="font-mono">{inspectVps.primaryIp}</span>
                </p>
              </div>
              <button
                onClick={() => setInspectVps(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timeframe selector & Quick Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Timeframe:
                </span>
                {(["hour", "day", "week"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => handleTimeframeChange(tf)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all",
                      inspectTimeframe === tf
                        ? isDark
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                          : "bg-cyan-600 text-white border-cyan-600"
                        : isDark
                        ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    1 {tf}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-x-4 gap-y-2 text-xs font-mono flex-wrap">
                <div>
                  <span className="text-zinc-500">Live CPU:</span>{" "}
                  <span className={cn("font-bold", inspectVps.cpuPercent >= 80 ? "text-rose-500" : "text-cyan-500")}>
                    {inspectVps.cpuPercent.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Live RAM:</span>{" "}
                  <span className={cn("font-bold", inspectVps.memPercent >= 75 ? "text-amber-500" : "text-cyan-500")}>
                    {inspectVps.memPercent.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Uptime:</span>{" "}
                  <span className="font-bold">{formatUptime(inspectVps.uptime)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Rate Limit:</span>{" "}
                  {inspectVps.rateLimit && inspectVps.rateLimit > 0 ? (
                    <span className={cn("font-bold font-mono", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      {inspectVps.rateLimit} Mbps
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">Unlimited</span>
                  )}
                  <button
                    onClick={() => {
                      setThrottleModalVps(inspectVps);
                      setThrottleRate(inspectVps.rateLimit ? inspectVps.rateLimit.toString() : "10");
                    }}
                    className={cn(
                      "p-1 rounded transition-colors",
                      isDark ? "hover:bg-white/10 text-zinc-400 hover:text-cyan-400" : "hover:bg-slate-100 text-slate-500 hover:text-cyan-700"
                    )}
                    title="Adjust Bandwidth Limit"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            {inspectLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
                <span className="text-xs text-zinc-400">Loading historical metrics from Proxmox RRD...</span>
              </div>
            ) : inspectMetrics.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border rounded-2xl border-dashed border-zinc-700">
                <Activity className="w-10 h-10 text-zinc-600 mb-2" />
                <span className="text-sm font-semibold">No RRD metric points recorded for this timeframe</span>
                <span className="text-xs text-zinc-500 mt-1">Metrics accumulate as the VM runs continuously.</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* CPU Chart */}
                <div className={cn("p-4 sm:p-5 rounded-2xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-500" />
                      <h4 className="text-sm font-bold">CPU Usage Over Time (%)</h4>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">Limit: 100%</span>
                  </div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={inspectMetrics} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
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
                          }}
                        />
                        <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#06b6d4" strokeWidth={2} fill="url(#cpuGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Memory (RAM) Chart */}
                <div className={cn("p-4 sm:p-5 rounded-2xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-500" />
                      <h4 className="text-sm font-bold">Memory (RAM) Usage Over Time (%)</h4>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">Total: {formatBytes(inspectVps.maxMemBytes, 0)}</span>
                  </div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={inspectMetrics} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
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
                          }}
                        />
                        <Area type="monotone" dataKey="memory" name="RAM %" stroke="#06b6d4" strokeWidth={2} fill="url(#memGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Network Throughput Chart (Download vs Upload) */}
                <div className={cn("p-4 sm:p-5 rounded-2xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-cyan-500" />
                      <h4 className="text-sm font-bold">Network Traffic (MB)</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-cyan-500 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-cyan-500" /> Inbound (NetIn)
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-zinc-400" /> Outbound (NetOut)
                      </span>
                    </div>
                  </div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={inspectMetrics} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="netinGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="netoutGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff0a" : "#f1f5f9"} vertical={false} />
                        <XAxis dataKey="time" stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={10} tickLine={false} />
                        <YAxis stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#0b1322" : "#ffffff",
                            borderColor: isDark ? "#334155" : "#e2e8f0",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                        <Area type="monotone" dataKey="netin" name="Download (MB)" stroke="#06b6d4" strokeWidth={2} fill="url(#netinGrad)" />
                        <Area type="monotone" dataKey="netout" name="Upload (MB)" stroke="#94a3b8" strokeWidth={2} fill="url(#netoutGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
              <Link
                href={`/admin/vps?q=${inspectVps.hostname}`}
                className="text-xs font-semibold flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <span>Open in VPS Service Page</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => setInspectVps(null)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all",
                  isDark ? "bg-white/10 hover:bg-white/20 border-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                )}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Lock Modal */}
      {suspendModalVps && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div
            className={cn(
              "w-full max-w-md rounded-2xl sm:rounded-3xl border p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5 transition-colors my-auto max-h-[92vh] overflow-y-auto shadow-2xl",
              isDark ? "bg-[#0b1322] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">Suspend Customer VPS</h3>
                <p className="text-xs text-zinc-400">VMID #{suspendModalVps.vmid} ({suspendModalVps.hostname})</p>
              </div>
            </div>

            <div className={cn("p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed border", isDark ? "bg-rose-500/5 border-rose-500/20 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800")}>
              <strong>Notice:</strong> Suspending this VPS will immediately power off the VM in Proxmox and restrict customer access until unsuspended.
            </div>

            <div className="space-y-2">
              <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                Suspension Reason (Visible to Customer)
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Specify reason for suspension..."
                className={cn(
                  "w-full p-3 rounded-xl text-xs sm:text-sm border outline-none resize-none transition-colors",
                  isDark
                    ? "bg-black/30 border-white/10 text-white placeholder-zinc-500 focus:border-rose-500/50"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:bg-white"
                )}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={() => setSuspendModalVps(null)}
                disabled={actionLoading}
                className={cn(
                  "w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all text-center justify-center",
                  isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                )}
              >
                Cancel
              </button>
              <button
                onClick={() => handleVpsAction(suspendModalVps.id, "suspend", suspendReason)}
                disabled={actionLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Suspend</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bandwidth Throttle / Rate Limiter Modal */}
      {throttleModalVps && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl sm:rounded-3xl border p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5 transition-colors my-auto max-h-[92vh] overflow-y-auto shadow-2xl",
              isDark ? "bg-[#0b1322] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-3.5 sm:pb-4 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "p-2.5 sm:p-3 rounded-2xl border shrink-0 transition-colors",
                    isDark
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      : "bg-cyan-50 text-cyan-600 border-cyan-100"
                  )}
                >
                  <Gauge className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold truncate">Bandwidth Rate Limiting</h3>
                  <p className={cn("text-xs truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                    VMID #{throttleModalVps.vmid} ({throttleModalVps.hostname})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setThrottleModalVps(null)}
                className={cn(
                  "p-2 rounded-xl shrink-0 transition-colors",
                  isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status banner */}
            <div
              className={cn(
                "p-3 sm:p-3.5 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border transition-colors",
                throttleModalVps.isNetDisabled
                  ? isDark
                    ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                  : throttleModalVps.rateLimit && throttleModalVps.rateLimit > 0
                  ? isDark
                    ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300"
                    : "bg-cyan-50 border-cyan-200 text-cyan-900"
                  : isDark
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    throttleModalVps.isNetDisabled
                      ? "bg-rose-500 animate-pulse"
                      : throttleModalVps.rateLimit && throttleModalVps.rateLimit > 0
                      ? "bg-cyan-400 animate-pulse"
                      : "bg-emerald-500"
                  )}
                />
                <span className="font-semibold leading-tight">
                  Status: {throttleModalVps.isNetDisabled
                    ? "Internet Disabled (Network Link Down / Isolated)"
                    : throttleModalVps.rateLimit && throttleModalVps.rateLimit > 0
                    ? `Throttled to ${throttleModalVps.rateLimit} Mbps`
                    : "Unlimited (Full Host Speed)"}
                </span>
              </div>
              {throttleModalVps.isNetDisabled ? (
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: `Enable Internet for VMID #${throttleModalVps.vmid}?`,
                      description: `Reconnect virtual network link for ${throttleModalVps.hostname}? This will restore full internet access.`,
                      confirmText: "Enable Internet",
                      variant: "success",
                      icon: <Wifi className="w-8 h-8" />,
                      onConfirm: async () => {
                        await handleVpsAction(throttleModalVps.id, "enable-net");
                      },
                    });
                  }}
                  disabled={actionLoading}
                  className={cn(
                    "px-3 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 shrink-0 self-start sm:self-auto",
                    isDark
                      ? "bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-300 border-emerald-500/30"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent"
                  )}
                >
                  Enable Internet
                </button>
              ) : throttleModalVps.rateLimit && throttleModalVps.rateLimit > 0 ? (
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: `Restore Full Speed for VMID #${throttleModalVps.vmid}?`,
                      description: `Remove rate limiting and restore unlimited network speed for ${throttleModalVps.hostname}.`,
                      confirmText: "Restore Full Speed",
                      variant: "success",
                      icon: <Gauge className="w-8 h-8" />,
                      onConfirm: async () => {
                        await handleVpsAction(throttleModalVps.id, "unthrottle");
                      },
                    });
                  }}
                  disabled={actionLoading}
                  className={cn(
                    "px-3 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 shrink-0 self-start sm:self-auto",
                    isDark
                      ? "bg-white/10 hover:bg-white/20 text-white border-white/15"
                      : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200"
                  )}
                >
                  Restore Full Speed
                </button>
              ) : null}
            </div>

            {/* Network Access & Isolation Controller */}
            <div
              className={cn(
                "p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                throttleModalVps.isNetDisabled
                  ? isDark
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                  : isDark
                  ? "bg-white/[0.02] border-white/10 text-zinc-300"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "p-2.5 rounded-xl shrink-0 border",
                    throttleModalVps.isNetDisabled
                      ? isDark
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                        : "bg-rose-100 text-rose-600 border-rose-200"
                      : isDark
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      : "bg-cyan-50 text-cyan-600 border-cyan-200"
                  )}
                >
                  {throttleModalVps.isNetDisabled ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold flex flex-wrap items-center gap-1.5">
                    <span>Internet Access</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold",
                        throttleModalVps.isNetDisabled
                          ? "bg-rose-500/20 text-rose-300"
                          : isDark
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {throttleModalVps.isNetDisabled ? "DISABLED (ISOLATED)" : "ONLINE"}
                    </span>
                  </div>
                  <p className={cn("text-[11px] leading-relaxed mt-0.5 line-clamp-2 sm:truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {throttleModalVps.isNetDisabled
                      ? "Virtual network link is disconnected. Registered in incident reports."
                      : "Disconnect virtual network link instantly (quarantine / security lock)."}
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t border-black/5 dark:border-white/5 sm:border-0 flex sm:block justify-end">
                {throttleModalVps.isNetDisabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: `Enable Internet for VMID #${throttleModalVps.vmid}?`,
                        description: `Reconnect virtual network link (link_down=0) for ${throttleModalVps.hostname}? This will restore network traffic and public internet access immediately.`,
                        confirmText: "Enable Internet",
                        variant: "success",
                        icon: <Wifi className="w-8 h-8" />,
                        onConfirm: async () => {
                          await handleVpsAction(throttleModalVps.id, "enable-net");
                        },
                      });
                    }}
                    disabled={actionLoading}
                    className={cn(
                      "w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 shadow-sm",
                      "bg-emerald-600 hover:bg-emerald-500"
                    )}
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Enable Internet</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: `Disable Internet for VMID #${throttleModalVps.vmid}?`,
                        description: `Disconnect virtual network link (link_down=1) for ${throttleModalVps.hostname}? This will isolate the VM from public internet immediately without restarting it, and record a critical incident in audit logs.`,
                        confirmText: "Disable Internet",
                        variant: "danger",
                        icon: <WifiOff className="w-8 h-8" />,
                        onConfirm: async () => {
                          await handleVpsAction(throttleModalVps.id, "disable-net");
                        },
                      });
                    }}
                    disabled={actionLoading}
                    className={cn(
                      "w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 border shadow-sm",
                      isDark
                        ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30"
                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                    )}
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Disable Internet</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                Speed Presets (Megabytes/sec)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {[
                  { label: "1 MB/s", mbps: "8 Mbps", val: "1", desc: "Flood / Torrent" },
                  { label: "1.25 MB/s", mbps: "10 Mbps", val: "1.25", desc: "Emergency Cap" },
                  { label: "2.5 MB/s", mbps: "20 Mbps", val: "2.5", desc: "Strict Limit" },
                  { label: "5 MB/s", mbps: "40 Mbps", val: "5", desc: "Moderate Limit" },
                  { label: "10 MB/s", mbps: "80 Mbps", val: "10", desc: "Mild Limit" },
                  { label: "12.5 MB/s", mbps: "100 Mbps", val: "12.5", desc: "100M Cap" },
                ].map((preset) => {
                  const isSelected = throttleRate === preset.val;
                  return (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setThrottleRate(preset.val)}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-xl border text-left transition-all active:scale-[0.98] flex flex-col justify-center",
                        isSelected
                          ? isDark
                            ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 ring-1 ring-cyan-500/40 shadow-sm"
                            : "bg-cyan-50 border-cyan-500 text-cyan-900 ring-1 ring-cyan-500/30 shadow-sm"
                          : isDark
                          ? "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <div className={cn("font-bold text-xs sm:text-sm", isSelected && (isDark ? "text-cyan-300" : "text-cyan-700"))}>{preset.label}</div>
                      <div className="text-[10px] sm:text-[11px] opacity-75 mt-0.5 leading-tight">{preset.mbps} • {preset.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-bold uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                  Custom Limit (MB/s)
                </span>
                <span className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-600")}>
                  ≈ {Math.round((parseFloat(throttleRate) || 0) * 8)} Mbps
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  max="1000"
                  value={throttleRate}
                  onChange={(e) => setThrottleRate(e.target.value)}
                  placeholder="Enter limit in MB/s (e.g. 1.25)..."
                  className={cn(
                    "w-full px-3.5 py-2.5 pr-16 rounded-xl text-xs sm:text-sm border outline-none font-mono transition-all",
                    isDark
                      ? "bg-[#0a1624] border-white/10 text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  )}
                />
                <span className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold pointer-events-none", isDark ? "text-zinc-400" : "text-slate-400")}>
                  MB/s
                </span>
              </div>
            </div>

            {/* Explanatory Notice */}
            <div className={cn("p-3 sm:p-3.5 rounded-2xl text-[11px] leading-relaxed border flex items-start gap-2.5 transition-all shadow-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
              <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              <div>
                <strong className={cn("font-medium mr-1", isDark ? "text-cyan-400" : "text-cyan-900")}>Notice:</strong>
                <span className={cn(isDark ? "text-cyan-200/90" : "text-slate-600")}>Proxmox applies bandwidth rate limits and network link disconnection (link_down=1) directly to the VM's network interfaces in real time via Linux kernel traffic control (tc) and QEMU monitor. Disabling internet isolates the server without shutting down the VM and is registered in the customer Incident Report.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-2 sm:pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setThrottleModalVps(null)}
                disabled={actionLoading}
                className={cn("w-full sm:w-auto px-4 py-2.5 rounded-xl border font-medium text-xs sm:text-sm transition-colors text-center justify-center", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  const rateNum = parseFloat(throttleRate);
                  if (isNaN(rateNum) || rateNum <= 0) {
                    toast.error("Please enter a valid rate limit greater than 0 MB/s");
                    return;
                  }
                  handleVpsAction(throttleModalVps.id, "throttle", undefined, rateNum);
                }}
                disabled={actionLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Apply Rate Limit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Power actions */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
      />
    </div>
  );
}
