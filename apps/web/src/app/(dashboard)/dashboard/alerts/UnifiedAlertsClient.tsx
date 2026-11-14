"use client";

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState } from "react";
import {
  Server,
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  CircuitBoard,
  Search,
  ShieldAlert,
  Settings,
  Bell,
  Database,
  Boxes,
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
  dbList?: any[];
  appsList?: any[];
}

export default function UnifiedAlertsClient({
  vpsList,
  k3sClusters,
  dbList = [],
  appsList = [],
}: UnifiedAlertsClientProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [searchFilter, setSearchFilter] = useUrlString<string>("searchFilter", "");
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;

  // Combine items into a unified list
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
    ...dbList.map((db) => ({
      type: "database" as const,
      id: String(db.id),
      name: db.name,
      rules: [],
      details: `${(db.type || "DATABASE").toUpperCase()} • ${
        db.cpuShares ? (db.cpuShares >= 1000 ? `${db.cpuShares / 1000} vCPU` : `${db.cpuShares}m`) : "Dedicated"
      } • ${db.memoryMb >= 1024 ? `${db.memoryMb / 1024}GB` : `${db.memoryMb}MB`} RAM • ${db.storageGb}GB SSD`,
      metricsUrl: `/dashboard/database/${db.id}`,
      manageUrl: `/dashboard/database/${db.id}`,
      status: db.status || "RUNNING",
    })),
    ...appsList.map((app) => ({
      type: "apps" as const,
      id: String(app.id),
      name: app.name,
      rules: [],
      details: `${(app.appType || "APP").toUpperCase()} • ${app.cpuShares || 1} vCPU • ${
        app.memoryMb >= 1024 ? `${app.memoryMb / 1024}GB` : `${app.memoryMb || 1024}MB`
      } RAM • ${app.storageGb || 10}GB SSD`,
      metricsUrl: `/dashboard/apps/${app.id}`,
      manageUrl: `/dashboard/apps/${app.id}`,
      status: app.status || "RUNNING",
    })),
  ];

  const filteredList = allItems.filter(
    (item) =>
      !searchFilter ||
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.type.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.details.toLowerCase().includes(searchFilter.toLowerCase())
  );

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
      <div className="py-2">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Metric &amp; Alert
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <Activity className="w-3 h-3" /> Monitoring &amp; Metrics
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            Centralized monitoring and live resource metrics for Cloud VPS, Kubernetes clusters, Managed Databases, and Managed Applications.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none transition-colors",
                isDark
                  ? "bg-[#111115] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  : "bg-slate-50/80 border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              )}
            />
          </div>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div
          className={cn(
            "border rounded-2xl p-8 sm:p-12 text-center",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
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
            No Active Resources Found
          </h3>
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
            You don&apos;t have any active Cloud VPS, databases, or application instances running. Deploy a service to start monitoring.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard/checkout?service=vps"
              className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-sm inline-flex items-center gap-2"
            >
              Deploy VPS
            </Link>
            <Link
              href="/dashboard/database"
              className={cn(
                "px-3.5 py-2 rounded-xl border font-medium text-xs transition-all inline-flex items-center gap-2",
                isDark
                  ? "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] text-white"
                  : "bg-slate-50/80 border-slate-200/90 hover:bg-slate-100 text-slate-700"
              )}
            >
              Deploy Database
            </Link>
            <Link
              href="/dashboard/apps"
              className={cn(
                "px-3.5 py-2 rounded-xl border font-medium text-xs transition-all inline-flex items-center gap-2",
                isDark
                  ? "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] text-white"
                  : "bg-slate-50/80 border-slate-200/90 hover:bg-slate-100 text-slate-700"
              )}
            >
              Deploy Application
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border rounded-2xl overflow-hidden flex flex-col",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          {totalPages > 1 && (
            <div
              className={cn(
                "px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-4",
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
                              <Terminal className="w-5 h-5 text-blue-400" />
                            ) : item.type === "k3s" ? (
                              <SiKubernetes className="w-5 h-5 text-cyan-400" />
                            ) : item.type === "database" ? (
                              <Database className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Boxes className="w-5 h-5 text-cyan-400" />
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
                          ) : item.type === "vps" ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span className={cn("font-semibold", isDark ? "text-blue-400" : "text-blue-600")}>
                                Cloud VPS
                              </span>
                            </>
                          ) : item.type === "database" ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className={cn("font-semibold", isDark ? "text-emerald-400" : "text-emerald-700")}>
                                Managed Database
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                              <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                Managed Application
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
                                ? "bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border-teal-500/20"
                                : "bg-white hover:bg-slate-50 text-teal-700 border-slate-200/90"
                            )}
                          >
                            <Activity className="w-3.5 h-3.5" /> Metrics
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
