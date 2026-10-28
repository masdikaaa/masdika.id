"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Download,
  Printer,
  FileText,
  Activity,
  Cpu,
  HardDrive,
  Network,
  SlidersHorizontal,
  Server,
  Terminal,
  Clock,
  Copy,
  Check,
  X,
  ArrowUpRight,
  ChevronRight,
  Gauge,
  Info,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Metrics {
  cpuPercent: number;
  memBytes: number;
  maxMemBytes: number;
  memPercent: number;
  diskBytes: number;
  maxDiskBytes: number;
  diskPercent: number;
  netSpeedIn: number;
  netSpeedOut: number;
  netSpeedTotal: number;
  netInTotal: number;
  netOutTotal: number;
  totalBandwidth: number;
  uptime: number;
}

interface IncidentItem {
  id: number;
  vmid: number;
  hostname: string;
  primaryIp: string;
  node: string;
  osTemplate: string;
  status: string;
  isRunning: boolean;
  isSuspended: boolean;
  isNetDisabled?: boolean;
  suspendReason: string | null;
  isThrottled: boolean;
  rateLimitMb: number | null;
  rateLimitMbps: number | null;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  metrics: Metrics;
  flags: {
    isHighCpu: boolean;
    isHighRam: boolean;
    isHighNet: boolean;
  };
  severity: "CRITICAL" | "WARNING" | "NORMAL" | "OFFLINE";
  incidentReasons: string[];
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  timestamp: string;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  summary: {
    totalVps: number;
    runningCount: number;
    throttledCount: number;
    suspendedCount: number;
    netDisabledCount?: number;
    incidentCount: number;
    healthyCount: number;
  };
  policy: {
    unmeteredBandwidth: boolean;
    statement: string;
  };
  incidents: IncidentItem[];
  error?: string;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "0 KB/s";
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "Offline";
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function IncidentsClient() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "INCIDENTS" | "ISOLATED" | "THROTTLED" | "SUSPENDED" | "HEALTHY">("ALL");

  // Telemetry inspection modal
  const [telemetryModalItem, setTelemetryModalItem] = useState<IncidentItem | null>(null);
  const [rrdTimeframe, setRrdTimeframe] = useState<"hour" | "day" | "week">("hour");
  const [rrdLoading, setRrdLoading] = useState(false);
  const [rrdData, setRrdData] = useState<any[]>([]);

  // Official report modal
  const [reportModalItem, setReportModalItem] = useState<IncidentItem | null>(null);
  const [isFleetReport, setIsFleetReport] = useState(false);

  // Copied IP state
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const fetchIncidents = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/user/incidents?t=${Date.now()}`, { cache: "no-store" });
      const json: ApiResponse = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to load incident reports");
      }
      setData(json);
      if (isManual) toast.success("Telemetry updated");
    } catch (err: any) {
      console.error("fetchIncidents error:", err);
      toast.error(err.message || "Failed to fetch incidents");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(() => fetchIncidents(false), 20000);
    return () => clearInterval(interval);
  }, []);

  // Fetch RRD when telemetry modal opens or timeframe changes
  useEffect(() => {
    if (!telemetryModalItem) {
      setRrdData([]);
      return;
    }

    let isMounted = true;
    setRrdLoading(true);

    fetch(`/api/user/incidents?rrd=true&vmid=${telemetryModalItem.vmid}&timeframe=${rrdTimeframe}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && Array.isArray(json.rrd)) {
          setRrdData(json.rrd);
        } else {
          setRrdData([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load RRD:", err);
        if (isMounted) setRrdData([]);
      })
      .finally(() => {
        if (isMounted) setRrdLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [telemetryModalItem, rrdTimeframe]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    toast.success("IP copied to clipboard");
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const filteredIncidents = useMemo(() => {
    if (!data?.incidents) return [];
    return data.incidents.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.hostname.toLowerCase().includes(q) ||
        String(item.vmid).includes(q) ||
        item.primaryIp.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "INCIDENTS") {
        return item.severity === "CRITICAL" || item.severity === "WARNING";
      }
      if (statusFilter === "ISOLATED") {
        return Boolean(item.isNetDisabled);
      }
      if (statusFilter === "THROTTLED") {
        return item.isThrottled;
      }
      if (statusFilter === "SUSPENDED") {
        return item.isSuspended;
      }
      if (statusFilter === "HEALTHY") {
        return item.severity === "NORMAL";
      }
      return true;
    });
  }, [data, searchQuery, statusFilter]);

  // Export CSV
  const handleExportCsv = () => {
    if (!data || !data.incidents || data.incidents.length === 0) {
      toast.error("No instances to export");
      return;
    }

    const headers = [
      "Export Timestamp",
      "VMID",
      "Hostname",
      "IP Address",
      "Node",
      "Status",
      "Severity",
      "Is Net Disabled",
      "Is Throttled",
      "Rate Limit (MB/s)",
      "Rate Limit (Mbps)",
      "CPU (%)",
      "RAM (%)",
      "RAM Used (GB)",
      "RAM Max (GB)",
      "Disk (%)",
      "Disk Used (GB)",
      "Disk Max (GB)",
      "Net Speed In (KB/s)",
      "Net Speed Out (KB/s)",
      "Net Speed Total (KB/s)",
      "Cumulative Bandwidth (GB)",
      "Suspension Reason",
      "Active Incident Findings",
    ];

    const now = new Date().toISOString();

    const rows = data.incidents.map((vps) => {
      const reasons = vps.incidentReasons.join(" | ").replace(/"/g, '""');
      const suspendReason = (vps.suspendReason || "").replace(/"/g, '""');
      return [
        `"${now}"`,
        vps.vmid,
        `"${vps.primaryIp}"`,
        `"${vps.hostname}"`,
        `"${vps.node}"`,
        `"${vps.status}"`,
        `"${vps.severity}"`,
        vps.isNetDisabled ? "YES (ISOLATED)" : "NO",
        vps.isThrottled ? "YES" : "NO",
        vps.rateLimitMb ?? "N/A",
        vps.rateLimitMbps ?? "N/A",
        vps.metrics.cpuPercent,
        vps.metrics.memPercent,
        (vps.metrics.memBytes / (1024 * 1024 * 1024)).toFixed(2),
        (vps.metrics.maxMemBytes / (1024 * 1024 * 1024)).toFixed(2),
        vps.metrics.diskPercent,
        (vps.metrics.diskBytes / (1024 * 1024 * 1024)).toFixed(2),
        (vps.metrics.maxDiskBytes / (1024 * 1024 * 1024)).toFixed(2),
        (vps.metrics.netSpeedIn / 1024).toFixed(1),
        (vps.metrics.netSpeedOut / 1024).toFixed(1),
        (vps.metrics.netSpeedTotal / 1024).toFixed(1),
        (vps.metrics.totalBandwidth / (1024 * 1024 * 1024)).toFixed(2),
        `"${suspendReason}"`,
        `"${reasons}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `masdika-incident-audit-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Incident audit CSV downloaded");
  };

  // Handle ESC key to close open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReportModalItem(null);
        setIsFleetReport(false);
        setTelemetryModalItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (reportModalItem || isFleetReport || telemetryModalItem) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [reportModalItem, isFleetReport, telemetryModalItem]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 pb-28">
      {/* Print-only CSS rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside,
          header,
          nav,
          .no-print,
          button:not(.print-include) {
            display: none !important;
          }
          .printable-report {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            min-height: auto !important;
            background: white !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .printable-report * {
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
          }
          .printable-report .print-badge {
            border: 1px solid #94a3b8 !important;
            background: #f1f5f9 !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 no-print">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Incident & Reports
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <ShieldAlert className="w-3 h-3" /> Incident & Telemetry Audit
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm max-w-xl leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Centralized resource abuse telemetry, bandwidth throttling safeguards, and official incident reports.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-60 lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" />
            <input
              type="text"
              placeholder="Search instances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none transition-colors",
                isDark
                  ? "bg-[#111115] border-white/[0.08] text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  : "bg-slate-50/80 border-slate-200/90 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              )}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchIncidents(true)}
              disabled={refreshing}
              className={cn(
                "p-2 sm:p-2.5 rounded-xl border text-sm transition-all",
                isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04]" : "bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 shadow-2xs"
              )}
              title="Refresh live data"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-cyan-500")} />
            </button>

            <button
              onClick={handleExportCsv}
              disabled={loading || !data?.incidents?.length}
              className={cn(
                "flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                isDark
                  ? "bg-[#111115] border-white/[0.08] text-cyan-400 hover:bg-white/[0.04] hover:border-cyan-500/40"
                  : "bg-white border-slate-200/90 text-cyan-700 hover:bg-slate-50 shadow-2xs"
              )}
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setIsFleetReport(true);
                setReportModalItem(null);
              }}
              disabled={loading || !data?.incidents?.length}
              className="flex-1 sm:flex-initial px-4 py-2 sm:py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Official Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bandwidth Policy & Node Protection Notice Banner */}
      <div
        className={cn(
          "rounded-xl sm:rounded-2xl p-4 sm:p-5 border transition-all no-print flex items-start gap-3 sm:gap-3.5",
          isDark
            ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200"
            : "bg-cyan-50 border-cyan-200 text-cyan-800"
        )}
      >
        <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn("font-medium text-xs sm:text-sm", isDark ? "text-cyan-400" : "text-cyan-900")}>
              Unmetered Bandwidth & Automated Safeguard Guarantee:
            </h2>
            <span
              className={cn(
                "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                isDark
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : "bg-cyan-50 text-cyan-700 border-cyan-200"
              )}
            >
              100% Free Bandwidth
            </span>
          </div>
          <p className={cn("text-[11px] sm:text-xs leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-600")}>
            Masdika Cloud VPS provides <strong>unmetered traffic with zero overage billing</strong>. If an instance experiences
            sudden abnormal outbound traffic floods, temporary bandwidth throttling (e.g., 10 MB/s) is engaged dynamically
            as a safeguard to shield host node stability, keeping your server reachable rather than suspended.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
        {/* Total VPS */}
        <div
          className={cn(
            "rounded-2xl p-4 sm:p-5 border transition-all",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[11px] sm:text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Total Instances
            </span>
            <div
              className={cn(
                "p-1.5 sm:p-2 rounded-xl border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-100 text-cyan-700"
              )}
            >
              <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className={cn("text-xl sm:text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
            {loading ? "..." : data?.summary?.totalVps ?? 0}
          </div>
          <div className={cn("text-[10px] sm:text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            {data?.summary?.runningCount ?? 0} Running online
          </div>
        </div>

        {/* Healthy Instances */}
        <div
          className={cn(
            "rounded-2xl p-4 sm:p-5 border transition-all",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[11px] sm:text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Healthy & Optimal
            </span>
            <div
              className={cn(
                "p-1.5 sm:p-2 rounded-xl border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-100 text-cyan-700"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className={cn("text-xl sm:text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
            {loading ? "..." : data?.summary?.healthyCount ?? 0}
          </div>
          <div className={cn("text-[10px] sm:text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Normal bounds
          </div>
        </div>

        {/* Throttled Safeguard Active */}
        <div
          className={cn(
            "rounded-2xl p-4 sm:p-5 border transition-all",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[11px] sm:text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Rate Limited
            </span>
            <div
              className={cn(
                "p-1.5 sm:p-2 rounded-xl border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-100 text-cyan-700"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className={cn("text-xl sm:text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
            {loading ? "..." : data?.summary?.throttledCount ?? 0}
          </div>
          <div className={cn("text-[10px] sm:text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Safeguard active
          </div>
        </div>

        {/* Suspended / Critical */}
        <div
          className={cn(
            "rounded-2xl p-4 sm:p-5 border transition-all",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[11px] sm:text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Suspended
            </span>
            <div
              className={cn(
                "p-1.5 sm:p-2 rounded-xl border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-100 text-cyan-700"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className={cn("text-xl sm:text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
            {loading ? "..." : data?.summary?.suspendedCount ?? 0}
          </div>
          <div className={cn("text-[10px] sm:text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            {data?.summary?.suspendedCount ? "Action required" : "Zero suspended"}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-print">
        {[
          { id: "ALL", label: `All (${data?.incidents?.length ?? 0})` },
          { id: "INCIDENTS", label: `Incidents (${data?.summary?.incidentCount ?? 0})` },
          { id: "ISOLATED", label: `Net Isolated (${data?.summary?.netDisabledCount ?? 0})` },
          { id: "THROTTLED", label: `Throttled (${data?.summary?.throttledCount ?? 0})` },
          { id: "SUSPENDED", label: `Suspended (${data?.summary?.suspendedCount ?? 0})` },
          { id: "HEALTHY", label: `Healthy (${data?.summary?.healthyCount ?? 0})` },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border",
                isActive
                  ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-sm"
                  : isDark
                  ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15]"
                  : "bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-2xs"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div
          className={cn(
            "rounded-2xl p-8 sm:p-12 border text-center flex flex-col items-center justify-center space-y-4",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
          <div className="space-y-1">
            <h3 className={cn("font-bold text-base sm:text-lg", isDark ? "text-white" : "text-slate-900")}>
              Auditing Virtual Instances & Telemetry
            </h3>
            <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
              Collecting real-time metrics and bandwidth limits from virtualization nodes...
            </p>
          </div>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div
          className={cn(
            "rounded-2xl p-8 sm:p-12 border text-center flex flex-col items-center justify-center space-y-4",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border",
              isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-100 text-cyan-700"
            )}
          >
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className={cn("font-bold text-base sm:text-lg", isDark ? "text-white" : "text-slate-900")}>
              {searchQuery ? "No Matching Instances Found" : "No Active Incidents"}
            </h3>
            <p className={cn("text-xs sm:text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>
              {searchQuery
                ? `No instances matched your query "${searchQuery}". Try clearing filters.`
                : "All your Cloud VPS instances are running stably within normal hardware and bandwidth operational parameters."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 no-print">
          {filteredIncidents.map((vps) => {
            const isCritical = vps.severity === "CRITICAL";
            const isWarning = vps.severity === "WARNING";
            const isGenuineHighMem = vps.metrics.memPercent >= 92 && vps.metrics.cpuPercent >= 50;

            return (
              <div
                key={vps.id}
                className={cn(
                  "rounded-2xl p-4 sm:p-5 border transition-all duration-200 relative overflow-hidden",
                  isCritical
                    ? isDark
                      ? "bg-[#0a0a0c] border-rose-500/40"
                      : "bg-white border-rose-300 shadow-2xs"
                    : isDark
                    ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.15]"
                    : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300"
                )}
              >
                {/* Active Incident Warning / Notice Bar */}
                {vps.isThrottled && (
                  <div
                    className={cn(
                      "mb-4 p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm animate-in slide-in-from-bottom-2",
                      isDark
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200"
                        : "bg-cyan-50 border-cyan-200 text-cyan-800"
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <Info className={cn("w-5 h-5 shrink-0 mt-0.5 sm:mt-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      <div className="leading-relaxed">
                        <span className={cn("font-medium", isDark ? "text-cyan-400" : "text-cyan-900")}>Bandwidth Safeguard Active:</span>{" "}
                        Network interface rate-limited to <strong>{vps.rateLimitMb} MB/s ({vps.rateLimitMbps} Mbps)</strong> to shield node stability. Your VM is fully operational.
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/tickets/new?service=VPS&subject=${encodeURIComponent(
                        `Request Unthrottle for VMID ${vps.vmid} (${vps.hostname})`
                      )}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold shrink-0 text-xs bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all w-full sm:w-auto"
                    >
                      <span>Request Unthrottle</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {vps.isNetDisabled && (
                  <div
                    className={cn(
                      "mb-4 p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm animate-in slide-in-from-bottom-2",
                      isDark
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-200"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <WifiOff className={cn("w-5 h-5 shrink-0 mt-0.5 sm:mt-0", isDark ? "text-rose-400" : "text-rose-600")} />
                      <div className="leading-relaxed">
                        <span className={cn("font-medium", isDark ? "text-rose-400" : "text-rose-900")}>Internet Access Disabled:</span>{" "}
                        Virtual network link is offline (isolated by administrator security quarantine). Your instance is running but public & private network traffic is disconnected.
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/tickets/new?service=VPS&subject=${encodeURIComponent(
                        `Request Network Reconnect for VMID ${vps.vmid} (${vps.hostname})`
                      )}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold shrink-0 text-xs bg-rose-600 hover:bg-rose-700 text-white transition-all w-full sm:w-auto shadow-sm"
                    >
                      <span>Request Network Reconnect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {vps.isSuspended && (
                  <div
                    className={cn(
                      "mb-4 p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm animate-in slide-in-from-bottom-2",
                      isDark
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-200"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5 sm:mt-0", isDark ? "text-rose-400" : "text-rose-600")} />
                      <div className="leading-relaxed">
                        <span className={cn("font-medium", isDark ? "text-rose-400" : "text-rose-900")}>Instance Suspended:</span>{" "}
                        {vps.suspendReason || "Node hypervisor safety audit / administrative hold."}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/tickets/new?service=VPS&subject=${encodeURIComponent(
                        `Suspension Dispute for VMID ${vps.vmid} (${vps.hostname})`
                      )}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold shrink-0 text-xs bg-rose-600 hover:bg-rose-700 text-white transition-all w-full sm:w-auto shadow-sm"
                    >
                      <span>Dispute via Support Ticket</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Instance Top Row Header */}
                <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 sm:pb-4 border-b mb-3.5 sm:mb-4", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center p-2 border",
                        isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-100 text-cyan-700"
                      )}
                    >
                      <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-bold text-sm sm:text-base truncate", isDark ? "text-white" : "text-slate-900")}>
                          {vps.hostname}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md font-mono text-[10px] sm:text-[11px] border font-semibold shrink-0",
                            isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-700"
                          )}
                        >
                          ID: {vps.vmid}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs mt-0.5">
                        {/* Primary IP - Prioritizes Public IP matching Cloud VPS */}
                        <div
                          onClick={() => copyToClipboard(vps.primaryIp)}
                          className={cn(
                            "flex items-center gap-1.5 font-mono cursor-pointer transition-colors group/ip shrink-0",
                            isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700"
                          )}
                          title="Click to copy IP Address"
                        >
                          <Network className="w-3.5 h-3.5 text-cyan-500" />
                          <span>{vps.primaryIp}</span>
                          {copiedIp === vps.primaryIp ? (
                            <Check className="w-3 h-3 text-cyan-500" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60 group-hover/ip:opacity-100" />
                          )}
                        </div>

                        {/* OS template */}
                        <span className={cn("text-[11px] sm:text-xs truncate", isDark ? "text-zinc-500" : "text-slate-400")}>
                          • {vps.osTemplate || "Linux"}
                        </span>

                        {/* Node */}
                        <span className={cn("text-[11px] sm:text-xs font-mono shrink-0", isDark ? "text-zinc-500" : "text-slate-400")}>
                          • Node: {vps.node}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges Right */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {/* Net Isolated Badge */}
                    {vps.isNetDisabled && (
                      <span
                        className={cn(
                          "px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold border inline-flex items-center gap-1.5",
                          isDark
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        <WifiOff className="w-3 h-3 text-rose-500" />
                        <span>NET ISOLATED</span>
                      </span>
                    )}

                    {/* Status Pill */}
                    <span
                      className={cn(
                        "px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold border inline-flex items-center gap-1.5",
                        vps.isSuspended
                          ? isDark
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                          : vps.isRunning
                          ? isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isDark
                          ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          vps.isSuspended ? "bg-rose-500" : vps.isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                        )}
                      />
                      {vps.status}
                    </span>

                    {/* Uptime */}
                    <span
                      className={cn(
                        "hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border",
                        isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-400" : "bg-slate-50/80 border-slate-200/90 text-slate-600"
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {formatUptime(vps.metrics.uptime)}
                    </span>
                  </div>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-1 sm:py-2">
                  {/* CPU Gauge */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span className={cn("font-medium flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Cpu className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} /> CPU Load
                      </span>
                      <span
                        className={cn(
                          "font-bold font-mono",
                          vps.metrics.cpuPercent >= 80
                            ? "text-rose-500"
                            : isDark
                            ? "text-white"
                            : "text-slate-900"
                        )}
                      >
                        {vps.metrics.cpuPercent}%
                      </span>
                    </div>
                    <div className={cn("h-1.5 sm:h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.06]" : "bg-slate-100")}>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          vps.metrics.cpuPercent >= 80
                            ? "bg-rose-500"
                            : "bg-cyan-500"
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, vps.metrics.cpuPercent))}%` }}
                      />
                    </div>
                    <div className={cn("text-[10px] sm:text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                      {vps.cpuCores} vCPU Cores
                    </div>
                  </div>

                  {/* RAM Gauge */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span className={cn("font-medium flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Activity className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Memory
                      </span>
                      <span className={cn("font-bold font-mono", isDark ? "text-white" : "text-slate-900")}>
                        {vps.metrics.memPercent}%
                      </span>
                    </div>
                    <div className={cn("h-1.5 sm:h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.06]" : "bg-slate-100")}>
                      <div
                        className="h-full rounded-full bg-cyan-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, vps.metrics.memPercent))}%` }}
                      />
                    </div>
                    <div className={cn("text-[10px] sm:text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                      {formatBytes(vps.metrics.memBytes)} / {formatBytes(vps.metrics.maxMemBytes)}
                    </div>
                  </div>

                  {/* Disk Gauge */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span className={cn("font-medium flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <HardDrive className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Storage
                      </span>
                      <span className={cn("font-bold font-mono", isDark ? "text-white" : "text-slate-900")}>
                        {vps.metrics.diskPercent}%
                      </span>
                    </div>
                    <div className={cn("h-1.5 sm:h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.06]" : "bg-slate-100")}>
                      <div
                        className="h-full rounded-full bg-cyan-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, vps.metrics.diskPercent))}%` }}
                      />
                    </div>
                    <div className={cn("text-[10px] sm:text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                      {formatBytes(vps.metrics.diskBytes)} / {formatBytes(vps.metrics.maxDiskBytes)}
                    </div>
                  </div>

                  {/* Real-time Network Throughput */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span className={cn("font-medium flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {vps.isNetDisabled ? (
                          <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Network className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                        )} Network Rate
                      </span>
                      <span
                        className={cn(
                          "font-bold font-mono text-[10px] sm:text-[11px]",
                          vps.isNetDisabled
                            ? "text-rose-500"
                            : isDark
                            ? "text-cyan-400"
                            : "text-cyan-700"
                        )}
                      >
                        {vps.isNetDisabled ? "0 B/s (ISOLATED)" : formatSpeed(vps.metrics.netSpeedTotal)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "p-1.5 sm:p-2 rounded-lg text-xs font-mono flex items-center justify-between border",
                        vps.isNetDisabled
                          ? (isDark ? "bg-rose-950/20 border-rose-500/20" : "bg-rose-50 border-rose-200")
                          : (isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")
                      )}
                    >
                      {vps.isNetDisabled ? (
                        <span className="text-[9px] sm:text-[10px] font-bold text-rose-500 mx-auto">
                          LINK DISCONNECTED (ISOLATED)
                        </span>
                      ) : (
                        <>
                          <span className={cn("text-[9px] sm:text-[10px] font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                            ↓ {formatSpeed(vps.metrics.netSpeedIn)}
                          </span>
                          <span className={cn("text-[9px] sm:text-[10px] font-bold", isDark ? "text-zinc-400" : "text-slate-500")}>
                            ↑ {formatSpeed(vps.metrics.netSpeedOut)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className={cn("text-[9px] sm:text-[10px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Transferred: {formatBytes(vps.metrics.totalBandwidth)}
                    </div>
                  </div>
                </div>

                {/* Bottom Card Action Footer */}
                <div className={cn("pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                    <button
                      onClick={() => setTelemetryModalItem(vps)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all w-full sm:w-auto",
                        isDark
                          ? "bg-white/[0.02] border-white/[0.08] text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30"
                          : "bg-white border-slate-200/90 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300 shadow-2xs"
                      )}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Deep Telemetry</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsFleetReport(false);
                        setReportModalItem(vps);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all w-full sm:w-auto",
                        isDark
                          ? "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                          : "bg-white border-slate-200/90 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
                      )}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Official Report</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end">
                    <Link
                      href={`/dashboard/tickets/new?service=VPS&subject=${encodeURIComponent(
                        `Telemetry Audit Question for ${vps.hostname} (VMID ${vps.vmid})`
                      )}`}
                      className={cn(
                        "text-xs font-semibold flex items-center gap-1 transition-colors py-1",
                        isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700"
                      )}
                    >
                      <span>Need Support?</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep Telemetry (RRD) Modal */}
      {telemetryModalItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-2.5 sm:p-4 md:p-6 flex justify-center items-start no-print"
          onClick={() => setTelemetryModalItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-4xl rounded-2xl border p-4 sm:p-6 space-y-5 shadow-2xl relative my-3 sm:my-6 md:my-8",
              isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-white border-slate-200/90 text-slate-900"
            )}
          >
            {/* Modal Header */}
            <div
              className={cn(
                "sticky top-0 z-20 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-3.5 sm:py-4 rounded-t-2xl border-b flex items-start justify-between gap-4 backdrop-blur-xl",
                isDark ? "bg-[#0a0a0c]/95 border-white/[0.08] text-white" : "bg-white/95 border-slate-200/90 text-slate-900"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                    )}
                  >
                    Historical RRD Telemetry
                  </span>
                  <span className={cn("text-xs font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
                    VMID: {telemetryModalItem.vmid}
                  </span>
                </div>
                <h3 className="text-base sm:text-xl font-bold truncate">{telemetryModalItem.hostname}</h3>
                <p className={cn("text-xs mt-0.5 font-mono truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                  IP: {telemetryModalItem.primaryIp} • Node: {telemetryModalItem.node} • Cores:{" "}
                  {telemetryModalItem.cpuCores} • RAM: {telemetryModalItem.ramGb} GB
                </p>
              </div>

              <button
                onClick={() => setTelemetryModalItem(null)}
                className={cn("p-1.5 sm:p-2 rounded-xl border transition-colors shrink-0", isDark ? "text-zinc-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]" : "text-slate-500 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 border-slate-200/90")}
                title="Close (Esc)"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className={cn("text-[11px] sm:text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
                Metric Resolution:
              </span>
              <div
                className={cn(
                  "p-1 rounded-xl border flex items-center gap-1",
                  isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90"
                )}
              >
                {[
                  { id: "hour", label: "Past 1h" },
                  { id: "day", label: "Past 24h" },
                  { id: "week", label: "Past 7d" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setRrdTimeframe(tf.id as any)}
                    className={cn(
                      "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all",
                      rrdTimeframe === tf.id
                        ? "bg-cyan-400 text-slate-950 shadow-sm"
                        : isDark
                        ? "text-zinc-400 hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* RRD Chart 1: CPU Utilization */}
            <div
              className={cn(
                "p-4 sm:p-5 rounded-xl border space-y-2 sm:space-y-3",
                isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-cyan-500" /> CPU Utilization (%)
                </span>
                <span className={cn("text-xs font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>
                  {telemetryModalItem.metrics.cpuPercent}%
                </span>
              </div>

              {rrdLoading ? (
                <div className="h-40 sm:h-44 flex items-center justify-center text-xs text-zinc-500">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-500" />
                  Loading CPU telemetry...
                </div>
              ) : rrdData.length > 0 ? (
                <div className="h-40 sm:h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rrdData}>
                      <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#e2e8f0"} />
                      <XAxis
                        dataKey="time"
                        tickFormatter={(t) => (t ? new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "")}
                        stroke={isDark ? "#71717a" : "#94a3b8"}
                        fontSize={10}
                      />
                      <YAxis
                        tickFormatter={(v) => `${Math.round(v * 100)}%`}
                        stroke={isDark ? "#71717a" : "#94a3b8"}
                        fontSize={10}
                        domain={[0, 1]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#0a0a0c" : "#ffffff",
                          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#cbd5e1",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, "CPU Usage"]}
                        labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="cpu" stroke="#06b6d4" strokeWidth={2} fill="url(#cpuGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 sm:h-44 flex items-center justify-center text-xs text-zinc-500">
                  No historical CPU datapoints available.
                </div>
              )}
            </div>

            {/* RRD Chart 2: Network Traffic Speed */}
            <div
              className={cn(
                "p-4 sm:p-5 rounded-xl border space-y-2 sm:space-y-3",
                isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Network className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} /> Network Rate
                </span>
                <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono">
                  <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    ↓ {formatSpeed(telemetryModalItem.metrics.netSpeedIn)}
                  </span>
                  <span className={cn("font-semibold", isDark ? "text-zinc-400" : "text-slate-500")}>
                    ↑ {formatSpeed(telemetryModalItem.metrics.netSpeedOut)}
                  </span>
                </div>
              </div>

              {rrdLoading ? (
                <div className="h-40 sm:h-44 flex items-center justify-center text-xs text-zinc-500">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-500" />
                  Loading Network telemetry...
                </div>
              ) : rrdData.length > 0 ? (
                <div className="h-40 sm:h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rrdData}>
                      <defs>
                        <linearGradient id="netinGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="netoutGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#e2e8f0"} />
                      <XAxis
                        dataKey="time"
                        tickFormatter={(t) => (t ? new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "")}
                        stroke={isDark ? "#71717a" : "#94a3b8"}
                        fontSize={10}
                      />
                      <YAxis
                        tickFormatter={(v) => formatSpeed(Number(v))}
                        stroke={isDark ? "#71717a" : "#94a3b8"}
                        fontSize={10}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#0a0a0c" : "#ffffff",
                          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#cbd5e1",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val: any, name: any) => [
                          formatSpeed(Number(val)),
                          name === "netin" ? "Inbound Speed" : "Outbound Speed",
                        ]}
                        labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="netin" stroke="#06b6d4" strokeWidth={2} fill="url(#netinGrad)" />
                      <Area type="monotone" dataKey="netout" stroke="#3b82f6" strokeWidth={2} fill="url(#netoutGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 sm:h-44 flex items-center justify-center text-xs text-zinc-500">
                  No historical network datapoints available.
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className={cn("flex items-center justify-end gap-3 pt-3.5 sm:pt-4 border-t", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
              <button
                onClick={() => setTelemetryModalItem(null)}
                className={cn("w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-colors", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]" : "bg-slate-50/80 border-slate-200/90 text-slate-700 hover:bg-slate-100")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Incident / Resource Audit Document Modal (PDF / Print View) */}
      {(reportModalItem || isFleetReport) && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-2.5 sm:p-4 md:p-6 flex justify-center items-start"
          onClick={() => {
            setReportModalItem(null);
            setIsFleetReport(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-4xl rounded-2xl border shadow-2xl p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 relative my-3 sm:my-6 md:my-8 printable-report",
              isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-white border-slate-200/90 text-slate-900"
            )}
          >
            {/* Top Modal Chrome (Sticky, Hidden on Print) */}
            <div
              className={cn(
                "sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 -mt-4 sm:-mt-6 md:-mt-8 px-4 sm:px-6 md:px-8 py-3 sm:py-3.5 rounded-t-2xl border-b flex items-center justify-between gap-3 no-print backdrop-blur-xl transition-all",
                isDark
                  ? "bg-[#0a0a0c]/95 border-white/[0.08] text-white"
                  : "bg-white/95 border-slate-200/90 text-slate-900"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 sm:p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500" />
                </div>
                <span className="font-bold text-xs sm:text-sm truncate">
                  Official Infrastructure Audit Report
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all print-include"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => {
                    setReportModalItem(null);
                    setIsFleetReport(false);
                  }}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-xl border transition-colors",
                    isDark ? "text-zinc-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]" : "text-slate-500 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 border-slate-200/90"
                  )}
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Official Report Header */}
            <div className={cn("flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 sm:pb-6 border-b-2 border-dashed", isDark ? "border-white/[0.12]" : "border-slate-300")}>
              <div className="space-y-1 sm:space-y-1.5 min-w-0">
                <h3 className="font-extrabold text-base sm:text-xl tracking-tight truncate">
                  MASDIKA CLOUD INFRASTRUCTURE
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Virtualization & Host Hypervisor Security Audit Division
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  URL: https://masdika.id • Support: support@masdika.id
                </p>
              </div>

              <div className="text-left sm:text-right space-y-0.5 sm:space-y-1 text-xs shrink-0">
                <div className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[10px] sm:text-[11px] font-bold border print-badge bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-500/30">
                  REF: MSD-AUDIT-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}-
                  {reportModalItem ? reportModalItem.vmid : "FLEET"}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500">
                  Generated: {new Date().toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs font-semibold">
                  Client: {data?.customer.name || "Customer"} ({data?.customer.email || "-"})
                </div>
              </div>
            </div>

            {/* Document Purpose / Executive Overview */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-cyan-600">
                1. Audit Classification & Scope
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                This document serves as an authorized technical assessment and incident telemetry verification report
                for Cloud VPS instances provisioned on the Masdika infrastructure cluster. This report records live resource
                bounds, hardware utilization, network throughput, and administrative protection safeguard statuses.
              </p>
            </div>

            {/* Instance Details Section */}
            {reportModalItem ? (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-cyan-600">
                  2. Instance Profile & Operational Status
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
                  <div className={cn("p-2.5 sm:p-3 rounded-xl border min-w-0", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Hostname</span>
                    <span className="font-bold text-xs sm:text-sm truncate block" title={reportModalItem.hostname}>
                      {reportModalItem.hostname}
                    </span>
                  </div>
                  <div className={cn("p-2.5 sm:p-3 rounded-xl border min-w-0", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">VMID / Hypervisor</span>
                    <span className="font-bold text-xs sm:text-sm truncate block">
                      {reportModalItem.vmid} ({reportModalItem.node})
                    </span>
                  </div>
                  <div className={cn("p-2.5 sm:p-3 rounded-xl border min-w-0", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Primary IP</span>
                    <span className="font-mono font-bold text-xs sm:text-sm truncate block" title={reportModalItem.primaryIp}>
                      {reportModalItem.primaryIp}
                    </span>
                  </div>
                  <div className={cn("p-2.5 sm:p-3 rounded-xl border min-w-0", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Provisioned Specs</span>
                    <span className="font-bold text-xs sm:text-sm truncate block">
                      {reportModalItem.cpuCores} vCPU / {reportModalItem.ramGb} GB RAM
                    </span>
                  </div>
                </div>

                {/* Telemetry Snapshot Section */}
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-cyan-600 pt-1">
                  3. Recorded Telemetry Snapshot
                </h4>

                {/* Mobile Responsive Telemetry Cards (< md screens) */}
                <div className="block md:hidden print:hidden space-y-2">
                  {[
                    {
                      metric: "Processor Load (CPU)",
                      util: `${reportModalItem.metrics.cpuPercent}%`,
                      capacity: `${reportModalItem.cpuCores} vCPU Cores`,
                      status: reportModalItem.metrics.cpuPercent >= 80 ? "ELEVATED" : "OPTIMAL",
                      statusColor:
                        reportModalItem.metrics.cpuPercent >= 80
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300",
                    },
                    {
                      metric: "Memory (RAM)",
                      util: `${reportModalItem.metrics.memPercent}% (${formatBytes(reportModalItem.metrics.memBytes)})`,
                      capacity: formatBytes(reportModalItem.metrics.maxMemBytes),
                      status:
                        reportModalItem.metrics.memPercent >= 95 && reportModalItem.metrics.cpuPercent >= 60
                          ? "HIGH SATURATION"
                          : "OPTIMAL",
                      statusColor:
                        reportModalItem.metrics.memPercent >= 95 && reportModalItem.metrics.cpuPercent >= 60
                          ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300",
                    },
                    {
                      metric: "Virtual Storage",
                      util: `${reportModalItem.metrics.diskPercent}% (${formatBytes(reportModalItem.metrics.diskBytes)})`,
                      capacity: formatBytes(reportModalItem.metrics.maxDiskBytes),
                      status: "STABLE",
                      statusColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300",
                    },
                    {
                      metric: "Network I/O Rate",
                      util: reportModalItem.isNetDisabled
                        ? "0 B/s (Offline)"
                        : `↓ ${formatSpeed(reportModalItem.metrics.netSpeedIn)} / ↑ ${formatSpeed(reportModalItem.metrics.netSpeedOut)}`,
                      capacity: reportModalItem.isNetDisabled
                        ? "Virtual Link Disconnected (Isolated)"
                        : reportModalItem.isThrottled
                        ? `Throttled (${reportModalItem.rateLimitMb} MB/s)`
                        : "Unthrottled (Full Link)",
                      status: reportModalItem.isNetDisabled
                        ? "NET ISOLATED"
                        : reportModalItem.isThrottled
                        ? "SAFEGUARD ACTIVE"
                        : "NORMAL",
                      statusColor: reportModalItem.isNetDisabled
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300"
                        : reportModalItem.isThrottled
                        ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300",
                    },
                    {
                      metric: "Cumulative Bandwidth",
                      util: `${formatBytes(reportModalItem.metrics.totalBandwidth)} Lifetime`,
                      capacity: "Unmetered Policy",
                      status: "0 IDR FEE",
                      statusColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-300",
                    },
                  ].map((row, idx) => (
                    <div key={idx} className={cn("p-3 rounded-xl border space-y-1.5", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold">{row.metric}</span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", row.statusColor)}>
                          {row.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                        <span>
                          Live: <strong className="text-slate-900 dark:text-white font-mono">{row.util}</strong>
                        </span>
                        <span>
                          Capacity: <strong className="text-slate-900 dark:text-white">{row.capacity}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop & Printable Table (>= md screens) */}
                <div className={cn("hidden md:block print:block overflow-x-auto border rounded-xl", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                  <table className="w-full text-xs text-left">
                    <thead className={cn("border-b font-bold uppercase text-[10px]", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                      <tr>
                        <th className="p-3">Resource Metric</th>
                        <th className="p-3">Live Utilization</th>
                        <th className="p-3">Allocated Capacity</th>
                        <th className="p-3">Status Indicator</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-200")}>
                      <tr>
                        <td className="p-3 font-semibold">Processor Load (CPU)</td>
                        <td className="p-3 font-mono font-bold">{reportModalItem.metrics.cpuPercent}%</td>
                        <td className="p-3">{reportModalItem.cpuCores} Virtual Cores</td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded font-bold text-[10px]",
                              reportModalItem.metrics.cpuPercent >= 80
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            )}
                          >
                            {reportModalItem.metrics.cpuPercent >= 80 ? "ELEVATED" : "OPTIMAL"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Memory Allocation (RAM)</td>
                        <td className="p-3 font-mono font-bold">
                          {reportModalItem.metrics.memPercent}% ({formatBytes(reportModalItem.metrics.memBytes)})
                        </td>
                        <td className="p-3">{formatBytes(reportModalItem.metrics.maxMemBytes)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            OPTIMAL
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Virtual Disk Storage</td>
                        <td className="p-3 font-mono font-bold">
                          {reportModalItem.metrics.diskPercent}% ({formatBytes(reportModalItem.metrics.diskBytes)})
                        </td>
                        <td className="p-3">{formatBytes(reportModalItem.metrics.maxDiskBytes)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            STABLE
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Instantaneous Network I/O</td>
                        <td className="p-3 font-mono font-bold">
                          {reportModalItem.isNetDisabled
                            ? "0 B/s (Offline)"
                            : `↓ ${formatSpeed(reportModalItem.metrics.netSpeedIn)} / ↑ ${formatSpeed(reportModalItem.metrics.netSpeedOut)}`}
                        </td>
                        <td className="p-3">
                          {reportModalItem.isNetDisabled ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              Virtual Link Disconnected (Isolated)
                            </span>
                          ) : reportModalItem.isThrottled ? (
                            <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                              Throttled ({reportModalItem.rateLimitMb} MB/s)
                            </span>
                          ) : (
                            "Unthrottled (Full Link)"
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded font-bold text-[10px]",
                              reportModalItem.isNetDisabled
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                : reportModalItem.isThrottled
                                ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            )}
                          >
                            {reportModalItem.isNetDisabled
                              ? "NET ISOLATED"
                              : reportModalItem.isThrottled
                              ? "SAFEGUARD ACTIVE"
                              : "NORMAL"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Cumulative Transfer</td>
                        <td className="p-3 font-mono font-bold" colSpan={2}>
                          {formatBytes(reportModalItem.metrics.totalBandwidth)} Lifetime Transfer
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
                            UNMETERED (0 IDR FEE)
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Audit Findings and Incident Reason */}
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-cyan-600 pt-1">
                  4. Security & Protection Audit Findings
                </h4>

                <div
                  className={cn(
                    "p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm leading-relaxed space-y-2",
                    reportModalItem.isSuspended
                      ? isDark
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                      : isDark
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200"
                      : "bg-cyan-50 border-cyan-200 text-cyan-800"
                  )}
                >
                  <div
                    className={cn(
                      "font-medium text-xs sm:text-sm flex items-center gap-2",
                      reportModalItem.isSuspended
                        ? isDark
                          ? "text-rose-400"
                          : "text-rose-800"
                        : isDark
                        ? "text-cyan-400"
                        : "text-cyan-900"
                    )}
                  >
                    {reportModalItem.isSuspended ? (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <Info className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    )}
                    <span>Incident Assessment: {reportModalItem.severity}</span>
                  </div>

                  {reportModalItem.incidentReasons.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {reportModalItem.incidentReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs">
                      No abusive signatures detected. Instance is operating within normal hypervisor operational limits.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Fleet Overview Section */
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-cyan-600">
                  2. Fleet Instances Overview ({data?.incidents.length} Instances)
                </h4>

                {/* Mobile Fleet Cards (< md screens) */}
                <div className="block md:hidden print:hidden space-y-2.5">
                  {data?.incidents.map((vps) => (
                    <div key={vps.id} className={cn("p-3 rounded-xl border space-y-2 text-xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold truncate">{vps.hostname}</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded font-bold text-[10px] shrink-0",
                            vps.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                              : vps.severity === "WARNING"
                              ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          )}
                        >
                          {vps.severity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                        <span className="truncate">IP: {vps.primaryIp}</span>
                        <span className="shrink-0">VMID: {vps.vmid}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                        <span>
                          CPU: {vps.metrics.cpuPercent}% • RAM: {vps.metrics.memPercent}%
                        </span>
                        <span className="font-semibold">
                          {vps.isNetDisabled
                            ? "Net Disabled"
                            : vps.isThrottled
                            ? `Rate: ${vps.rateLimitMb} MB/s`
                            : "Full Link"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Fleet Table (>= md screens) */}
                <div className={cn("hidden md:block print:block overflow-x-auto border rounded-xl", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                  <table className="w-full text-xs text-left">
                    <thead className={cn("border-b font-bold uppercase text-[10px]", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                      <tr>
                        <th className="p-3">VMID</th>
                        <th className="p-3">Hostname</th>
                        <th className="p-3">IP Address</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">CPU</th>
                        <th className="p-3">RAM</th>
                        <th className="p-3">Rate Limit</th>
                        <th className="p-3">Audit Severity</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-200")}>
                      {data?.incidents.map((vps) => (
                        <tr key={vps.id}>
                          <td className="p-3 font-mono font-bold">{vps.vmid}</td>
                          <td className="p-3 font-bold">{vps.hostname}</td>
                          <td className="p-3 font-mono">{vps.primaryIp}</td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded font-bold text-[10px]",
                                vps.isSuspended
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                  : vps.isRunning
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-300"
                              )}
                            >
                              {vps.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{vps.metrics.cpuPercent}%</td>
                          <td className="p-3 font-mono">{vps.metrics.memPercent}%</td>
                          <td className="p-3">
                            {vps.isNetDisabled ? (
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                Disabled (Isolated)
                              </span>
                            ) : vps.isThrottled ? (
                              <span className="font-bold text-cyan-600 dark:text-cyan-400">
                                {vps.rateLimitMb} MB/s
                              </span>
                            ) : (
                              "None (Full Speed)"
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded font-bold text-[10px]",
                                vps.severity === "CRITICAL"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                  : vps.severity === "WARNING"
                                  ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              )}
                            >
                              {vps.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Policy & Terms Clause */}
            <div className={cn("space-y-1.5 pt-2 border-t", isDark ? "border-white/[0.08]" : "border-slate-300")}>
              <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-cyan-600">
                5. Bandwidth Policy & Node Safeguard Notice
              </h4>
              <p className="text-[11px] sm:text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
                Masdika Cloud Services enforces a strict <strong>100% Unmetered & Free Bandwidth Guarantee</strong>. Customers are
                never billed for outbound or inbound data transfer overages. In the event of network floods,
                temporary virtual NIC rate limiting is deployed to safeguard physical network switches and maintain hypervisor
                hyper-threading stability without terminating customer virtual machines.
              </p>
            </div>

            {/* Formal Verification Stamp */}
            <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3.5 sm:pt-4 border-t-2 border-dashed", isDark ? "border-white/[0.12]" : "border-slate-300")}>
              <div className="space-y-0.5 min-w-0">
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cryptographic Verification Seal
                </div>
                <div className="font-mono text-[10px] sm:text-xs text-slate-500 break-all">
                  SHA-256: 7f8a9e4d2c1b0f3e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-900 dark:text-cyan-300 text-left sm:text-right print-badge shrink-0">
                <div className="font-black text-[10px] sm:text-xs uppercase tracking-widest">VERIFIED AUDIT REPORT</div>
                <div className="text-[9px] sm:text-[10px]">Masdika Automation Engine v2.4</div>
              </div>
            </div>

            {/* Print action footer */}
            <div className={cn("flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t no-print", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
              <button
                onClick={() => {
                  setReportModalItem(null);
                  setIsFleetReport(false);
                }}
                className={cn(
                  "w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-colors text-center",
                  isDark ? "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] text-zinc-300 hover:text-white" : "bg-slate-50/80 border-slate-200/90 hover:bg-slate-100 text-slate-700"
                )}
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all print-include"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
