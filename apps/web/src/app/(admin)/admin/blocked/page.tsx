"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { ShieldBan, Trash2, CheckCircle, Check , RefreshCw } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminBlockedUsersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockId, setUnblockId] = useState<number | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchBlockedUsers = async () => {
    try {
      const res = await fetch("/api/admin/blocked-users");
      const data = await res.json();
      if (!data.error) {
        setBlockedUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const handleUnblock = async () => {
    if (!unblockId) return;
    setIsUnblocking(true);
    try {
      await fetch(`/api/admin/blocked-users/${unblockId}`, { method: "DELETE" });
      fetchBlockedUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUnblocking(false);
      setUnblockId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/blocked-users/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setBlockedUsers(blockedUsers.filter(u => !selectedIds.includes(u.id)));
        setSelectedIds([]);
        toast.success(`${selectedIds.length} users unblocked successfully`);
      } else {
        toast.error("Failed to unblock users");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === blockedUsers.length && blockedUsers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(blockedUsers.map(u => u.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (loading) {
    return <AdminLoader />;
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Blocked Users</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage blocked IP addresses and Emails</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {blockedUsers.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-5 py-2 font-bold rounded-xl transition-all border", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedIds.length === blockedUsers.length ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                {selectedIds.length === blockedUsers.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
              </div>
              <span className="hidden sm:inline">{selectedIds.length === blockedUsers.length ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
            <ShieldBan className={cn("w-5 h-5", isDark ? "text-red-400" : "text-red-700")} />
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 font-bold rounded-xl transition-all border", isDark ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400" : "bg-red-50 hover:bg-red-100 border-red-200 text-red-700")}
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Unblock ({selectedIds.length})</span>
            </button>
          )}
      </div>
      </div>

      <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-[10px] uppercase border-b tracking-wider font-bold", isDark ? "bg-slate-900/60 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {blockedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className={cn("px-6 py-8 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                    No blocked users found.
                  </td>
                </tr>
              ) : (
                blockedUsers.map((user) => (
                  <tr key={user.id} className={cn("transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(user.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(user.id) ? 'bg-cyan-400 border-cyan-400 text-slate-950' : isDark ? "border-slate-700 hover:border-cyan-400 bg-slate-900/50" : "border-slate-300 hover:border-cyan-600 bg-white"}`}>
                        {selectedIds.includes(user.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-1 rounded text-xs font-bold border", user.type === "IP" ? (isDark ? "bg-orange-500/20 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-700 border-orange-200") : (isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"))}>
                        {user.type}
                      </span>
                    </td>
                    <td className={cn("px-6 py-4 font-mono", isDark ? "text-white" : "text-slate-900")}>{user.value}</td>
                    <td className="px-6 py-4 max-w-[300px] truncate">{user.reason}</td>
                    <td className="px-6 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setUnblockId(user.id)}
                        className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-green-400 hover:bg-green-500/10" : "text-slate-500 hover:text-green-700 hover:bg-green-50")}
                        title="Unblock User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!unblockId}
        onClose={() => setUnblockId(null)}
        onConfirm={handleUnblock}
        title="Unblock User?"
        description="Are you sure you want to unblock this user? They will be able to access the site again."
        confirmText="Unblock"
        isLoading={isUnblocking}
        variant="warning"
      />

      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Unblock Selected?"
        description={`Are you sure you want to unblock ${selectedIds.length} selected users? They will be able to access the site again.`}
        confirmText="Unblock"
        isLoading={isDeletingAll}
        variant="warning"
      />
    </div>
  );
}
