"use client";

import { useState, useEffect } from "react";
import { Users, Key, Wallet, Server, ShieldCheck, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/billing";
import { useTheme } from "@/components/ThemeProvider";
import { motion } from "framer-motion";
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminResellersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchResellers = async () => {
    try {
      const res = await fetch("/api/admin/resellers");
      const data = await res.json();
      if (data.success) {
        setResellers(data.resellers);
      }
    } catch (e) {
      toast.error("Failed to fetch resellers");
    } finally {
      setLoading(false);
    }
  };

  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResellers();
  }, []);

  if (loading) return <AdminLoader />;

  return (
    <div className="space-y-6 md:space-y-8 pb-10 w-full relative z-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold mb-1 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Reseller Management
          </h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage B2B partners, preloaded balances, and API integration keys.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("px-4 py-2 rounded-lg font-medium text-sm border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            Total Resellers: {resellers.length}
          </div>
          <button
            onClick={() => { setLoading(true); fetchResellers(); }}
            className={cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Total Resellers</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {resellers.length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Registered B2B partners
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Managed VPS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {resellers.reduce((acc, r) => acc + (r._count?.vpsServices || 0), 0)}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Active VPS instances
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Combined Balance</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
            {formatRupiah(resellers.reduce((acc, r) => acc + (r.balance || 0), 0))}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Preloaded partner credit
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Active API Keys</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {resellers.reduce((acc, r) => acc + (r.apiKeys?.filter((k: any) => k.status === 'ACTIVE').length || 0), 0)}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Connected integration keys
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resellers.map((reseller, idx) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={reseller.id} className={cn("rounded-2xl p-5 md:p-6 relative overflow-hidden group border transition-all", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md hover:border-cyan-500/40" : "bg-white border-slate-200 shadow-sm hover:border-cyan-500/40")}>
            {/* Background Glow */}
            <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] pointer-events-none transition-all", isDark ? "bg-cyan-500/10" : "bg-cyan-500/5")} />
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className={cn("w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full flex items-center justify-center border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                <Users className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className={cn("text-base md:text-lg font-bold truncate", isDark ? "text-white" : "text-slate-900")}>{reseller.name}</h3>
                <p className={cn("text-xs md:text-sm truncate", isDark ? "text-zinc-400" : "text-slate-500")}>{reseller.email}</p>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-6 relative z-10">
              <div className={cn("flex items-center justify-between p-3 rounded-xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                <div className={cn("flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <Wallet className="w-4 h-4" /> <span className="text-xs md:text-sm">Balance</span>
                </div>
                <span className={cn("font-bold text-sm md:text-base", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(reseller.balance)}</span>
              </div>

              <div className={cn("flex items-center justify-between p-3 rounded-xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                <div className={cn("flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <Server className="w-4 h-4" /> <span className="text-xs md:text-sm">Active VPS</span>
                </div>
                <span className={cn("font-bold text-sm md:text-base", isDark ? "text-white" : "text-slate-900")}>{reseller._count.vpsServices} Instances</span>
              </div>
            </div>

            <div className={cn("border-t pt-4 relative z-10", isDark ? "border-slate-800" : "border-slate-200")}>
              <h4 className={cn("text-xs md:text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                <Key className="w-4 h-4" /> API Keys
              </h4>
              
              {reseller.apiKeys.length === 0 ? (
                <div className={cn("text-xs px-3 py-2 rounded-lg border flex items-center gap-2", isDark ? "text-amber-400/80 bg-amber-500/10 border-amber-500/20" : "text-amber-700 bg-amber-50 border-amber-200")}>
                  <XCircle className="w-3.5 h-3.5 shrink-0" /> No API Keys Generated
                </div>
              ) : (
                <div className="space-y-2">
                  {reseller.apiKeys.map((key: any) => (
                    <div key={key.id} className={cn("text-xs flex flex-col gap-1 p-3 rounded-xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-100")}>
                      <div className="flex items-center justify-between">
                        <code className={cn("font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{key.key.substring(0, 8)}••••••••</code>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", key.status === 'ACTIVE' ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700") : (isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"))}>
                          {key.status}
                        </span>
                      </div>
                      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between mt-1 gap-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                        <span>Used: {key.usageCount}x</span>
                        <span>Last: {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {resellers.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("col-span-full py-16 px-6 text-center border rounded-2xl", isDark ? "bg-[#0b1322] border-slate-800 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            <ShieldCheck className={cn("w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-50", isDark ? "text-zinc-600" : "text-slate-400")} />
            <h3 className={cn("text-xl md:text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Resellers Found</h3>
            <p className={cn("max-w-md mx-auto text-sm md:text-base", isDark ? "text-zinc-400" : "text-slate-500")}>Users who generate a Reseller API Key will appear here.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
