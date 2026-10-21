'use client';
import { useUrlNumber } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, ShieldBan, Trash2, UserX, Check, CheckCircle, RefreshCw, Search } from 'lucide-react';
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

  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'banned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter(log => {
    if (statusFilter === 'banned' && !log.isBanned) return false;
    if (statusFilter === 'success' && !log.success) return false;
    if (statusFilter === 'failed' && (log.success || log.isBanned)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = log.emailAttempt?.toLowerCase().includes(q);
      const matchIp = log.ipAddress?.toLowerCase().includes(q);
      if (!matchEmail && !matchIp) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalCount = logs.length;
  const successCount = logs.filter(l => l.success).length;
  const failedCount = logs.filter(l => !l.success && !l.isBanned).length;
  const bannedCount = logs.filter(l => l.isBanned).length;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Security & Login Logs
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Monitor authentication attempts, brute-force mitigation, and IP status.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
            <span>Total Logs:</span>
            <span className="font-extrabold text-white">{totalCount}</span>
          </div>
          <button
            onClick={fetchLogs}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL ATTEMPTS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{totalCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>All events</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>SUCCESSFUL</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{successCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-emerald-400" : "text-emerald-600")}>Authorized</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>FAILED ATTEMPTS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{failedCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-amber-400" : "text-amber-600")}>Invalid credentials</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>BRUTE FORCE BANS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-red-500/15 border-red-500/25 text-red-400" : "bg-red-50 border-red-200 text-red-700")}>
              <ShieldBan className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{bannedCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-red-400" : "text-red-600")}>Auto mitigated</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar (GAMBAR 1 Style) */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("inline-flex items-center gap-1 p-1 rounded-xl border max-w-full overflow-x-auto scrollbar-none self-start", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
          {[
            { key: 'all', label: 'All Logs', count: totalCount },
            { key: 'success', label: 'Success', count: successCount },
            { key: 'failed', label: 'Failed', count: failedCount },
            { key: 'banned', label: 'Banned', count: bannedCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key as any); setCurrentPage(1); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                statusFilter === tab.key
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-white"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("px-1.5 py-0.2 rounded-full text-[10px]", statusFilter === tab.key ? "bg-slate-950/20 text-slate-950 font-extrabold" : isDark ? "bg-white/10 text-zinc-300" : "bg-slate-200 text-slate-700")}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {filteredLogs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={cn("px-3.5 py-2 font-bold text-xs rounded-xl transition-all border flex items-center gap-2 whitespace-nowrap", isDark ? "bg-[#060b14] text-white border-slate-800 hover:border-slate-700" : "bg-slate-50 text-slate-900 border-slate-200 hover:bg-white")}
            >
              <div className={cn(
                "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                selectedIds.length === filteredLogs.length && filteredLogs.length > 0
                  ? "bg-cyan-500 border-cyan-500 text-slate-950"
                  : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"
              )}>
                {selectedIds.length === filteredLogs.length && filteredLogs.length > 0 && <Check className="w-3 h-3 text-slate-950 font-bold" strokeWidth={3} />}
              </div>
              <span>{selectedIds.length === filteredLogs.length && filteredLogs.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className={cn("px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 font-bold text-xs rounded-xl transition-all border border-red-500/20 flex items-center gap-2 whitespace-nowrap", isDark ? "text-red-400" : "text-red-700")}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
          <div className="relative w-full sm:w-64">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search email, IP..." 
              className={cn("w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl border focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("border rounded-2xl overflow-hidden relative z-10", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        {loading ? (
          <AdminLoader className="min-h-[250px] p-12" />
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mb-4 border transition-transform duration-500", isDark ? "bg-[#060b14] border-slate-800 text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Login Logs Found</h3>
            <p className={cn("text-sm max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>There are no login attempts matching your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn("border-b text-xs uppercase tracking-wider font-semibold", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
                  <th className="p-4 w-12 text-center">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAll();
                      }}
                      className={cn(
                        "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                        selectedIds.length === filteredLogs.length && filteredLogs.length > 0
                          ? "bg-cyan-500 border-cyan-500 text-slate-950"
                          : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                      )}
                    >
                      {selectedIds.length === filteredLogs.length && filteredLogs.length > 0 && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" strokeWidth={3} />}
                    </button>
                  </th>
                  <th className="p-4 whitespace-nowrap font-medium">Status</th>
                  <th className="p-4 whitespace-nowrap font-medium">Email Attempted</th>
                  <th className="p-4 whitespace-nowrap font-medium">IP Address</th>
                  <th className="p-4 whitespace-nowrap font-medium">Time</th>
                  <th className="p-4 text-right whitespace-nowrap font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80", selectedIds.includes(log.id) && (isDark ? "bg-white/5" : "bg-slate-50"))}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleSelect(log.id)}
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                          selectedIds.includes(log.id)
                            ? "bg-cyan-400 border-cyan-400 text-slate-950"
                            : isDark ? "border-slate-700 hover:border-cyan-400 bg-slate-900/50" : "border-slate-300 hover:border-cyan-600 bg-white"
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
                            <span className={cn("absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none", isDark ? "bg-black/80 text-white" : "bg-white text-slate-900 border border-slate-200")}>Unban IP</span>
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(log.id)}
                          className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover: rounded-lg transition-colors border border-red-500/20 group relative", isDark ? "text-red-400" : "text-red-700")}
                          title="Delete Log"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className={cn("absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none", isDark ? "bg-black/80 text-white" : "bg-white text-slate-900 border border-slate-200")}>Delete Log</span>
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
          <div className={cn("p-6 border-t", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
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
