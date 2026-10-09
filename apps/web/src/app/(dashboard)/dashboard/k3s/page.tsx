"use client";

import { useState, useEffect } from "react";
import { Server, Activity, ChevronRight, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Pagination } from "@/components/ui/Pagination";

export default function K3sListPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchClusters();
    const interval = setInterval(fetchClusters, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Hero Header */}
      <div className={cn("backdrop-blur-sm border relative overflow-hidden rounded-3xl p-6 md:p-8 group", isDark ? "bg-white/[0.02] border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
              <Server className="w-3 h-3" /> Kubernetes Engine
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900", " ")}>
              Managed <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600", " ")}>K3s Clusters</span>
            </h1>
            <p className={cn(isDark ? "text-zinc-400" : "text-slate-500", "  text-sm max-w-md")}>Manage your lightweight Kubernetes clusters, worker nodes, and view resource usage.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link href="/dashboard/checkout?service=kubernetes" className={cn("font-bold text-white px-5 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-2xl text-sm transition-all flex items-center gap-2 w-full md:w-auto justify-center shadow-md", isDark && "shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]")}>
              <Server className="w-4 h-4" /> Deploy Cluster
            </Link>
          </div>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className={cn("border transition-colors rounded-3xl p-12 text-center", isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm")}>
          <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-100")}>
            <img referrerPolicy="no-referrer" src="https://cdn.simpleicons.org/kubernetes/71717a" alt="Kubernetes" className="w-10 h-10 transform rotate-6" loading="lazy" decoding="async" />
          </div>
          <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Clusters Found</h3>
          <p className={cn(isDark ? "text-zinc-400" : "text-slate-500", "  max-w-md mx-auto mb-6")}>You don't have any Kubernetes clusters deployed yet. Deploy your first cluster to get started with container orchestration.</p>
          <Link href="/dashboard/checkout?service=kubernetes" className={cn("font-bold text-white px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 transition-all shadow-md hover:-translate-y-0.5 inline-flex items-center justify-center gap-2", isDark && "shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]")}>
            Deploy Now
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clusters.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((cluster) => (
            <Link key={cluster.id} href={`/dashboard/k3s/${cluster.id}`}>
              <div className={cn("border transition-colors relative rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 group overflow-hidden", isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-cyan-500/30 shadow-md" : "bg-white border-slate-200 hover:bg-slate-50 hover:border-cyan-200 shadow-md hover:shadow-lg")}>
                
                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl border flex items-center justify-center", isDark ? "border-cyan-500/20" : "border-cyan-200 bg-cyan-50")}>
                      <img referrerPolicy="no-referrer" src="https://cdn.simpleicons.org/kubernetes/06b6d4" alt="Kubernetes" className="w-8 h-8" loading="lazy" decoding="async" />
                    </div>
                    <div>
                      <h3 className={cn("text-xl font-bold transition-colors tracking-tight", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{cluster.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[11px] font-mono px-2 py-0.5 rounded-md border", isDark ? "text-zinc-400 bg-white/5 border-white/5" : "text-slate-500 bg-slate-50 border-slate-200")}>{cluster.version}</span>
                      </div>
                    </div>
                  </div>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors border", isDark ? "bg-white/5 border-white/5 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20" : "bg-slate-50 border-slate-200 group-hover:bg-cyan-50 group-hover:border-cyan-200")}>
                    <ChevronRight className={cn("w-4 h-4 transition-colors", isDark ? "text-zinc-400 group-hover:text-cyan-400" : "text-slate-500 group-hover:text-cyan-600")} />
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-3 mb-5">
                  <div className={cn("rounded-2xl p-3.5 border", isDark ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-200")}>
                    <span className={cn("block text-[10px] uppercase tracking-wider font-semibold mb-1.5", isDark ? "text-zinc-500" : "text-slate-400")}>Status</span>
                    <span className={cn(
                      "font-bold flex items-center gap-2 text-sm",
                      cluster.status === "RUNNING" ? "text-cyan-400" : "text-amber-400"
                    )}>
                      {cluster.status === "RUNNING" ? <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> : <Clock className="w-3.5 h-3.5 animate-pulse" />}
                      {cluster.status}
                    </span>
                  </div>
                  <div className={cn("rounded-2xl p-3.5 border", isDark ? "bg-black/20 border-white/5" : "bg-slate-50/50 border-slate-200")}>
                    <span className={cn(isDark ? "text-zinc-500" : "text-slate-400", "block text-[10px]   uppercase tracking-wider font-semibold mb-1.5")}>Nodes</span>
                    <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900", "  text-sm flex items-center gap-2")}>
                      <Server className="w-3.5 h-3.5 text-cyan-400" />
                      {cluster.nodeCount} Node(s)
                    </span>
                  </div>
                </div>

                <div className={cn("relative z-10 pt-4 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                  <div className="flex items-center justify-between">
                    <div className={cn(isDark ? "text-zinc-400" : "text-slate-500", "text-xs   font-mono truncate flex items-center gap-2")}>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      {cluster.endpoint || "Provisioning API Endpoint..."}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          </div>
          
          {Math.ceil(clusters.length / itemsPerPage) > 1 && (
            <div className={cn("pt-6 border-t", isDark ? "border-white/5" : "border-slate-200")}>
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