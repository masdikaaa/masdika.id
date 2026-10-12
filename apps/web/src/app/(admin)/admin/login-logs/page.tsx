'use client';
import { useUrlNumber } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, ShieldBan, Trash2, UserX, Check, CheckCircle } from 'lucide-react';
import { useTheme } from "@/components/ThemeProvider";
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';
import { AdminLoader } from '@/components/admin/AdminLoader';

type LoginLog = {
  id: number;
  ipAddress: string;
  emailAttempt: string;
  success: boolean;
  isBanned: boolean;
  createdAt: string;
};

export default function LoginLogsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        toast.error('Failed to load login logs');
      }
    } catch {
      toast.error('Something went wrong while fetching logs');
    } finally {
      setLoading(false);
    }
  };

  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [unbanIp, setUnbanIp] = useState<string | null>(null);
  const [isUnbanning, setIsUnbanning] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchLogs();
  }, []);


  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/login-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [deleteId] })
      });
      if (res.ok) {
        toast.success('Log deleted');
        setLogs(logs.filter(log => log.id !== deleteId));
      } else {
        toast.error('Failed to delete log');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleUnban = async () => {
    if (!unbanIp) return;
    setIsUnbanning(true);
    try {
      const res = await fetch('/api/admin/login-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: unbanIp })
      });
      if (res.ok) {
        toast.success(`IP ${unbanIp} has been unbanned`);
        // Refresh logs to update status
        fetchLogs();
      } else {
        toast.error('Failed to unban IP');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsUnbanning(false);
      setUnbanIp(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(logs.map(l => l.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/login-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        toast.success(`${selectedIds.length} logs deleted`);
        setLogs(logs.filter(log => !selectedIds.includes(log.id)));
        setSelectedIds([]);
      } else {
        toast.error('Failed to delete logs');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteModal(false);
    }
  };

  const getStatusIcon = (log: LoginLog) => {
    if (log.isBanned) {
      return (
        <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 w-fit", isDark ? "text-red-500" : "text-red-700")}>
          <ShieldBan className={cn("w-4 h-4", isDark ? "text-red-500" : "text-red-700")} />
          <span className="text-xs font-bold">Banned (Brute Force)</span>
        </div>
      );
    }
    if (log.success) {
      return (
        <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit", isDark ? "text-emerald-500" : "text-emerald-700")}>
          <CheckCircle2 className={cn("w-4 h-4", isDark ? "text-emerald-500" : "text-emerald-700")} />
          <span className="text-xs font-bold">Success</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 w-fit">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <span className="text-xs font-bold">Failed</span>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Security & Login Logs</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Monitor login attempts and brute-force blocks</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {logs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={cn("px-4 py-2 font-medium rounded-xl transition-all border flex items-center gap-2 whitespace-nowrap", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedIds.length === logs.length ? "bg-cyan-500 border-cyan-500" : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                {selectedIds.length === logs.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
              </div>
              {selectedIds.length === logs.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className={cn("px-4 py-2 bg-red-500/10 hover:bg-red-500/20 font-medium rounded-xl transition-all border border-red-500/20 flex items-center gap-2 whitespace-nowrap", isDark ? "text-red-500" : "text-red-700")}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={fetchLogs}
            className={cn("px-4 py-2 font-medium rounded-xl transition-all border whitespace-nowrap", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
          >
            Refresh Logs
          </button>
      </div>
      </div>

      {/* Main Content */}
      <div className={cn("border rounded-2xl shadow-xl overflow-hidden", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        {loading ? (
          <AdminLoader className="min-h-[250px] p-12" />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", isDark ? "border-white/10" : "border-slate-200")}>
              <ShieldAlert className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-400")} />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Login Logs Found</h3>
            <p className={cn("max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>There are no recent login attempts recorded in the database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn("border-b", isDark ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-200")}>
                  <th className="px-6 py-4 w-12 text-center"></th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Status</th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Email Attempted</th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>IP Address</th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Time</th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider text-right", isDark ? "text-zinc-400" : "text-slate-500")}>Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className={cn("transition-colors group", selectedIds.includes(log.id) ? (isDark ? "bg-cyan-500/5" : "bg-cyan-50") : (isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"))}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleSelect(log.id)}
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                          selectedIds.includes(log.id)
                            ? "bg-cyan-500 border-cyan-500"
                            : 'border-zinc-500 group-hover:border-zinc-400'
                        }`}
                      >
                        {selectedIds.includes(log.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusIcon(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{log.emailAttempt}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={cn("font-mono text-xs px-2 py-1 rounded inline-block", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {log.ipAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {log.isBanned && (
                          <button
                            onClick={() => setUnbanIp(log.ipAddress)}
                            className={cn("p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 hover: rounded-lg transition-colors border border-emerald-500/20 group relative", isDark ? "text-emerald-400" : "text-emerald-700")}
                            title="Unban IP Address"
                          >
                            <UserX className="w-4 h-4" />
                            <span className={cn("absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm", isDark ? "bg-black/80 text-white" : "bg-white text-slate-900 border border-slate-200")}>Unban IP</span>
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(log.id)}
                          className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover: rounded-lg transition-colors border border-red-500/20 group relative", isDark ? "text-red-400" : "text-red-700")}
                          title="Delete Log"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className={cn("absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm", isDark ? "bg-black/80 text-white" : "bg-white text-slate-900 border border-slate-200")}>Delete Log</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {logs.length > 0 && (
          <div className={cn("p-6 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Log Entry"
        description="Are you sure you want to delete this login log? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!unbanIp}
        onClose={() => setUnbanIp(null)}
        onConfirm={handleUnban}
        title="Unban IP Address"
        description={`Are you sure you want to remove the brute-force ban for IP ${unbanIp}? They will be able to attempt login again.`}
        confirmText="Unban"
        isLoading={isUnbanning}
        variant="danger"
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Logs?"
        description={`Are you sure you want to delete ${selectedIds.length} selected logs? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isBulkDeleting}
        variant="danger"
      />
    </div>
  );
}
