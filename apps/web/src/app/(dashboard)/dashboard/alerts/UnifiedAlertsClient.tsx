"use client";

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState } from "react";
import { Server, Terminal, Activity, Cpu, HardDrive, CircuitBoard, Search, ShieldAlert, Settings, Bell } from "lucide-react";
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

export default function UnifiedAlertsClient({ vpsList, k3sClusters }: UnifiedAlertsClientProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchFilter, setSearchFilter] = useUrlString<string>("searchFilter", "");
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;

  // Combine items into a unified list
  const allItems = [
    ...vpsList.map(v => ({
      type: 'vps',
      id: v.id,
      name: v.hostname,
      rules: v.alertRules || [],
      details: `${v.cpuCores} vCPU • ${v.ramGb >= 1 ? v.ramGb + 'GB' : v.ramGb * 1024 + 'MB'} RAM • ${v.diskGb}GB Disk`
    })),
    ...k3sClusters.map(k => ({
      type: 'k3s',
      id: k.id,
      name: k.name,
      rules: k.nodes && k.nodes.length > 0 ? k.nodes[0].alertRules || [] : [],
      details: `${k.nodes?.length || 0} Nodes Cluster • ${k.version}`
    }))
  ];

  const filteredList = allItems.filter(item => 
    !searchFilter || 
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    item.type.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderActiveAlertsBadges = (rules: AlertRule[]) => {
    const activeRules = rules.filter(r => r.isEnabled);
    if (activeRules.length === 0) {
      return <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>No active alerts</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {activeRules.map(rule => {
          let Icon = Activity;
          if (rule.metric === "CPU") Icon = Cpu;
          if (rule.metric === "RAM") Icon = CircuitBoard;
          if (rule.metric === "DISK") Icon = HardDrive;
          
          return (
            <div key={rule.id || rule.metric} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-slate-100 border-slate-200 text-cyan-700")}>
              <Icon className="w-3.5 h-3.5" />
              {rule.metric} &gt; {rule.threshold}%
            </div>
          );
        })}
      </div>
    );
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="py-2">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
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
              Metric & Alert
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Activity className="w-3 h-3" /> Monitoring & Alerts
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            Centralized monitoring and alerts configuration for your active Cloud VPS and Managed K3s clusters.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" />
            <input 
              type="text" 
              placeholder="Search resources..." 
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
              className={cn("w-full border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none transition-colors", isDark ? "bg-[#111115] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" : "bg-slate-50/80 border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500")}
            />
          </div>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className={cn("border rounded-2xl p-8 sm:p-12 text-center", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
            <ShieldAlert className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-400")} />
          </div>
          <h3 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Active Resources Found</h3>
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
            You don't have any active Cloud VPS or K3s clusters running. Deploy a service to start monitoring and configuring alerts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard/checkout?service=vps" className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-sm inline-flex items-center gap-2">
              Deploy VPS
            </Link>
            <Link href="/dashboard/k3s" className={cn("px-5 py-2.5 rounded-xl border font-medium text-xs sm:text-sm transition-all inline-flex items-center gap-2", isDark ? "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] text-white" : "bg-slate-50/80 border-slate-200/90 hover:bg-slate-100 text-slate-700")}>
              Deploy K3s
            </Link>
          </div>
        </div>
      ) : (
        <div className={cn("border rounded-2xl overflow-hidden flex flex-col", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          {totalPages > 1 && (
            <div className={cn("px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-4", isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80")}>
              <PaginationControls />
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className={cn("border-b text-xs font-semibold uppercase tracking-wider", isDark ? "border-white/[0.08] bg-white/[0.02] text-zinc-400" : "border-slate-200/90 bg-slate-50/80 text-slate-500")}>
                  <th className="py-3.5 px-4 sm:px-6 font-medium w-72">Resource Name</th>
                  <th className="py-3.5 px-4 font-medium w-40">Type</th>
                  <th className="py-3.5 px-4 font-medium">Active Alerts</th>
                  <th className="py-3.5 pl-4 pr-4 sm:pr-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={cn("p-8 text-center text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>No resources match your search.</td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className={cn("transition-colors group", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}>
                      <td className="py-3.5 px-4 sm:px-6 align-middle">
                        <div className="flex items-center gap-3.5">
                          <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center p-2 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                            {item.type === 'vps' ? (
                              <Terminal className="w-5 h-5 text-blue-400" />
                            ) : (
                              <SiKubernetes className="w-5 h-5 text-cyan-400" />
                            )}
                          </div>
                          <div>
                            <div className={cn("font-bold text-sm sm:text-base", isDark ? "text-white" : "text-slate-900")}>{item.name}</div>
                            <div className={cn("text-xs sm:text-sm font-medium whitespace-nowrap shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>{item.details}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 uppercase tracking-wider", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                          {item.type === 'k3s' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
                              <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>Managed K3s</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
                              <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>Cloud VPS</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        {renderActiveAlertsBadges(item.rules)}
                      </td>
                      <td className="py-3.5 pl-4 pr-4 sm:pr-6 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/dashboard/metrics/${item.type}/${item.id}`}
                            className={cn("inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors border shadow-2xs", isDark ? "bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border-teal-500/20" : "bg-white hover:bg-slate-50 text-teal-700 border-slate-200/90")}
                          >
                            <Activity className="w-4 h-4" /> Metrics
                          </Link>
                          <Link 
                            href={`/dashboard/alerts/${item.type}/${item.id}`}
                            className={cn("inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors border shadow-2xs", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-white hover:bg-slate-50 text-cyan-700 border-slate-200/90")}
                          >
                            <Settings className="w-4 h-4" /> Manage
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
            <div className={cn("px-4 sm:px-6 py-2 border-t", isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80")}>
              <PaginationControls />
            </div>
          )}
        </div>
      )}
    </div>
  );
}