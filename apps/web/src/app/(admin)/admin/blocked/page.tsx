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

  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = blockedUsers.filter(u => {
    if (filterType !== "all" && u.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchVal = u.value?.toLowerCase().includes(q);
      const matchReason = u.reason?.toLowerCase().includes(q);
      if (!matchVal && !matchReason) return false;
    }
    return true;
  });

  const totalCount = blockedUsers.length;
  const ipCount = blockedUsers.filter(u => u.type === "IP").length;
  const emailCount = blockedUsers.filter(u => u.type === "EMAIL").length;

  if (loading) {
    return <AdminLoader />;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Blocked Users & IPs
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage and inspect blocked IP addresses and abusive email identifiers.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
            <span>Total Blocked:</span>
            <span className="font-extrabold text-white">{totalCount}</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchBlockedUsers(); }}
            className={cn(
              "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid (GAMBAR 1 Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL RESTRICTIONS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-red-500/15 border-red-500/25 text-red-400" : "bg-red-50 border-red-200 text-red-700")}>
              <ShieldBan className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{totalCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-red-400" : "text-red-600")}>Active bans</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>BLOCKED IP ADDRESSES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-orange-500/15 border-orange-500/25 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700")}>
              <ShieldBan className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{ipCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-orange-400" : "text-orange-600")}>Network blocks</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>BLOCKED EMAILS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <ShieldBan className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{emailCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Accounts blocked</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar (GAMBAR 1 Style) */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("inline-flex p-1 rounded-xl border self-start md:self-auto overflow-x-auto max-w-full", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
          {[
            { key: "all", label: "All Restrictions", count: totalCount },
            { key: "IP", label: "IP Addresses", count: ipCount },
            { key: "EMAIL", label: "Emails", count: emailCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                filterType === tab.key
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-white"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("px-1.5 py-0.2 rounded-full text-[10px]", filterType === tab.key ? "bg-slate-950/20 text-slate-950 font-extrabold" : isDark ? "bg-white/10 text-zinc-300" : "bg-slate-200 text-slate-700")}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {filteredUsers.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold rounded-xl text-xs transition-all border", isDark ? "bg-[#060b14] text-white border-slate-800 hover:border-slate-700" : "bg-slate-50 text-slate-900 border-slate-200 hover:bg-white")}
            >
              <div className={cn(
                "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                selectedIds.length === filteredUsers.length && filteredUsers.length > 0
                  ? "bg-cyan-500 border-cyan-500 text-slate-950"
                  : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"
              )}>
                {selectedIds.length === filteredUsers.length && filteredUsers.length > 0 && <CheckCircle className="w-3 h-3 text-slate-950" />}
              </div>
              <span>{selectedIds.length === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Unblock Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className={cn("border rounded-2xl overflow-hidden relative z-10", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b tracking-wider font-semibold", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="p-4 w-12">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectAll();
                    }}
                    className={cn(
                      "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                      selectedIds.length === filteredUsers.length && filteredUsers.length > 0
                        ? "bg-cyan-500 border-cyan-500 text-slate-950"
                        : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                    )}
                  >
                    {selectedIds.length === filteredUsers.length && filteredUsers.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                  </button>
                </th>
                <th className="p-4 whitespace-nowrap font-medium">Type</th>
                <th className="p-4 whitespace-nowrap font-medium">Target Value</th>
                <th className="p-4 whitespace-nowrap font-medium">Ban Reason</th>
                <th className="p-4 whitespace-nowrap font-medium">Blocked Date</th>
                <th className="p-4 text-right whitespace-nowrap font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-transform duration-500", isDark ? "bg-[#060b14] border-slate-800 text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
                        <ShieldBan className="w-10 h-10" />
                      </div>
                      <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No blocked users found</h3>
                      <p className="text-zinc-500 text-sm max-w-sm">There are no blocked users or IP restrictions matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={cn("transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                    <td className="p-4">
                      <button 
                        onClick={() => toggleSelect(user.id)} 
                        className={cn(
                          "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                          selectedIds.includes(user.id)
                            ? "bg-cyan-500 border-cyan-500 text-slate-950"
                            : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                        )}
                      >
                        {selectedIds.includes(user.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold border", user.type === "IP" ? (isDark ? "bg-orange-500/20 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-700 border-orange-200") : (isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"))}>
                        {user.type}
                      </span>
                    </td>
                    <td className={cn("p-4 font-mono font-bold", isDark ? "text-white" : "text-slate-900")}>{user.value}</td>
                    <td className="p-4 max-w-[300px] truncate">{user.reason}</td>
                    <td className="p-4 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => setUnblockId(user.id)}
                        className={cn("p-2 rounded-lg transition-colors border border-transparent", isDark ? "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50")}
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
