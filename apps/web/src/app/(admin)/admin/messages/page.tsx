"use client";
import { useUrlNumber } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Mail, MailOpen, Trash2, CheckCircle2, MessageSquareQuote, Check, CheckCircle, RefreshCw, Search } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";

export default function AdminMessagesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/messages');
      const data = await res.json();
      if (!data.error) {
        setMessages(data);
      }
    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });
      if (res.ok) {
        setMessages(messages.map(m => m.id === id ? { ...m, isRead: true } : m));
        toast.success("Marked as read");
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/admin/messages/read-all', { method: 'PUT' });
      if (res.ok) {
        setMessages(messages.map(m => ({ ...m, isRead: true })));
        toast.success("All messages marked as read");
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/messages/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(messages.filter(m => m.id !== deleteId));
        toast.success("Message deleted");
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        toast.error("Failed to delete message");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/messages/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setMessages(messages.filter(m => !selectedIds.includes(m.id)));
        setSelectedIds([]);
        toast.success(`${selectedIds.length} messages deleted`);
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        toast.error("Failed to delete messages");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map(m => m.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const renderMessageContent = (content: string) => {
    if (content.includes('- Automatically generated notification')) {
      const match = content.match(/New verified comment submitted:\n\n"([\s\S]*?)"\n\nIP Address: (.*?)\n\n- Automatically generated notification/);
      if (match) {
        const [, commentText, ip] = match;
        return (
          <div className="mt-2 space-y-3">
            <div className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-wider", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <MessageSquareQuote className="w-4 h-4" /> System Notification
            </div>
            <div className="p-5 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-l-4 border-cyan-500 rounded-r-2xl rounded-l-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <MessageSquareQuote className="w-16 h-16" />
              </div>
              <p className={cn("leading-relaxed italic relative z-10 text-base", isDark ? "text-zinc-200" : "text-slate-700")}>"{commentText}"</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
               <span className={cn("px-2 py-1 rounded font-mono border", isDark ? "bg-[#060b14] border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600")}>IP: {ip}</span>
            </div>
          </div>
        );
      }
    }
    return (
      <div className={cn("p-4 sm:p-5 rounded-2xl border leading-relaxed text-sm whitespace-pre-wrap", isDark ? "bg-[#060b14] border-slate-800 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-600")}>
        {content}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-400" : "text-cyan-700")} />
    </div>
  );

  const filteredMessages = messages.filter(msg => {
    if (statusFilter === 'unread' && msg.isRead) return false;
    if (statusFilter === 'read' && !msg.isRead) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = msg.subject?.toLowerCase().includes(q);
      const matchName = msg.name?.toLowerCase().includes(q);
      const matchEmail = msg.email?.toLowerCase().includes(q);
      const matchContent = msg.content?.toLowerCase().includes(q);
      if (!matchSubject && !matchName && !matchEmail && !matchContent) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const paginatedMessages = filteredMessages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalCount = messages.length;
  const unreadCount = messages.filter(m => !m.isRead).length;
  const readCount = messages.filter(m => m.isRead).length;
  const systemCount = messages.filter(m => m.content?.includes('Automatically generated notification')).length;

  return (
    <div className="space-y-6 relative z-10 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Messages & Inquiries
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage incoming contact inquiries and automated system notifications.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
            <span>Total Messages:</span>
            <span className="font-extrabold text-white">{totalCount}</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchMessages(); }}
            className={cn(
              "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards Grid (GAMBAR 1 Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL MESSAGES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{totalCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Total Received</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>UNREAD INQUIRIES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <MailOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{unreadCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Needs Review</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>READ MESSAGES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{readCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Reviewed</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>SYSTEM ALERTS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <MessageSquareQuote className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{systemCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Automated</span>
          </div>
        </div>
      </div>

      {/* Filter and Controls Bar (GAMBAR 1 Style) */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("inline-flex items-center gap-1 p-1 rounded-xl border max-w-full overflow-x-auto scrollbar-none self-start", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
          {[
            { key: 'all', label: 'All Messages', count: totalCount },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'read', label: 'Read', count: readCount },
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
          {messages.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold rounded-xl text-xs transition-all border", isDark ? "bg-[#060b14] text-white border-slate-800 hover:border-slate-700" : "bg-slate-50 text-slate-900 border-slate-200 hover:bg-white")}
            >
              <div className={cn(
                "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                selectedIds.length === messages.length && messages.length > 0
                  ? "bg-cyan-500 border-cyan-500 text-slate-950"
                  : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"
              )}>
                {selectedIds.length === messages.length && messages.length > 0 && <CheckCircle className="w-3 h-3 text-slate-950" />}
              </div>
              <span>{selectedIds.length === messages.length && messages.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <div className="relative w-full sm:w-64">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input 
              type="text" 
              placeholder="Search sender, email, subject..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className={cn("w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl border focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredMessages.length === 0 ? (
          <div className={cn("rounded-2xl p-16 text-center border relative overflow-hidden group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-transform duration-500 group-hover:scale-105", isDark ? "bg-[#060b14] border-slate-800 text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
              <MailOpen className="w-10 h-10" />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Messages Found</h3>
            <p className={cn("text-sm max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>There are no inquiries matching your current filters.</p>
          </div>
        ) : (
          paginatedMessages.map((msg, index) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-2xl p-5 sm:p-6 border transition-all",
                msg.isRead 
                  ? (isDark ? "bg-[#0b1322] border-slate-800/80 shadow-sm" : "bg-white border-slate-200 shadow-sm")
                  : (isDark ? "bg-[#0b1322] border-cyan-500/40 shadow-md ring-1 ring-cyan-500/20" : "bg-cyan-50/40 border-cyan-300 shadow-sm")
              )}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="pt-1">
                  <button 
                    onClick={() => toggleSelect(msg.id)} 
                    className={cn(
                      "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                      selectedIds.includes(msg.id)
                        ? "bg-cyan-500 border-cyan-500 text-slate-950"
                        : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                    )}
                  >
                    {selectedIds.includes(msg.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                  </button>
                </div>
                <div className="flex-1 space-y-4 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3 mb-1">
                        {!msg.isRead && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mt-2 shrink-0" />}
                        <h3 className={cn("text-lg sm:text-xl font-bold break-words", isDark ? "text-white" : "text-slate-900")}>{msg.subject || 'No Subject'}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className={cn("font-medium truncate max-w-full", isDark ? "text-cyan-400" : "text-cyan-700")}>{msg.name}</span>
                        <span className="text-zinc-600 hidden sm:inline">•</span>
                        <span className={cn("break-all", isDark ? "text-zinc-400" : "text-slate-500")}>{msg.email}</span>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-zinc-500 whitespace-nowrap sm:text-right">
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {renderMessageContent(msg.content)}
                </div>

                <div className="flex flex-row md:flex-col items-center justify-end gap-2 sm:gap-3 shrink-0 pt-2 w-full md:w-auto mt-4 md:mt-0">
                  {!msg.isRead && (
                    <button 
                      onClick={() => handleMarkAsRead(msg.id)}
                      className={cn("flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 font-medium transition-colors border border-cyan-500/20 text-xs", isDark ? "text-cyan-400" : "text-cyan-700")}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Read</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setDeleteId(msg.id)}
                    className={cn("flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 font-medium transition-colors border border-red-500/20 text-xs", isDark ? "text-red-400" : "text-red-700")}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Message?"
        description="This message will be permanently deleted and cannot be recovered."
        confirmText="Delete"
        isLoading={deleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Messages?"
        description={`Are you sure you want to delete ${selectedIds.length} selected messages? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingAll}
        variant="danger"
      />
    </div>
  );
}
