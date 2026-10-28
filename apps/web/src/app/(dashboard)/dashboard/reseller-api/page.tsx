"use client";

import { useUrlNumber } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Key, Copy, Plus, Trash2, Code2, AlertTriangle, CheckCircle2, ShieldCheck, TerminalSquare, RefreshCw, Terminal, Settings, Power, Zap, Cpu, Server, Play, Square, RotateCw, KeyRound, BookOpen, HardDrive, Info, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { formatRupiah } from "@/lib/billing";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";

export default function ResellerApiPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [keys, setKeys] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<number | null>(null);
  
  const [page, setPage] = useUrlNumber("page", 1);
  const itemsPerPage = 10;

  const fetchInstances = async () => {
    try {
      const res = await fetch("/api/user/vps?isReseller=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setInstances(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/user/api-keys");
      const data = await res.json();
      if (data.success) {
        setKeys(data.apiKeys || []);
        setBalance(data.balance || 0);
      }
      await fetchInstances();
    } catch (e) {
      toast.error("Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchInstances, 10000); // 10s refresh for instances
    return () => clearInterval(interval);
  }, []);



  const handleGenerateKey = async () => {
    if (balance < 66430) {
      toast.error("Saldo tidak mencukupi! Minimal top up Rp 66.430 untuk mengaktifkan Reseller API.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Reseller Integration" })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success("API Key successfully generated!");
        fetchData();
      } else {
        toast.error(data.error || "Failed to generate key");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setKeyToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!keyToDelete) return;
    
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyToDelete })
      });
      if (res.ok) {
        toast.success("API Key revoked");
        fetchData();
      }
    } catch (e) {
      toast.error("Failed to revoke key");
    } finally {
      setShowDeleteModal(false);
      setKeyToDelete(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const totalPages = Math.max(1, Math.ceil(instances.length / itemsPerPage));
  const paginatedInstances = instances.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <motion.div className="space-y-6 pb-10 max-w-[1600px] mx-auto" variants={containerVariants} initial="hidden" animate="visible">
        
        {/* Compact Unboxed Header */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Developer API
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
                Reseller & B2B
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
              Integrate Masdika's powerful cloud infrastructure directly into your own platform. Provision, manage, and bill your own customers.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <Link href="/dashboard/billing" className={cn("w-full sm:w-auto border px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 shrink-0", isDark ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08] text-white" : "bg-slate-50/80 hover:bg-slate-100 border-slate-200/90 text-slate-800")}>
              <Wallet className="w-4 h-4 text-cyan-500" />
              Top Up Saldo
            </Link>
            <Link href="/dashboard/reseller-api/docs" className={cn("w-full sm:w-auto border px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 shrink-0", isDark ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08] text-white" : "bg-slate-50/80 hover:bg-slate-100 border-slate-200/90 text-slate-800")}>
              <BookOpen className="w-4 h-4 text-cyan-500" />
              Documentation
            </Link>
            <button
              onClick={handleGenerateKey}
              disabled={generating || balance < 50000 || keys.length > 0}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shrink-0 bg-cyan-400 hover:bg-cyan-300 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
              title={keys.length > 0 ? "You already have an active API Key." : ""}
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate API Key
            </button>
          </div>
        </motion.div>

        {balance < 50000 && (
          <motion.div variants={itemVariants} className={cn("p-4 rounded-xl border flex items-start gap-3 text-sm", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-700")}>
            <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
            <div>
              <h4 className={cn("font-semibold mb-0.5 text-xs sm:text-sm", isDark ? "text-cyan-400" : "text-cyan-900")}>Syarat Pengaktifan:</h4>
              <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                Wajib Saldo minimal <b>Rp 50.000</b>. Saldo Anda saat ini: <b>{formatRupiah(balance)}</b>.
              </p>
            </div>
          </motion.div>
        )}

        {/* Reseller Instances Table */}
        <motion.div variants={itemVariants} className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className={cn("p-5 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
            <h2 className={cn("text-lg sm:text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <Server className="w-5 h-5 text-cyan-500" />
              API Instances
            </h2>
            <div className={cn("px-3.5 py-1.5 border rounded-xl text-xs font-semibold w-fit", isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400" : "bg-slate-50/80 border-slate-200/90 text-slate-600")}>
              {instances.length} Active Instances
            </div>
          </div>
          
          {instances.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                <Server className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-400")} />
              </div>
              <h4 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Instances Deployed</h4>
              <p className={cn("text-xs sm:text-sm max-w-md mx-auto leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>No instances deployed via API yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[800px]">
                <thead className={cn("text-[10px] uppercase tracking-wider font-bold border-b", isDark ? "text-zinc-500 border-white/[0.08] bg-[#111115]" : "text-slate-500 border-slate-200/90 bg-slate-50/80")}>
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">ID</th>
                    <th className="px-6 py-4 whitespace-nowrap">Hostname</th>
                    <th className="px-6 py-4 whitespace-nowrap">Type</th>
                    <th className="px-6 py-4 whitespace-nowrap">Information</th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/[0.08]" : "divide-slate-200/90")}>
                  {paginatedInstances.map((vps) => {
                    const isRunning = vps.liveStatus?.status === 'running';
                    
                    return (
                      <tr key={vps.id} className={cn("group transition-colors", isDark ? "text-zinc-300 hover:bg-white/[0.02]" : "text-slate-600 hover:bg-slate-50/80")}>
                        <td className="px-6 py-4 font-medium">{vps.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                              <Server className="w-4 h-4 text-cyan-500" />
                            </div>
                            <div>
                              <div className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{vps.hostname}</div>
                              <div className="text-xs text-zinc-500 mt-0.5">
                                {vps.assignedIps?.map((ip: any) => ip.publicIp || ip.ipAddress).join(', ') || 'Direct Public IP'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1.5 w-fit border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-slate-100 text-cyan-700 border-slate-200/90")}>
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> API INSTANCE
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {vps.cpuCores} Core</span>
                            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> {vps.ramGb} GB</span>
                            <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> {vps.diskGb} GB</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn("px-2.5 py-1 text-xs font-semibold rounded-full border w-fit flex items-center gap-1.5", 
                            vps.status === 'PROVISIONING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                            isRunning ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                            "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", vps.status === 'PROVISIONING' ? "bg-amber-500 animate-pulse" : isRunning ? "bg-green-500" : "bg-zinc-500")}></span>
                            {vps.status === 'PROVISIONING' ? 'PROVISIONING' : isRunning ? 'RUNNING' : 'STOPPED'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/vps/${vps.id}`} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors border", isDark ? "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] text-white" : "bg-white border-slate-200/90 hover:bg-slate-50 text-slate-700")}>
                              <Settings className="w-3.5 h-3.5" />
                              Manage
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {instances.length > 0 && totalPages > 1 && (
            <div className={cn("p-4 sm:p-6 border-t flex justify-center", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </motion.div>

        {/* Keys List Empty State / List */}
        {keys.length === 0 ? (
          <motion.div variants={itemVariants}>
            <div className={cn("border rounded-2xl p-8 sm:p-12 text-center", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                <Key className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-500")} />
              </div>
              <h4 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Active API Keys</h4>
              <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                You need to generate an API key to start using the Masdika Developer API endpoints.
              </p>
              <button onClick={handleGenerateKey} disabled={generating || balance < 50000} className="inline-block font-bold text-xs sm:text-sm py-2.5 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Generate Key Now
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className={cn("rounded-2xl border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
            <div className={cn("p-5 sm:p-6 border-b", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
              <h2 className={cn("text-lg sm:text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Key className="w-5 h-5 text-cyan-500" />
                Your API Keys
              </h2>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {keys.map(k => (
                  <div key={k.id} className={cn("p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                    <div>
                      <h3 className={cn("font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>{k.name}</h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <code className={cn("px-3 py-1 rounded-xl text-xs sm:text-sm font-mono border", isDark ? "bg-[#0a0a0c] text-cyan-400 border-white/[0.08]" : "bg-white text-cyan-700 border-slate-200/90")}>
                          {k.key.substring(0, 16)}...{k.key.substring(k.key.length - 6)}
                        </code>
                        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1", isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600")}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyToClipboard(k.key)} className={cn("p-2.5 rounded-xl border transition-colors", isDark ? "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] text-zinc-400 hover:text-white" : "bg-white border-slate-200/90 hover:bg-slate-100 text-slate-500 hover:text-slate-900")}>
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteClick(k.id)} className={cn("p-2.5 rounded-xl border transition-colors", isDark ? "border-red-500/20 hover:bg-red-500/20 text-red-400" : "border-red-200 hover:bg-red-100 text-red-600")}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}


      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className={cn("w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200", isDark ? "bg-[#0a0a0c] border border-white/[0.08]" : "bg-white border border-slate-200/90 shadow-2xs")}>
            <div className="flex items-center gap-4 mb-4 text-red-500">
              <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Revoke API Key</h3>
            </div>
            <p className={cn("mb-6 text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              Are you sure you want to revoke this API key? Applications using it will instantly stop working and lose access. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setKeyToDelete(null); }}
                className={cn("px-5 py-2.5 rounded-xl font-medium transition-colors text-sm", isDark ? "hover:bg-white/[0.06] text-zinc-300" : "hover:bg-slate-100 text-slate-700")}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors text-sm"
              >
                Yes, Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
