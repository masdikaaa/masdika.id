"use client";
import { useUrlNumber } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Key, Activity, Clock, Server, Users, Trash2, RefreshCw, Layers } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminApiHubPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchKeys = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/api-hub");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchKeys();
    // Poll every 15 seconds for real-time usage updates
    const interval = setInterval(fetchKeys, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/api-hub", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Customer API keys deleted successfully");
        fetchKeys();
      } else {
        toast.error(data.error || "Failed to delete API keys");
      }
    } catch (err) {
      toast.error("Failed to delete API keys");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold mb-1 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            API Hub Users
          </h1>
          <p className={cn("text-xs sm:text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Monitor active API Hub subscribers, key usage, and developer endpoints.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={cn("px-3.5 py-2 rounded-lg font-semibold text-xs border flex items-center gap-1.5", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            <span>Subscribers:</span>
            <span className="font-bold text-white">{users.length}</span>
          </div>
          <button
            onClick={() => fetchKeys()}
            disabled={isRefreshing || loading}
            className={cn(
              "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isRefreshing || loading) && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
        <div className={cn("relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-colors", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Total API Keys</span>
            <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Key className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {users.reduce((acc: number, curr: any) => acc + (curr.keyCount || 0), 0)}
          </div>
          <div className={cn("mt-1.5 text-[11px] font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Generated developer keys
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-colors", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Total Requests</span>
            <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {users.reduce((acc: number, curr: any) => acc + curr.totalUsage, 0).toLocaleString()}
          </div>
          <div className={cn("mt-1.5 text-[11px] font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Total endpoint hits
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-colors", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Active Subscribers</span>
            <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {users.length}
          </div>
          <div className={cn("mt-1.5 text-[11px] font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Subscribed to API Hub
          </div>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className={cn("border rounded-xl overflow-hidden", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b text-[11px] uppercase tracking-wider font-semibold", isDark ? "bg-[#0a0a0c] text-slate-400 border-white/[0.08]" : "bg-slate-50 text-slate-500 border-slate-200")}>
                <th className="px-3.5 py-2.5">User</th>
                <th className="px-3.5 py-2.5">Subscriptions</th>
                <th className="px-3.5 py-2.5">API Keys</th>
                <th className="px-3.5 py-2.5">Usage</th>
                <th className="px-3.5 py-2.5">Last Used</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className={cn("p-12 text-center text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-400" />
                    <p className="font-semibold text-zinc-300">No API Hub Subscribers Found</p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Only users with active API Hub plans or Developer API keys are displayed here.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors text-xs">
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-col">
                        <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{user.name || "Unknown"}</span>
                        <span className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-slate-500")}>{user.email}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.subscriptions && user.subscriptions.length > 0 ? (
                          user.subscriptions.map((sub: any) => (
                            <span
                              key={sub.id}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border",
                                sub.status === "ACTIVE"
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {sub.planName} ({sub.service})
                            </span>
                          ))
                        ) : (
                          <span className={cn("text-[11px] italic", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Key-only Access
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        {user.keyCount > 0 ? (
                          <>
                            <span className={cn("font-medium text-xs", isDark ? "text-cyan-400" : "text-cyan-700")}>
                              {user.keyCount} Active {user.keyCount === 1 ? 'Key' : 'Keys'}
                            </span>
                            <code className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>
                              {user.apiKeys[0]?.key.substring(0, 14)}...
                            </code>
                          </>
                        ) : (
                          <span className={cn("text-[11px] italic", isDark ? "text-zinc-500" : "text-slate-500")}>
                            No Keys Generated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-xs", isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700")}>
                        <Activity className="w-3 h-3" />
                        {user.totalUsage.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className={cn("flex items-center gap-1.5 text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{user.lastUsed ? new Date(user.lastUsed).toLocaleString() : "Never"}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        onClick={() => setDeleteId(user.id)}
                        title="Delete API Keys"
                        className={cn("p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer", isDark ? "text-red-400" : "text-red-700")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
          <div className={cn("p-3.5 border-t", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Customer API Keys"
        description="Are you sure you want to delete all API keys for this customer? This will permanently remove their active API keys, but their subscription account and data will be retained. This action cannot be undone."
        confirmText="Delete Keys"
        isLoading={deleting}
      />
    </div>
  );
}
