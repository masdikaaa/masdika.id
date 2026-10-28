"use client";

import { useUrlNumber } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Server, Activity, ChevronRight, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Pagination } from "@/components/ui/Pagination";
import { SiKubernetes } from "react-icons/si";

export default function K3sListPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useUrlNumber("page", 1);
  const itemsPerPage = 6;

  const fetchClusters = async () => {
    try {
      const res = await fetch("/api/user/k3s", { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setClusters(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
    const interval = setInterval(fetchClusters, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);



  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Compact Unboxed Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Managed K3s Clusters
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Server className="w-3 h-3" /> Kubernetes Engine
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage your lightweight Kubernetes clusters, worker nodes, and view resource usage.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link href="/dashboard/checkout?service=kubernetes" className="font-bold text-slate-950 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 w-full sm:w-auto justify-center shadow-2xs">
            <Server className="w-4 h-4" /> Deploy Cluster
          </Link>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className={cn("border rounded-2xl p-8 sm:p-12 text-center", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className={cn("w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-5", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
            <SiKubernetes className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Clusters Found</h3>
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>You don&apos;t have any Kubernetes clusters deployed yet. Deploy your first cluster to get started with container orchestration.</p>
          <Link href="/dashboard/checkout?service=kubernetes" className="font-bold text-slate-950 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 transition-all shadow-2xs inline-flex items-center justify-center gap-2 text-xs sm:text-sm">
            Deploy Now
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {clusters.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((cluster) => (
            <Link key={cluster.id} href={`/dashboard/k3s/${cluster.id}`}>
              <div className={cn("border relative rounded-2xl p-4 sm:p-5 transition-all duration-200 group overflow-hidden", isDark ? "bg-[#111115] border-white/[0.08] hover:border-white/[0.16]" : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300")}>
                
                <div className="relative z-10 flex justify-between items-start mb-5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center shrink-0", isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80")}>
                      <SiKubernetes className={cn("w-6 h-6", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    </div>
                    <div className="min-w-0">
                      <h3 className={cn("text-base sm:text-lg font-bold transition-colors tracking-tight truncate", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{cluster.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[11px] font-mono px-2 py-0.5 rounded-md border", isDark ? "text-zinc-400 bg-white/[0.02] border-white/[0.08]" : "text-slate-500 bg-slate-50/80 border-slate-200/90")}>{cluster.version}</span>
                      </div>
                    </div>
                  </div>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors border shrink-0", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-400 group-hover:text-cyan-400" : "bg-slate-50/80 border-slate-200/90 group-hover:bg-slate-100 group-hover:border-slate-300")}>
                    <ChevronRight className={cn("w-4 h-4 transition-colors", isDark ? "text-zinc-400 group-hover:text-cyan-400" : "text-slate-500 group-hover:text-slate-900")} />
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-3 mb-4">
                  <div className={cn("rounded-xl p-3.5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                    <span className={cn("block text-[10px] uppercase tracking-wider font-semibold mb-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>Status</span>
                    <span className={cn(
                      "font-bold flex items-center gap-2 text-xs sm:text-sm truncate",
                      cluster.status === "RUNNING" ? (isDark ? "text-cyan-400" : "text-cyan-700") : cluster.status === "FAILED" ? "text-rose-500" : "text-amber-500"
                    )}>
                      {cluster.status === "RUNNING" ? (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 animate-pulse shrink-0" />
                      )}
                      {cluster.status === "WAITING_FOR_CLOUD_INIT" || cluster.status === "WAITING_FOR_SSH"
                        ? "INITIALIZING"
                        : cluster.status === "INSTALLING_K3S"
                          ? "INSTALLING"
                          : cluster.status}
                    </span>
                  </div>
                  <div className={cn("rounded-xl p-3.5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                    <span className={cn("block text-[10px] uppercase tracking-wider font-semibold mb-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>Nodes</span>
                    <span className={cn("font-bold text-xs sm:text-sm flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                      <Server className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      {cluster.nodeCount} Node(s)
                    </span>
                  </div>
                </div>

                <div className={cn("relative z-10 pt-3.5 border-t", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                  <div className="flex items-center justify-between">
                    <div className={cn("text-xs font-mono truncate flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isDark ? "bg-zinc-600" : "bg-slate-400")} />
                      {cluster.endpoint || "Provisioning API Endpoint..."}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          </div>
          
          {Math.ceil(clusters.length / itemsPerPage) > 1 && (
            <div className={cn("pt-6 border-t", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(clusters.length / itemsPerPage)}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}