"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Key, Activity, Clock, Loader2, Server, User as UserIcon, Trash2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";

export default function AdminApiHubPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchKeys();
    // Poll every 10 seconds for real-time usage updates
    const interval = setInterval(fetchKeys, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchKeys = async () => {
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
    }
  };

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
        toast.success(data.message || "User deleted successfully");
        fetchKeys();
      } else {
        toast.error(data.error || "Failed to delete user");
      }
    } catch (err) {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>API Hub Users</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Monitor API key usage and active users in real-time.</p>
        </div>
        <div className={cn("px-4 py-2 rounded-xl border flex items-center gap-2 shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
          <Activity className="w-4 h-4 animate-pulse shrink-0" />
          <span className="text-sm font-bold whitespace-nowrap">Real-time Sync</span>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={cn("border p-6 rounded-2xl", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Total API Keys</h3>
            <Key className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
          </div>
          <p className={cn("text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>{users.length}</p>
        </div>
        <div className={cn("border p-6 rounded-2xl", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Total API Requests</h3>
            <Server className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
          </div>
          <p className={cn("text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
            {users.reduce((acc: number, curr: any) => acc + curr.totalUsage, 0).toLocaleString()}
          </p>
        </div>
        <div className={cn("border p-6 rounded-2xl", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Active Users</h3>
            <UserIcon className={cn("w-5 h-5", isDark ? "text-emerald-400" : "text-emerald-700")} />
          </div>
          <p className={cn("text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
            {users.length}
          </p>
        </div>
      </div>

      <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b", isDark ? "border-white/10" : "border-slate-200")}>
                <th className={cn("p-4 text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>User</th>
                <th className={cn("p-4 text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Key Details</th>
                <th className={cn("p-4 text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Usage Count</th>
                <th className={cn("p-4 text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Last Used</th>
                <th className={cn("p-4 text-xs font-semibold uppercase tracking-wider text-right", isDark ? "text-zinc-400" : "text-slate-500")}>Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn("p-8 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm">Loading data...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn("p-8 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                    No active customers found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{user.name || "Unknown"}</span>
                        <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>{user.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {user.keyCount > 0 ? (
                          <>
                            <span className={cn("font-medium text-sm", isDark ? "text-cyan-400" : "text-cyan-700")}>{user.keyCount} Active Keys</span>
                            <code className={cn("text-xs font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>
                              {user.apiKeys[0]?.key.substring(0, 15)}...
                            </code>
                          </>
                        ) : (
                          <span className={cn("text-sm italic", isDark ? "text-zinc-500" : "text-slate-500")}>No API Keys Generated</span>
                        )}
                        {user.shortLinkCount > 0 && (
                          <span className={cn("font-medium text-xs mt-1 bg-emerald-500/10 w-fit px-2 py-0.5 rounded", isDark ? "text-emerald-400" : "text-emerald-700")}>
                            {user.shortLinkCount} Short Links
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-lg font-bold", isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700")}>
                        <Activity className="w-3 h-3" />
                        {user.totalUsage.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={cn("flex items-center gap-2 text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Clock className="w-4 h-4" />
                        {user.lastUsed ? new Date(user.lastUsed).toLocaleString() : "Never"}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setDeleteId(user.id)} className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors", isDark ? "text-red-400" : "text-red-700")}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
          <div className={cn("p-4 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Customer API Keys"
        description="Are you sure you want to delete all API keys for this customer? This will permanently remove their active API keys and short links, but their account and other data will be retained. This action cannot be undone."
        confirmText="Delete Keys"
        isLoading={deleting}
      />
    </div>
  );
}
