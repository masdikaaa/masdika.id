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
            <div key={rule.id || rule.metric} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
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
      {/* Hero Header */}
      <div className={cn("relative overflow-hidden rounded-3xl border p-6 md:p-8 shadow-md group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 tracking-wide", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Activity className="w-3 h-3" /> Monitoring & Alerts
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Metric & <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Alert</span>
            </h1>
            <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Centralized monitoring and alerts configuration for your active Cloud VPS and Managed K3s clusters.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                value={searchFilter}
                onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
                className={cn("w-full border rounded-2xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" : "bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500")}
              />
            </div>
          </div>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className={cn("border rounded-3xl p-12 text-center shadow-md", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-50")}>
            <ShieldAlert className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-400")} />
          </div>
          <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Active Resources Found</h3>
          <p className={cn("max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
            You don't have any active Cloud VPS or K3s clusters running. Deploy a service to start monitoring and configuring alerts.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard/checkout?service=vps" className="px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all shadow-sm hover:shadow inline-flex items-center gap-2">
              Deploy VPS
            </Link>
            <Link href="/dashboard/k3s" className={cn("px-6 py-3.5 rounded-xl border font-bold transition-all inline-flex items-center gap-2", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")}>
              Deploy K3s
            </Link>
          </div>
        </div>
      ) : (
        <div className={cn("border rounded-2xl shadow-md overflow-hidden flex flex-col", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn("px-6 py-2 border-b flex flex-wrap items-center justify-between min-h-[56px] gap-4", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-100 bg-slate-50")}>
            <PaginationControls />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className={cn("border-b text-xs font-semibold uppercase tracking-wider", isDark ? "border-slate-800 bg-[#060b14] text-zinc-400" : "border-slate-100 bg-slate-50 text-slate-500")}>
                  <th className="py-4 px-6 font-medium w-72">Resource Name</th>
                  <th className="py-4 px-4 font-medium w-40">Type</th>
                  <th className="py-4 px-4 font-medium">Active Alerts</th>
                  <th className="py-4 pl-4 pr-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-slate-800/60" : "divide-slate-100")}>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={cn("p-8 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>No resources match your search.</td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className={cn("transition-colors group", isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center p-2", isDark ? "bg-white/5" : "bg-slate-100")}>
                            {item.type === 'vps' ? (
                              <Terminal className="w-5 h-5 text-blue-400" />
                            ) : (
                              <SiKubernetes className="w-5 h-5 text-cyan-400" />
                            )}
                          </div>
                          <div>
                            <div className={cn("font-bold text-base", isDark ? "text-white" : "text-slate-900")}>{item.name}</div>
                            <div className={cn("text-sm font-medium whitespace-nowrap shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>{item.details}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 uppercase tracking-wider", isDark ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-200")}>
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
                      <td className="py-4 px-4 align-middle">
                        {renderActiveAlertsBadges(item.rules)}
                      </td>
                      <td className="py-4 pl-4 pr-6 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/dashboard/metrics/${item.type}/${item.id}`}
                            className={cn("inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border", isDark ? "bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border-teal-500/20" : "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200")}
                          >
                            <Activity className="w-4 h-4" /> Metrics
                          </Link>
                          <Link 
                            href={`/dashboard/alerts/${item.type}/${item.id}`}
                            className={cn("inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}
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
          
          <div className={cn("px-6 py-2 border-t", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-100 bg-slate-50")}>
            <PaginationControls />
          </div>
        </div>
      )}
    </div>
  );
}