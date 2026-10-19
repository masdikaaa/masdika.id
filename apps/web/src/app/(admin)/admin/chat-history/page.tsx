"use client";
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect, useCallback } from "react";
import { Bot, Search, Trash2, CheckCircle, ChevronLeft, ChevronRight, Eye, X, AlertTriangle, Shield, Clock, MessageCircle, Check , RefreshCw , MessageSquare } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type ChatSessionItem = {
  id: number;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  ipAddress: string;
  status: string;
  endedBy: string | null;
  endedAt: string | null;
  lastActiveAt: string;
  createdAt: string;
  messageCount: number;
  injectionCount: number;
};

type ChatMessageItem = {
  id: number;
  role: string;
  content: string;
  isInjectionAttempt: boolean;
  injectionPattern: string | null;
  isOutputBlocked: boolean;
  createdAt: string;
};

type SessionDetail = {
  id: number;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  ipAddress: string;
  status: string;
  endedBy: string | null;
  endedAt: string | null;
  lastActiveAt: string;
  createdAt: string;
  messages: ChatMessageItem[];
};

export default function AdminChatHistoryPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useUrlString<string>("statusFilter", '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Detail modal
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Ban Modal
  const [banIpSession, setBanIpSession] = useState<ChatSessionItem | null>(null);
  const [banOption, setBanOption] = useState<'EXACT' | 'PREFIX'>('EXACT');
  const [isBanning, setIsBanning] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/chat-sessions?${params}`);
      const data = await res.json();
      if (!data.error) {
        setSessions(data.sessions || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch chat sessions');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const handleViewDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/chat-sessions/${id}`);
      const data = await res.json();
      if (!data.error) {
        setDetailSession(data);
      } else {
        toast.error('Failed to load session detail');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/chat-sessions/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Session deleted successfully');
        fetchSessions();
        if (detailSession?.id === deleteId) setDetailSession(null);
      } else {
        toast.error('Failed to delete session');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBanIp = async () => {
    if (!banIpSession) return;
    setIsBanning(true);
    try {
      let banValue = banIpSession.ipAddress;
      if (banOption === 'PREFIX') {
        if (banValue.includes(':')) {
          const parts = banValue.split(':');
          if (parts.length >= 4) {
            banValue = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::/64`;
          }
        } else {
          const parts = banValue.split('.');
          if (parts.length === 4) {
            banValue = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
          }
        }
      }

      const res = await fetch('/api/admin/blocked-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'IP', value: banValue, reason: `Banned from chat session ${banIpSession.sessionId}` }),
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully banned IP ${banOption === 'PREFIX' ? 'prefix' : ''}: ${banValue}`);
        setBanIpSession(null);
      } else {
        toast.error(data.error || 'Failed to ban IP');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsBanning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/chat-sessions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        toast.success(`${selectedIds.length} sessions deleted`);
        setSelectedIds([]);
        fetchSessions();
      } else {
        toast.error('Failed to delete sessions');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDelete(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sessions.length && sessions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sessions.map(s => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string, endedBy: string | null) => {
    if (status === 'ACTIVE') {
      return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>● Active</span>;
    }
    const endLabel = endedBy === 'AUTO_IDLE' ? 'Auto' : endedBy === 'ADMIN' ? 'Admin' : 'User';
    return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/20 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-slate-500")}>Ended ({endLabel})</span>;
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Chat History</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Monitor all AI Assistant conversation sessions ({total} {total === 1 ? 'session' : 'sessions'})</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {sessions.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-5 py-2 font-bold rounded-xl transition-all border", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedIds.length === sessions.length ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                {selectedIds.length === sessions.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
              </div>
              <span className="hidden sm:inline">{selectedIds.length === sessions.length ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
          <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
            <Bot className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-cyan-400" : "text-cyan-700")} />
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className={cn("flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 font-bold rounded-xl transition-all border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Delete ({selectedIds.length})</span>
            </button>
          )}
      </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone, or IP..."
            className={cn("w-full border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
          />
        </div>
        <div className="flex gap-2">
          {['', 'ACTIVE', 'ENDED'].map(f => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              className={cn("px-4 py-2 rounded-xl text-xs font-semibold transition-all border",
                statusFilter === f
                  ? "bg-cyan-400 border-cyan-400 text-slate-950 font-bold"
                  : (isDark ? "bg-[#060b14] text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900")
              )}
            >
              {f === '' ? 'All' : f === 'ACTIVE' ? '● Active' : 'Ended'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b", isDark ? "bg-slate-900/60 text-slate-400 border-slate-800 font-semibold" : "bg-slate-50 text-slate-500 border-slate-200 font-semibold")}>
              <tr>
                <th className="px-4 py-4 font-medium w-10"></th>
                <th className={cn("px-4 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>User</th>
                <th className={cn("px-4 py-4 font-medium hidden lg:table-cell", isDark ? "text-white" : "text-slate-900")}>IP</th>
                <th className={cn("px-4 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>Status</th>
                <th className={cn("px-4 py-4 font-medium text-center", isDark ? "text-white" : "text-slate-900")}>Msgs</th>
                <th className={cn("px-4 py-4 font-medium text-center hidden sm:table-cell", isDark ? "text-white" : "text-slate-900")}>
                  <Shield className={cn("w-3.5 h-3.5 inline", isDark ? "text-red-400" : "text-red-700")} />
                </th>
                <th className={cn("px-4 py-4 font-medium hidden md:table-cell", isDark ? "text-white" : "text-slate-900")}>Date</th>
                <th className={cn("px-4 py-4 text-right font-medium", isDark ? "text-white" : "text-slate-900")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    No chat sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className={cn("border-b transition-colors", isDark ? "border-slate-800/80 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50/80")}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => toggleSelect(s.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(s.id) ? 'bg-cyan-400 border-cyan-400 text-slate-950' : isDark ? "border-slate-700 bg-slate-900 hover:border-cyan-400" : "border-slate-300 bg-white hover:border-cyan-600"}`}>
                        {selectedIds.includes(s.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <img referrerPolicy="no-referrer"                           src={`/api/avatar?email=${encodeURIComponent(s.email)}&name=${encodeURIComponent(s.name)}`}
                          alt={s.name}
                          className={cn("w-10 h-10 rounded-full border object-cover flex-shrink-0", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}
                        loading="lazy" decoding="async" />
                        <div className="flex flex-col">
                          <div className={cn("font-semibold text-sm truncate max-w-[160px]", isDark ? "text-white" : "text-slate-900")}>{s.name}</div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-[160px]">{s.email}</div>
                          <div className="text-[10px] text-zinc-600 truncate max-w-[160px]">{s.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500 hidden lg:table-cell whitespace-nowrap">{s.ipAddress}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(s.status, s.endedBy)}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{s.messageCount}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell whitespace-nowrap">
                      {s.injectionCount > 0 ? (
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 border border-red-500/20 whitespace-nowrap", isDark ? "text-red-400" : "text-red-700")}>
                          ⚠ {s.injectionCount}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                      <div className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>{new Date(s.createdAt).toLocaleDateString('id-ID')}</div>
                      <div className="text-[10px] text-zinc-600">{new Date(s.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewDetail(s.id)}
                          className={cn("p-2 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                          title="View Messages"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setBanIpSession(s)}
                          className={cn("p-2 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                          title="Ban IP"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className={cn("p-2 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                          title="Delete Session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-zinc-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={cn("px-3 py-2 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors border", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={cn("px-3 py-2 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors border", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {(detailSession || loadingDetail) && (
        <>
          <button
            type="button"
            aria-label="Close detail"
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm cursor-default"
            onClick={() => { setDetailSession(null); setLoadingDetail(false); }}
          />
          <div className={cn("fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:max-h-[80vh] z-50 border rounded-2xl flex flex-col overflow-hidden shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}>
            {loadingDetail && !detailSession ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-400" : "text-cyan-700")} />
              </div>
            ) : detailSession && (
              <>
                {/* Modal Header */}
                <div className={cn("p-4 sm:p-5 border-b flex items-start justify-between gap-2", isDark ? "border-slate-800" : "border-slate-200")}>
                  <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                    <img referrerPolicy="no-referrer"                       src={`/api/avatar?email=${encodeURIComponent(detailSession.email)}&name=${encodeURIComponent(detailSession.name)}`}
                      alt={detailSession.name}
                      className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-full border object-cover flex-shrink-0", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}
                    loading="lazy" decoding="async" />
                    <div className="flex-1 min-w-0">
                      <h3 className={cn("font-bold text-base sm:text-lg leading-tight truncate", isDark ? "text-white" : "text-slate-900")}>{detailSession.name}</h3>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-3 gap-y-0.5 mt-1 sm:mt-1.5">
                        <span className={cn("text-[11px] sm:text-xs font-medium truncate max-w-full", isDark ? "text-zinc-400" : "text-slate-500")}>{detailSession.email}</span>
                        <span className="text-[11px] sm:text-xs text-zinc-600 hidden sm:inline">•</span>
                        <span className={cn("text-[11px] sm:text-xs font-medium truncate max-w-full", isDark ? "text-zinc-400" : "text-slate-500")}>{detailSession.phone}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 mt-1.5 sm:mt-2">
                        <span className={cn("text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-mono border break-all", isDark ? "text-slate-400 border-slate-800 bg-[#060b14]" : "text-slate-500 border-slate-200 bg-slate-50")}>IP: {detailSession.ipAddress}</span>
                        {getStatusBadge(detailSession.status, detailSession.endedBy)}
                        <div className="flex items-center gap-1 sm:gap-1.5 text-zinc-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="text-[9px] sm:text-[10px] font-medium">{new Date(detailSession.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailSession(null)}
                    className={cn("w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all border flex-shrink-0", isDark ? "text-slate-400 border-slate-800 hover:border-red-500/20" : "text-slate-500 border-slate-200 hover:border-red-500/20")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages */}
                <div className={cn("flex-1 overflow-y-auto p-5 space-y-5", isDark ? "bg-[#060b14]" : "bg-slate-50")}>
                  {detailSession.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                      <MessageCircle className="w-12 h-12 mb-3 text-zinc-600/50" />
                      <p className="text-sm font-medium">No messages in this session.</p>
                    </div>
                  ) : (
                    detailSession.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        {msg.isInjectionAttempt && (
                          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-red-500/10 rounded-lg mb-1.5 border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Injection Attempt: {msg.injectionPattern?.substring(0, 50)}</span>
                          </div>
                        )}
                        {msg.isOutputBlocked && (
                          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-orange-500/10 rounded-lg mb-1.5 border border-orange-500/20", isDark ? "text-orange-400" : "text-orange-600")}>
                            <Shield className="w-3 h-3" />
                            <span>Output Blocked</span>
                          </div>
                        )}
                        <div className={cn("relative max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm", msg.role === "user" ? (msg.isInjectionAttempt ? "bg-red-950/80 border-red-500/30 text-white rounded-2xl rounded-tr-sm border" : "bg-gradient-to-br from-cyan-600 to-cyan-600 border-cyan-400/20 text-white rounded-2xl rounded-tr-sm border") : (isDark ? "bg-[#0b1322] border border-slate-800 text-gray-200 rounded-2xl rounded-tl-sm " + (msg.isOutputBlocked ? "border-orange-500/30" : "") : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm" + (msg.isOutputBlocked ? "border-orange-500" : "")))}>
                          <p className="break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1.5 px-1 font-medium">
                          {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Session?"
        description="Are you sure you want to delete this chat session? All messages will be permanently removed."
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected?"
        description={`Are you sure you want to delete ${selectedIds.length} chat sessions? All messages will be permanently removed.`}
        confirmText="Delete"
        isLoading={isBulkDeleting}
        variant="danger"
      />

      {/* Ban IP Modal */}
      {banIpSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setBanIpSession(null)} />
          <div className={cn("relative border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className={cn("p-5 border-b flex items-center gap-3", isDark ? "border-slate-800" : "border-slate-200")}>
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Shield className={cn("w-5 h-5", isDark ? "text-red-400" : "text-red-600")} />
              </div>
              <div>
                <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-900")}>Ban IP Address</h3>
                <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Block {banIpSession.name} from accessing the site.</p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <label className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors", isDark ? "border-slate-800 bg-[#060b14] hover:border-slate-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100")}>
                <div className="flex-shrink-0 pt-0.5">
                  <input
                    type="radio"
                    name="banOption"
                    value="EXACT"
                    checked={banOption === 'EXACT'}
                    onChange={() => setBanOption('EXACT')}
                    className={cn("w-4 h-4 text-cyan-500 focus:ring-cyan-500", isDark ? "border-white/20" : "border-slate-200")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm font-bold mb-0.5", isDark ? "text-white" : "text-slate-900")}>Ban Exact IP</div>
                  <div className={cn("text-xs font-mono p-1.5 rounded inline-block break-all", isDark ? "text-zinc-400" : "text-slate-500")}>{banIpSession.ipAddress}</div>
                  <p className="text-[10px] text-zinc-500 mt-1">Blocks only this specific IP address.</p>
                </div>
              </label>

              <label className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors", isDark ? "border-slate-800 bg-[#060b14] hover:border-slate-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100")}>
                <div className="flex-shrink-0 pt-0.5">
                  <input
                    type="radio"
                    name="banOption"
                    value="PREFIX"
                    checked={banOption === 'PREFIX'}
                    onChange={() => setBanOption('PREFIX')}
                    className={cn("w-4 h-4 text-cyan-500 focus:ring-cyan-500", isDark ? "border-white/20" : "border-slate-200")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm font-bold mb-0.5", isDark ? "text-white" : "text-slate-900")}>
                    Ban IP Prefix ({banIpSession.ipAddress.includes(':') ? '/64' : '/24'})
                  </div>
                  <div className={cn("text-xs font-mono p-1.5 rounded inline-block break-all", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {banIpSession.ipAddress.includes(':') 
                      ? `${banIpSession.ipAddress.split(':').slice(0, 4).join(':')}::/64`
                      : `${banIpSession.ipAddress.split('.').slice(0, 3).join('.')}.0/24`}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">Blocks the entire subnet. Useful for stopping coordinated spam from the same provider/location.</p>
                </div>
              </label>
            </div>

            <div className={cn("p-4 border-t flex gap-3 justify-end", isDark ? "border-slate-800" : "border-slate-200")}>
              <button
                onClick={() => setBanIpSession(null)}
                className={cn("px-5 py-2 text-sm font-medium border rounded-xl transition-colors", isDark ? "text-slate-300 border-slate-800 bg-[#060b14] hover:bg-slate-800" : "text-slate-600 border-slate-200 bg-white hover:bg-slate-50")}
                disabled={isBanning}
              >
                Cancel
              </button>
              <button
                onClick={handleBanIp}
                disabled={isBanning}
                className="px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isBanning ? 'Banning...' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
