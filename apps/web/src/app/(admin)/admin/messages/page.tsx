"use client";
import { useUrlNumber } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Mail, MailOpen, Trash2, CheckCircle2, MessageSquareQuote, Check, CheckCircle , RefreshCw } from "lucide-react";
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

  // Pagination
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(messages.length / itemsPerPage);
  const paginatedMessages = messages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            <div className="p-5 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-l-4 border-cyan-500 rounded-r-2xl rounded-l-sm shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <MessageSquareQuote className="w-16 h-16" />
              </div>
              <p className={cn("leading-relaxed italic relative z-10 text-base", isDark ? "text-zinc-200" : "text-slate-700")}>"{commentText}"</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
               <span className={cn("bg-black/30 px-2 py-1 rounded font-mono border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>IP: {ip}</span>
            </div>
          </div>
        );
      }
    }
    return (
      <div className={cn("p-4 sm:p-5 rounded-2xl border leading-relaxed text-sm whitespace-pre-wrap", isDark ? "bg-black/40 border-white/5 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-600")}>
        {content}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
    </div>
  );

  return (
    <div className="space-y-8 relative z-10 w-full">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Messages</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage inquiries and messages from your contact form.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {messages.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all border", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedIds.length === messages.length ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                {selectedIds.length === messages.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
              </div>
              {selectedIds.length === messages.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          {messages.some(m => !m.isRead) && (
            <button 
              onClick={handleMarkAllAsRead}
              className={cn("flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 font-bold rounded-xl transition-all border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}
            >
              <CheckCircle2 className="w-5 h-5" />
              Mark All Read
            </button>
          )}
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 font-bold rounded-xl transition-all border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}
            >
              <Trash2 className="w-5 h-5" />
              Delete ({selectedIds.length})
            </button>
          )}
      </div>
      </div>

      <div className="grid gap-6">
        {messages.length === 0 ? (
          <div className={cn("glass-card rounded-[32px] p-16 text-center border shadow-2xl relative overflow-hidden group", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border group-hover:scale-110 transition-transform duration-500", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
              <MailOpen className={cn("w-12 h-12 opacity-80", isDark ? "text-cyan-400" : "text-cyan-700")} />
            </div>
            <h2 className={cn("text-2xl font-extrabold mb-3", isDark ? "text-white" : "text-[#0F3B4A]")}>No Messages Yet</h2>
            <p className={cn("font-medium max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>When someone contacts you, their message will appear here.</p>
          </div>
        ) : (
          paginatedMessages.map((msg, index) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn("glass-card rounded-3xl p-5 sm:p-8 border transition-all", msg.isRead ? (isDark ? "bg-white/[0.01] border-white/5" : "bg-white border-slate-200 shadow-sm") : (isDark ? "bg-cyan-500/[0.03] border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]" : "bg-cyan-50 border-cyan-200 shadow-sm"))}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="pt-1">
                  <button onClick={() => toggleSelect(msg.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(msg.id) ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"}`}>
                    {selectedIds.includes(msg.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                </div>
                <div className="flex-1 space-y-4 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3 mb-1">
                        {!msg.isRead && <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse mt-2 shrink-0" />}
                        <h3 className={cn("text-lg sm:text-xl font-bold drop-shadow-sm break-words", isDark ? "text-white" : "text-slate-900")}>{msg.subject || 'No Subject'}</h3>
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
                      className={cn("flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 font-medium transition-colors border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="md:hidden">Mark Read</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setDeleteId(msg.id)}
                    className={cn("flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 font-medium transition-colors border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="md:hidden">Delete</span>
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
