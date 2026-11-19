"use client";

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState } from "react";
import {
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  CircuitBoard,
  Search,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface AlertRule {
  id: number;
  metric: string;
  threshold: number;
  isEnabled: boolean;
  notifyEmails: string;
}

interface UnifiedAlertsClientProps {
  vpsList: any[];
  k3sClusters: any[];
}

export default function UnifiedAlertsClient({
  vpsList,
  k3sClusters,
}: UnifiedAlertsClientProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [searchFilter, setSearchFilter] = useUrlString<string>("searchFilter", "");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "vps" | "k3s">("ALL");
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;

  // Combine Cloud VPS & Kubernetes VPS cluster items
  const allItems = [
    ...vpsList.map((v) => ({
      type: "vps" as const,
      id: String(v.id),
      name: v.hostname,
      rules: v.alertRules || [],
      details: `${v.cpuCores} vCPU • ${v.ramGb >= 1 ? v.ramGb + "GB" : v.ramGb * 1024 + "MB"} RAM • ${v.diskGb}GB Disk`,
      metricsUrl: `/dashboard/metrics/vps/${v.id}`,
      manageUrl: `/dashboard/alerts/vps/${v.id}`,
      status: v.status || "RUNNING",
    })),
    ...k3sClusters.map((k) => ({
      type: "k3s" as const,
      id: String(k.id),
      name: k.name,
      rules: k.nodes && k.nodes.length > 0 ? k.nodes[0].alertRules || [] : [],
      details: `${k.nodes?.length || 0} Nodes Cluster • ${k.version}`,
      metricsUrl: `/dashboard/metrics/k3s/${k.id}`,
      manageUrl: `/dashboard/alerts/k3s/${k.id}`,
      status: k.status || "RUNNING",
    })),
  ];

  const filteredList = allItems.filter((item) => {
    if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
    return (
      !searchFilter ||
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.type.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.details.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  const totalAlertRules = allItems.reduce(
    (acc, item) => acc + item.rules.filter((r: AlertRule) => r.isEnabled).length,
    0
  );
  const runningResourcesCount = allItems.filter((item) => item.status === "RUNNING").length;

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderActiveAlertsBadges = (rules: AlertRule[], status: string) => {
    const activeRules = rules.filter((r) => r.isEnabled);
    if (activeRules.length > 0) {
      return (
        <div className="flex flex-wrap gap-2">
          {activeRules.map((rule) => {
            let Icon = Activity;
            if (rule.metric === "CPU") Icon = Cpu;
            if (rule.metric === "RAM") Icon = CircuitBoard;
            if (rule.metric === "DISK") Icon = HardDrive;

            return (
              <div
                key={rule.id || rule.metric}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium",
                  isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-slate-100 border-slate-200 text-cyan-700"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {rule.metric} &gt; {rule.threshold}%
              </div>
            );
          })}
        </div>
      );
    }

    const isRunning = status === "RUNNING";
    const isSuspended = status === "SUSPENDED";

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
          isRunning
            ? isDark
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
            : isSuspended
              ? isDark
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-rose-50 border-rose-200 text-rose-700"
              : isDark
                ? "bg-white/5 border-white/10 text-zinc-400"
                : "bg-slate-100 border-slate-200 text-slate-600"
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            isRunning ? "bg-emerald-400 animate-pulse" : isSuspended ? "bg-rose-400" : "bg-zinc-400"
          )}
        />
        {status}
      </span>
    );
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="w-full flex justify-center py-1">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Metric &amp; Alert
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <Activity className="w-3 h-3" /> Monitoring &amp; Metrics
            </span>
          </div>
          <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-600")}>
            Centralized monitoring, alert rules, and live resource metrics for your Cloud VPS instances.
          </p>
        </div>
      </div>

      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn("rounded-2xl border p-5 transition-colors", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Monitored Resources
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>{allItems.length}</span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>nodes</span>
          </div>
          <p className={cn("text-xs mt-2.5", isDark ? "text-zinc-500" : "text-slate-500")}>
            Active Cloud VPS instances.
          </p>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-colors", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Active Alert Rules
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>{totalAlertRules}</span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>thresholds enabled</span>
          </div>
          <p className={cn("text-xs mt-2.5", isDark ? "text-zinc-500" : "text-slate-500")}>
            Real-time CPU, RAM &amp; Disk notifications.
          </p>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-colors", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Online Status
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>{runningResourcesCount}</span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>/ {allItems.length} running</span>
          </div>
          <p className={cn("text-xs mt-2.5", isDark ? "text-zinc-500" : "text-slate-500")}>
            Live telemetry streaming every cycle.
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border",
          isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="relative flex-1 max-w-md">
          <Search className={cn("w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
          <input
            type="text"
            placeholder="Search resources by name or specs..."
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-xl text-sm border outline-none transition-colors",
              isDark
                ? "bg-zinc-900/80 border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500/50"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
            )}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {([
            { id: "ALL", label: "All" },
            { id: "vps", label: "Cloud VPS" },
          ] as const).map((tab) => {
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setTypeFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  active
                    ? "bg-cyan-400 text-zinc-950"
                    : isDark
                    ? "bg-zinc-900 text-zinc-400 hover:text-white border border-white/[0.06]"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {allItems.length === 0 ? (
        <div
          className={cn(
            "border rounded-2xl p-12 text-center",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm"
          )}
        >
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border",
              isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90"
            )}
          >
            <ShieldAlert className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-400")} />
          </div>
          <h3 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
            No Active VPS Resources Found
          </h3>
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
            You don&apos;t have any active Cloud VPS running. Deploy a VPS to start monitoring metrics and alert rules.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard/vps/new"
              className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-sm inline-flex items-center gap-2"
            >
              Deploy VPS
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border rounded-2xl overflow-hidden flex flex-col",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm"
          )}
        >
          {totalPages > 1 && (
            <div
              className={cn(
                "px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-center gap-4",
                isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80"
              )}
            >
              <PaginationControls />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr
                  className={cn(
                    "border-b text-xs font-semibold uppercase tracking-wider",
                    isDark ? "border-white/[0.08] bg-white/[0.02] text-zinc-400" : "border-slate-200/90 bg-slate-50/80 text-slate-500"
                  )}
                >
                  <th className="px-3.5 py-3 sm:px-6 font-medium w-72">Resource Name</th>
                  <th className="px-3.5 py-3 font-medium w-44">Service Type</th>
                  <th className="px-3.5 py-3 font-medium">Monitoring / Status</th>
                  <th className="py-3.5 pl-4 pr-4 sm:pr-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={cn("p-8 text-center text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>
                      No resources match your search.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className={cn("transition-colors group", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}
                    >
                      <td className="px-3.5 py-3 sm:px-6 align-middle">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={cn(
                              "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center p-2 border",
                              isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90"
                            )}
                          >
                            {item.type === "vps" ? (
                              <Terminal className="w-5 h-5 text-cyan-400" />
                            ) : (
                              <SiKubernetes className="w-5 h-5 text-cyan-400" />
                            )}
                          </div>
                          <div>
                            <div className={cn("font-bold text-sm sm:text-base", isDark ? "text-white" : "text-slate-900")}>
                              {item.name}
                            </div>
                            <div
                              className={cn(
                                "text-xs sm:text-sm font-medium whitespace-nowrap shrink-0",
                                isDark ? "text-zinc-500" : "text-slate-500"
                              )}
                            >
                              {item.details}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 align-middle">
                        <div
                          className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 uppercase tracking-wider",
                            isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90"
                          )}
                        >
                          {item.type === "k3s" ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                              <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                Managed Kubernetes
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                              <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                Cloud VPS
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 align-middle">
                        {renderActiveAlertsBadges(item.rules, item.status)}
                      </td>
                      <td className="py-3.5 pl-4 pr-4 sm:pr-6 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={item.metricsUrl}
                            className={cn(
                              "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors border shadow-2xs",
                              isDark
                                ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-white/[0.08]"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                            )}
                          >
                            <Activity className="w-3.5 h-3.5 text-cyan-400" /> Metrics
                          </Link>
                          <Link
                            href={item.manageUrl}
                            className={cn(
                              "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors border shadow-2xs",
                              isDark
                                ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20"
                                : "bg-white hover:bg-slate-50 text-cyan-700 border-slate-200/90"
                            )}
                          >
                            <Settings className="w-3.5 h-3.5" /> Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              className={cn(
                "px-4 sm:px-6 py-2 border-t",
                isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80"
              )}
            >
              <PaginationControls />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
