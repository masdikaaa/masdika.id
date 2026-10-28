"use client";

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import {
  Server,
  Play,
  Square,
  Power,
  RotateCcw,
  Activity,
  RefreshCw,
  Terminal,
  AlertTriangle,
  X,
  Settings,
  Search,
  HardDrive,
  Cpu,
  Network,
  Check,
  Copy,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";

const getOsIcon = (osTemplate: string) => {
  const os = osTemplate?.toLowerCase() || "";
  if (os.includes("ubuntu")) return "https://cdn.simpleicons.org/ubuntu/E95420";
  if (os.includes("debian")) return "https://cdn.simpleicons.org/debian/A81D33";
  if (os.includes("centos")) return "https://cdn.simpleicons.org/centos/262577";
  if (os.includes("almalinux") || os.includes("alma"))
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg";
  if (os.includes("rocky")) return "https://cdn.simpleicons.org/rockylinux/10B981";
  if (os.includes("alpine")) return "https://www.vectorlogo.zone/logos/alpinelinux/alpinelinux-icon.svg";
  if (os.includes("fedora")) return "https://cdn.simpleicons.org/fedora/3b82f6";
  if (os.includes("windows"))
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg";
  if (os.includes("freebsd")) return "https://cdn.simpleicons.org/freebsd/AB2B28";
  if (os.includes("mikrotik") || os.includes("chr")) {
    return "https://cdn.worldvectorlogo.com/logos/mikrotik.svg";
  }
  return null;
};

export default function MyVpsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [vpsList, setVpsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [confirmModal, setConfirmModal] = useState<{ vpsId: number; action: string; hostname: string } | null>(null);
  const [consoleLoading, setConsoleLoading] = useState<number | null>(null);
  const [selectedVps, setSelectedVps] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [actionConfirm, setActionConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RUNNING" | "STOPPED">("ALL");

  // Pagination & Filter
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const [searchFilter, setSearchFilter] = useUrlString<string>("searchFilter", "");
  const itemsPerPage = 10;

  const fetchVps = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/user/vps", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setVpsList(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVps();
    const interval = setInterval(() => fetchVps(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (vpsId: number, action: string) => {
    setConfirmModal(null);

    setActionLoading((prev) => ({ ...prev, [vpsId]: true }));
    try {
      const res = await fetch("/api/user/vps/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId, action }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Action '${action}' executed successfully.`);
        fetchVps();
      } else {
        toast.error(data.error || "Failed to execute action");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading((prev) => ({ ...prev, [vpsId]: false }));
    }
  };

  const openConsole = async (vpsId: number) => {
    setConsoleLoading(vpsId);
    try {
      const res = await fetch("/api/user/vps/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId }),
      });
      const data = await res.json();
      if (res.ok) {
        window.open(data.consolePageUrl, "_blank", "width=1024,height=700,noopener");
      } else {
        toast.error(data.error || "Failed to open console");
      }
    } catch (e) {
      toast.error("Failed to connect to console");
    } finally {
      setConsoleLoading(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedVps.length === 0) return;
    setActionConfirm(action);
  };

  const executeAction = async () => {
    if (!actionConfirm) return;
    const action = actionConfirm;
    setActionConfirm(null);
    setBulkLoading(true);
    let successCount = 0;
    let lastError = "";

    if (action === "delete") {
      for (const id of selectedVps) {
        try {
          const res = await fetch(`/api/user/vps/${id}`, { method: "DELETE" });
          if (res.ok) {
            successCount++;
          } else {
            const data = await res.json().catch(() => ({}));
            lastError = data.error || "Failed to delete instance";
          }
        } catch (e: any) {
          lastError = e.message || "Network error";
        }
      }

      if (successCount === selectedVps.length) {
        toast.success(`Successfully deleted ${successCount} VPS instances.`);
      } else if (successCount > 0) {
        toast.warning(`Deleted ${successCount} instances, but some failed: ${lastError}`);
      } else {
        toast.error(`Failed to delete: ${lastError}`);
      }
    } else {
      for (const id of selectedVps) {
        try {
          const res = await fetch("/api/user/vps/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vpsId: id, action }),
          });
          if (res.ok) {
            successCount++;
          } else {
            const data = await res.json().catch(() => ({}));
            lastError = data.error || `Failed to execute ${action}`;
          }
        } catch (e: any) {
          lastError = e.message || "Network error";
        }
      }

      if (successCount === selectedVps.length) {
        toast.success(`Successfully executed ${action} on ${successCount} instances.`);
      } else if (successCount > 0) {
        toast.warning(`Executed on ${successCount} instances, but some failed: ${lastError}`);
      } else {
        toast.error(`Failed to execute ${action}: ${lastError}`);
      }
    }

    setBulkLoading(false);
    fetchVps();
    setSelectedVps([]);
  };

  const getActionConfig = (act: string) => {
    switch (act) {
      case "start":
        return {
          icon: <Play className="w-5 h-5 text-emerald-400" />,
          bg: "bg-emerald-500/10 border border-emerald-500/20",
          buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
          title: "Start",
          desc: "Are you sure you want to start the selected VPS instances?",
        };
      case "shutdown":
        return {
          icon: <Power className="w-5 h-5 text-amber-400" />,
          bg: "bg-amber-500/10 border border-amber-500/20",
          buttonClass: "bg-amber-500 hover:bg-amber-400 text-slate-950",
          title: "Shutdown",
          desc: "Are you sure you want to gracefully shutdown the selected VPS instances?",
        };
      case "reboot":
        return {
          icon: <RotateCcw className="w-5 h-5 text-cyan-400" />,
          bg: "bg-cyan-500/10 border border-cyan-500/20",
          buttonClass: "bg-cyan-400 hover:bg-cyan-300 text-slate-950",
          title: "Reboot",
          desc: "Are you sure you want to reboot the selected VPS instances?",
        };
      case "delete":
      default:
        return {
          icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
          bg: "bg-rose-500/10 border border-rose-500/20",
          buttonClass: "bg-rose-500 hover:bg-rose-400 text-white",
          title: "Delete",
          desc: "This action is permanent and cannot be undone.",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const runningCount = vpsList.filter((v) => v.liveStatus?.status === "running").length;
  const stoppedCount = vpsList.length - runningCount;

  const filteredList = vpsList.filter((v) => {
    const matchesSearch =
      !searchFilter ||
      v.hostname.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.assignedIps.some((ip: any) => ip.ipAddress.includes(searchFilter) || ip.publicIp?.includes(searchFilter)) ||
      v.id.toString().includes(searchFilter);

    const vRunning = v.liveStatus?.status === "running";
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "RUNNING" && vRunning) ||
      (statusFilter === "STOPPED" && !vRunning);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full space-y-5 pb-10">
      {/* Compact Architectural Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Virtual Private Servers
            </h1>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border",
                  isDark
                    ? "bg-white/[0.03] border-white/[0.08] text-zinc-300"
                    : "bg-white border-slate-200 text-slate-700"
                )}
              >
                {vpsList.length} Total
              </span>
              {runningCount > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                    isDark
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {runningCount} Running
                </span>
              )}
            </div>
          </div>
          <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage your cloud compute instances, power lifecycle, and web VNC console access.
          </p>
        </div>

        {/* Search, Refresh & Deploy Controls */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search
              className={cn(
                "w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
                isDark ? "text-zinc-500" : "text-slate-400"
              )}
            />
            <input
              type="text"
              placeholder="Filter by ID, hostname, or IP..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full border rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm focus:outline-none transition-all",
                isDark
                  ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500/40"
                  : "bg-white border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 shadow-2xs"
              )}
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter("");
                  setCurrentPage(1);
                }}
                className={cn(
                  "absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10",
                  isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => fetchVps(true)}
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0",
              isDark
                ? "bg-[#0a0a0c] text-zinc-300 hover:text-white border-white/[0.08] hover:bg-white/[0.04]"
                : "bg-white text-slate-700 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50 shadow-2xs"
            )}
            title="Refresh Status"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-cyan-400")} />
          </button>

          <Link
            href="/dashboard/checkout?service=vps"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs shrink-0 text-slate-950"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Deploy Instance</span>
            <span className="sm:hidden">Deploy</span>
          </Link>
        </div>
      </div>

      {vpsList.length === 0 ? (
        <div
          className={cn(
            "border rounded-2xl p-12 text-center",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border",
              isDark ? "bg-white/[0.03] border-white/[0.08] text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
            )}
          >
            <Server className="w-6 h-6" />
          </div>
          <h3 className={cn("text-base font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
            No Virtual Private Servers Found
          </h3>
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
            You don&apos;t have any active VPS instances yet. Deploy your first high-performance cloud server in seconds.
          </p>
          <Link
            href="/dashboard/checkout?service=vps"
            className="font-bold text-slate-950 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 transition-all shadow-2xs inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Deploy New VPS
          </Link>
        </div>
      ) : (
        <div
          className={cn(
            "border rounded-2xl overflow-hidden flex flex-col",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          {/* Unified Table Filter & Bulk Actions Bar */}
          <div
            className={cn(
              "border-b px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3",
              isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-100 bg-slate-50/60"
            )}
          >
            {/* Status Filter Segmented Pills */}
            <div
              className={cn(
                "inline-flex items-center p-0.5 rounded-xl border",
                isDark ? "bg-black/40 border-white/[0.06]" : "bg-slate-100/80 border-slate-200/80"
              )}
            >
              {(
                [
                  { id: "ALL", label: "All", count: vpsList.length },
                  { id: "RUNNING", label: "Running", count: runningCount },
                  { id: "STOPPED", label: "Stopped", count: stoppedCount },
                ] as const
              ).map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                      active
                        ? isDark
                          ? "bg-white/[0.08] text-white shadow-2xs"
                          : "bg-white text-slate-900 shadow-2xs"
                        : isDark
                        ? "text-zinc-400 hover:text-zinc-200"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded",
                        active
                          ? isDark
                            ? "bg-cyan-500/15 text-cyan-300"
                            : "bg-cyan-50 text-cyan-700"
                          : isDark
                          ? "text-zinc-500"
                          : "text-slate-400"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Side: Bulk Actions OR Instance Counter */}
            {selectedVps.length > 0 ? (
              (() => {
                const selectedVpsData = vpsList.filter((v) => selectedVps.includes(v.id));
                const canStart = selectedVpsData.some((v) => v.liveStatus?.status !== "running");
                const canShutdownOrReboot = selectedVpsData.some((v) => v.liveStatus?.status === "running");

                return (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                    <span
                      className={cn(
                        "text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border",
                        isDark
                          ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/20"
                          : "text-cyan-800 bg-cyan-50 border-cyan-200"
                      )}
                    >
                      {selectedVps.length} selected
                    </span>
                    {canStart && (
                      <button
                        onClick={() => handleBulkAction("start")}
                        disabled={bulkLoading}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50",
                          isDark
                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                        )}
                      >
                        <Play className="w-3 h-3" /> Start
                      </button>
                    )}
                    {canShutdownOrReboot && (
                      <button
                        onClick={() => handleBulkAction("shutdown")}
                        disabled={bulkLoading}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50",
                          isDark
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20"
                            : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                        )}
                      >
                        <Power className="w-3 h-3" /> Shutdown
                      </button>
                    )}
                    {canShutdownOrReboot && (
                      <button
                        onClick={() => handleBulkAction("reboot")}
                        disabled={bulkLoading}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50",
                          isDark
                            ? "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border-white/[0.08]"
                            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        <RotateCcw className="w-3 h-3" /> Reboot
                      </button>
                    )}
                    <button
                      onClick={() => handleBulkAction("delete")}
                      disabled={bulkLoading}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50",
                        isDark
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200"
                      )}
                    >
                      <AlertTriangle className="w-3 h-3" /> Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedVps([])}
                      className={cn(
                        "p-1 rounded-lg transition-colors",
                        isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-700"
                      )}
                      title="Clear selection"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                Showing <span className="font-mono font-semibold">{paginatedList.length}</span> of{" "}
                <span className="font-mono font-semibold">{filteredList.length}</span> instances
              </div>
            )}
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr
                  className={cn(
                    "border-b text-[11px] font-semibold uppercase tracking-wider",
                    isDark
                      ? "border-white/[0.06] bg-white/[0.01] text-zinc-400"
                      : "border-slate-200/80 bg-slate-50/80 text-slate-500"
                  )}
                >
                  <th className="py-3 pl-5 pr-2 w-11">
                    <button
                      type="button"
                      onClick={() => {
                        const isAllSelected =
                          paginatedList.length > 0 && selectedVps.length === paginatedList.length;
                        if (!isAllSelected) {
                          setSelectedVps(paginatedList.map((v) => v.id));
                        } else {
                          setSelectedVps([]);
                        }
                      }}
                      className={cn(
                        "w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all border",
                        paginatedList.length > 0 && selectedVps.length === paginatedList.length
                          ? "bg-cyan-400 border-cyan-400 text-slate-950"
                          : isDark
                          ? "bg-white/[0.02] border-white/[0.15] hover:border-cyan-400/60"
                          : "bg-white border-slate-300 hover:border-cyan-500"
                      )}
                    >
                      {paginatedList.length > 0 && selectedVps.length === paginatedList.length && (
                        <Check className="w-3 h-3 stroke-[3]" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Instance & Network</th>
                  <th className="py-3 px-3">Hardware Allocation</th>
                  <th className="py-3 px-3">Node & Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right">Controls & Console</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className={cn("p-10 text-center text-sm", isDark ? "text-zinc-500" : "text-slate-500")}
                    >
                      No instances match your current filter.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((vps) => {
                    const liveStatus = vps.liveStatus?.status;
                    const isRunning = liveStatus === "running";
                    const isProvisioning = vps.status === "PROVISIONING" || vps.status === "PENDING";
                    const isSuspended = vps.status === "SUSPENDED";
                    const isTerminated = vps.status === "TERMINATED";
                    const displayStatus = isProvisioning
                      ? "Deploying"
                      : isSuspended
                      ? "Suspended"
                      : liveStatus || vps.status;
                    const isSelected = selectedVps.includes(vps.id);
                    const ipAddr =
                      vps.assignedIps?.[0]?.publicIp ||
                      vps.assignedIps?.[0]?.ipAddress ||
                      (vps.status === "PENDING" ? "Provisioning IP" : "No IP");

                    return (
                      <tr
                        key={vps.id}
                        className={cn(
                          "transition-colors group",
                          isSelected
                            ? isDark
                              ? "bg-cyan-500/[0.04]"
                              : "bg-cyan-50/40"
                            : isDark
                            ? "hover:bg-white/[0.015]"
                            : "hover:bg-slate-50/70"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 pl-5 pr-2 align-middle">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isSelected) {
                                setSelectedVps((prev) => [...prev, vps.id]);
                              } else {
                                setSelectedVps((prev) => prev.filter((id) => id !== vps.id));
                              }
                            }}
                            className={cn(
                              "w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all border",
                              isSelected
                                ? "bg-cyan-400 border-cyan-400 text-slate-950"
                                : isDark
                                ? "bg-white/[0.02] border-white/[0.15] hover:border-cyan-400/60"
                                : "bg-white border-slate-300 hover:border-cyan-500"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        </td>

                        {/* Instance (OS Icon, Hostname, #ID, IP) */}
                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={cn(
                                "w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center p-2",
                                isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-slate-50 border-slate-200/80"
                              )}
                            >
                              {getOsIcon(vps.osTemplate) ? (
                                <img
                                  referrerPolicy="no-referrer"
                                  src={getOsIcon(vps.osTemplate)!}
                                  alt="OS"
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <Server className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/dashboard/vps/${vps.id}`}
                                  className={cn(
                                    "font-bold text-sm truncate hover:underline",
                                    isDark ? "text-white hover:text-cyan-400" : "text-slate-900 hover:text-cyan-700"
                                  )}
                                >
                                  {vps.hostname}
                                </Link>
                                <span
                                  className={cn(
                                    "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                                    isDark
                                      ? "bg-white/[0.03] border-white/[0.07] text-zinc-500"
                                      : "bg-slate-100 border-slate-200 text-slate-500"
                                  )}
                                >
                                  #{vps.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {vps.assignedIps.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(ipAddr);
                                      toast.success("IP copied to clipboard");
                                    }}
                                    className={cn(
                                      "text-xs font-mono whitespace-nowrap cursor-pointer transition-colors inline-flex items-center gap-1.5 group/ip",
                                      isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700"
                                    )}
                                    title="Copy IP Address"
                                  >
                                    {ipAddr}
                                    <Copy className="w-3 h-3 opacity-0 group-hover/ip:opacity-100 transition-opacity" />
                                  </button>
                                ) : (
                                  <span
                                    className={cn(
                                      "text-xs font-mono whitespace-nowrap",
                                      isDark ? "text-zinc-500" : "text-slate-400"
                                    )}
                                  >
                                    {ipAddr}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Hardware Allocation */}
                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[290px]">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border",
                                isDark
                                  ? "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                                  : "bg-slate-50 border-slate-200/80 text-slate-700"
                              )}
                            >
                              <Cpu className="w-3 h-3 text-cyan-500" />
                              {vps.cpuCores} vCPU
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border",
                                isDark
                                  ? "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                                  : "bg-slate-50 border-slate-200/80 text-slate-700"
                              )}
                            >
                              <Activity className="w-3 h-3 text-cyan-500" />
                              {vps.ramGb >= 1 ? `${vps.ramGb} GB` : `${vps.ramGb * 1024} MB`} RAM
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border",
                                isDark
                                  ? "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                                  : "bg-slate-50 border-slate-200/80 text-slate-700"
                              )}
                            >
                              <HardDrive className="w-3 h-3 text-cyan-500" />
                              {vps.diskGb} GB
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border",
                                isDark
                                  ? "bg-white/[0.02] border-white/[0.06] text-zinc-400"
                                  : "bg-slate-50 border-slate-200/80 text-slate-600"
                              )}
                              title="Network Bandwidth"
                            >
                              <Network className="w-3 h-3 text-cyan-500" />
                              {vps.bandwidthMbps ? `${vps.bandwidthMbps} Mbps` : "100 Mbps"}
                            </span>
                          </div>
                        </td>

                        {/* Node & Role */}
                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 uppercase tracking-wider",
                                isDark
                                  ? "bg-white/[0.02] border-white/[0.07] text-zinc-300"
                                  : "bg-slate-100 border-slate-200 text-slate-700"
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                              {vps.kubernetesRole ? "K3s Node" : "Cloud VPS"}
                            </span>
                            <span
                              className={cn(
                                "text-[11px] font-mono",
                                isDark ? "text-zinc-500" : "text-slate-500"
                              )}
                            >
                              Node: <strong className={isDark ? "text-zinc-300" : "text-slate-700"}>{vps.node}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 align-middle">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                              isRunning && !isSuspended && !isTerminated
                                ? isDark
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isSuspended
                                ? isDark
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                : isTerminated
                                ? isDark
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                                : isProvisioning
                                ? isDark
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse"
                                  : "bg-cyan-50 text-cyan-700 border-cyan-200 animate-pulse"
                                : isDark
                                ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isRunning && !isSuspended && !isTerminated
                                  ? "bg-emerald-400 animate-pulse"
                                  : isSuspended
                                  ? "bg-amber-400"
                                  : isTerminated
                                  ? "bg-rose-400"
                                  : isProvisioning
                                  ? "bg-cyan-400"
                                  : "bg-zinc-500"
                              )}
                            />
                            {displayStatus}
                          </span>
                        </td>

                        {/* Disciplined Actions & Console */}
                        <td className="py-3.5 pl-3 pr-5 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Contextual Power Control Group */}
                            {!isRunning ? (
                              <button
                                onClick={() =>
                                  setConfirmModal({ vpsId: vps.id, action: "start", hostname: vps.hostname })
                                }
                                disabled={actionLoading[vps.id] || isSuspended || isTerminated}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed",
                                  isDark
                                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                )}
                                title="Start Instance"
                              >
                                <Play className="w-3.5 h-3.5" />
                                Start
                              </button>
                            ) : (
                              <div
                                className={cn(
                                  "inline-flex items-center rounded-lg border divide-x overflow-hidden",
                                  isDark
                                    ? "bg-white/[0.02] border-white/[0.08] divide-white/[0.06]"
                                    : "bg-white border-slate-200 divide-slate-200 shadow-2xs"
                                )}
                              >
                                <button
                                  onClick={() =>
                                    setConfirmModal({ vpsId: vps.id, action: "reboot", hostname: vps.hostname })
                                  }
                                  disabled={actionLoading[vps.id] || isTerminated}
                                  className={cn(
                                    "p-1.5 transition-colors disabled:opacity-40",
                                    isDark
                                      ? "text-zinc-400 hover:text-cyan-400 hover:bg-white/[0.05]"
                                      : "text-slate-600 hover:text-cyan-700 hover:bg-slate-50"
                                  )}
                                  title="Reboot Instance"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmModal({ vpsId: vps.id, action: "shutdown", hostname: vps.hostname })
                                  }
                                  disabled={actionLoading[vps.id] || isTerminated}
                                  className={cn(
                                    "p-1.5 transition-colors disabled:opacity-40",
                                    isDark
                                      ? "text-zinc-400 hover:text-amber-400 hover:bg-white/[0.05]"
                                      : "text-slate-600 hover:text-amber-600 hover:bg-slate-50"
                                  )}
                                  title="Graceful Shutdown"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmModal({ vpsId: vps.id, action: "stop", hostname: vps.hostname })
                                  }
                                  disabled={actionLoading[vps.id] || isTerminated}
                                  className={cn(
                                    "p-1.5 transition-colors disabled:opacity-40",
                                    isDark
                                      ? "text-zinc-400 hover:text-rose-400 hover:bg-white/[0.05]"
                                      : "text-slate-600 hover:text-rose-600 hover:bg-slate-50"
                                  )}
                                  title="Force Stop (Power Off)"
                                >
                                  <Square className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Console Button */}
                            {!vps.kubernetesRole && (
                              <button
                                onClick={() => openConsole(vps.id)}
                                disabled={consoleLoading === vps.id || isTerminated}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed",
                                  isDark
                                    ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20"
                                    : "bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200"
                                )}
                                title="Launch Web VNC Console"
                              >
                                {consoleLoading === vps.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Terminal className="w-3.5 h-3.5" />
                                )}
                                <span className="hidden xl:inline">Console</span>
                              </button>
                            )}

                            {/* Manage Button */}
                            {!isTerminated ? (
                              <Link
                                href={`/dashboard/vps/${vps.id}`}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors border text-xs font-semibold",
                                  isDark
                                    ? "bg-white/[0.03] hover:bg-white/[0.07] text-zinc-200 hover:text-white border-white/[0.08]"
                                    : "bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-2xs"
                                )}
                                title="Instance Settings & Details"
                              >
                                <Settings className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Manage</span>
                              </Link>
                            ) : (
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-not-allowed opacity-40 text-xs font-semibold",
                                  isDark
                                    ? "bg-white/[0.02] text-zinc-500 border-white/[0.05]"
                                    : "bg-slate-100 text-slate-400 border-slate-200"
                                )}
                                title="Terminated"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </div>
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

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div
              className={cn(
                "px-5 py-3 border-t",
                isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-100 bg-slate-50/50"
              )}
            >
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      )}

      {/* Single Instance Action Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={cn(
              "border w-full max-w-sm rounded-2xl p-5 shadow-2xl relative",
              isDark ? "bg-[#0a0a0c] border-white/[0.1]" : "bg-white border-slate-200"
            )}
          >
            <button
              onClick={() => setConfirmModal(null)}
              className={cn(
                "absolute top-4 right-4 p-1 rounded-lg transition-colors",
                isDark ? "text-zinc-500 hover:text-white hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-900"
              )}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-3.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center border",
                  confirmModal.action === "start"
                    ? isDark
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : confirmModal.action === "stop"
                    ? isDark
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                    : confirmModal.action === "shutdown"
                    ? isDark
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                    : isDark
                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className={cn("text-base font-bold capitalize", isDark ? "text-white" : "text-slate-900")}>
                {confirmModal.action} Instance
              </h2>
            </div>

            <p className={cn("text-xs sm:text-sm mb-5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              Are you sure you want to <strong>{confirmModal.action}</strong> the server{" "}
              <strong className={cn("font-mono", isDark ? "text-white" : "text-slate-900")}>
                {confirmModal.hostname}
              </strong>
              ?
              {confirmModal.action === "stop" && (
                <span className="block mt-2 text-rose-400 font-medium text-xs">
                  Warning: Forced power off may cause unsaved data loss. Use Shutdown for a graceful ACPI exit.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmModal(null)}
                className={cn(
                  "px-3.5 py-2 rounded-xl border transition-colors text-xs font-semibold",
                  isDark
                    ? "text-zinc-300 border-white/[0.08] hover:bg-white/[0.04]"
                    : "text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmModal.vpsId, confirmModal.action)}
                className={cn(
                  "px-4 py-2 rounded-xl font-bold transition-colors text-xs",
                  confirmModal.action === "start"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    : confirmModal.action === "stop"
                    ? "bg-rose-500 hover:bg-rose-400 text-white"
                    : confirmModal.action === "shutdown"
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    : "bg-cyan-400 hover:bg-cyan-300 text-slate-950"
                )}
              >
                Confirm {confirmModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {actionConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className={cn(
              "border rounded-2xl p-5 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200",
              isDark ? "bg-[#0a0a0c] border-white/[0.1]" : "bg-white border-slate-200"
            )}
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  getActionConfig(actionConfirm).bg
                )}
              >
                {getActionConfig(actionConfirm).icon}
              </div>
              <div>
                <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  {getActionConfig(actionConfirm).title} {selectedVps.length} VPS{" "}
                  {selectedVps.length > 1 ? "Instances" : "Instance"}
                </h3>
                <p className={cn("text-xs sm:text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                  {getActionConfig(actionConfirm).desc}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setActionConfirm(null)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors",
                  isDark
                    ? "text-zinc-300 border-white/[0.08] hover:bg-white/[0.04]"
                    : "text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-colors",
                  getActionConfig(actionConfirm).buttonClass
                )}
              >
                Confirm {getActionConfig(actionConfirm).title}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
