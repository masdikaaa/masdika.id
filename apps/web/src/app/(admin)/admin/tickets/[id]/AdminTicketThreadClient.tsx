'use client';
import { cn } from "@/lib/utils";

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Send, Paperclip, X, Image as ImageIcon, FileText, User, ShieldAlert, GitMerge, Lock, Trash2, CheckCircle2, Bold, Italic, Link as LinkIcon, Code, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useTheme } from "@/components/ThemeProvider";
import { motion, AnimatePresence } from 'framer-motion';
import { mutate as globalMutate } from 'swr';
import DOMPurify from 'isomorphic-dompurify';
import 'react-quill-new/dist/quill.snow.css';
import { toast } from 'sonner';
import { AdminLoader } from '@/components/admin/AdminLoader';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

function linkifyHtml(html: string) {
  const regex = /(<[^>]+>)|(\bhttps?:\/\/[a-zA-Z0-9\-\.\/\?\:\@\&\=\+\~\_\%\#]+)/gi;
  let inAnchor = false;
  
  return html.replace(regex, (match, tag, url) => {
    if (tag) {
      if (/^<a\b/i.test(tag)) inAnchor = true;
      else if (/^<\/a>/i.test(tag)) inAnchor = false;
      return tag;
    }
    if (url) {
      if (inAnchor) return url;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-4 decoration-fuchsia-400/30 hover:decoration-fuchsia-300/50 transition-all font-medium">${url}</a>`;
    }
    return match;
  });
}

const renderMessageWithLinks = (text: string) => {
  if (!text) return null;
  const linkifiedText = linkifyHtml(text);
  const sanitizedHtml = DOMPurify.sanitize(linkifiedText, { ADD_ATTR: ['target'] });
  return (
    <div 
      className="quill-message-content text-sm md:text-base leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  if (status === 'OPEN') return <span className={cn("border px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase", isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>OPEN</span>;
  if (status === 'ANSWERED') return <span className={cn("border px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase", isDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>ANSWERED</span>;
  if (status === 'CUSTOMER_REPLY') return <span className={cn("border px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase", isDark ? "bg-orange-500/20 text-orange-300 border-orange-500/30" : "bg-orange-50 text-orange-700 border-orange-200")}>CUSTOMER REPLY</span>;
  if (status === 'MERGED') return <span className={cn("border px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase", isDark ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-purple-50 text-purple-700 border-purple-200")}>MERGED</span>;
  return <span className={cn("border px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase", isDark ? "bg-zinc-500/20 border-zinc-500/30 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700")}>CLOSED</span>;
}

export default function AdminTicketThreadClient({ ticketId }: { ticketId: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { data: ticket, error, isLoading, mutate } = useSWR(`/api/tickets/${ticketId}`, fetcher, {
    refreshInterval: 2000,
  });

  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mergeTarget, setMergeTarget] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => {
        if (prev.length + newFiles.length > 5) {
          toast.error("You can only attach a maximum of 5 files.");
          return [...prev, ...newFiles].slice(0, 5);
        }
        return [...prev, ...newFiles];
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      const totalSize = [...attachments, ...newFiles].reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 10 * 1024 * 1024) {
        alert('Total attachments size exceeds 10MB limit');
        return;
      }
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleAction = async (action: 'reply' | 'close') => {
    if (action === 'reply' && !message.trim() && attachments.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (action === 'reply') {
        formData.append('message', message);
      }
      formData.append('action', action);
      attachments.forEach(file => formData.append('attachments', file));

      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to update ticket');

      setMessage('');
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Optimitic UI update
      mutate();
      
      // Trigger notification refresh
      globalMutate(
        (key: any) => typeof key === 'string' && key.includes('/api/user/notifications'),
        undefined,
        { revalidate: true }
      );
      globalMutate(
        (key: any) => typeof key === 'string' && key.includes('/api/admin/notifications'),
        undefined,
        { revalidate: true }
      );

    } catch (err) {
      console.error(err);
      alert('Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeTarget) return;
    
    setIsMerging(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTicketIdStr: mergeTarget })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Merge failed');
      }
      
      setShowMergeModal(false);
      mutate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsMerging(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      router.push('/admin/tickets');
    } catch (err: any) {
      alert(err.message);
      setIsDeleting(false);
    }
  };

  if (isLoading) return <AdminLoader />;
  if (error || !ticket) return <div className={cn("p-8 text-center font-semibold bg-red-500/10 rounded-xl border border-red-500/20 max-w-md mx-auto mt-10", isDark ? "text-red-400" : "text-red-700")}>Failed to load ticket details.</div>;

  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'MERGED';

  return (
    <div className="space-y-6 pb-40 md:pb-48">
      {/* Header Card */}
      <div className={cn("backdrop-blur-sm border p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-colors duration-700", isDark ? "bg-cyan-500/10" : "bg-cyan-500/5")} />
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <Link href="/admin/tickets" className={cn("p-2 sm:p-2.5 border rounded-xl transition-all hover:-translate-x-1 shrink-0 mt-0.5", isDark ? "bg-slate-800/60 border-slate-700/80 text-zinc-300 hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200")}>
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className={cn("text-lg sm:text-xl md:text-2xl font-black tracking-tight break-words", isDark ? "text-white" : "text-slate-900")}>
                  #{ticket.ticketId} - {ticket.subject}
                </h1>
                <StatusBadge status={ticket.status} />
              </div>
              <div className={cn("text-xs sm:text-sm flex flex-wrap items-center gap-1.5 sm:gap-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", isDark ? "bg-[#060b14] border-slate-800 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                  User: <Link href={`/admin/customers/${ticket.userId}`} className={cn("hover:underline font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{ticket.user.name}</Link>
                </span>
                {ticket.service && (
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", isDark ? "bg-[#060b14] border-slate-800 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                    Service: <span className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{ticket.service.replace('_', ' ')}</span>
                  </span>
                )}
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider",
                  ticket.priority === 'CRITICAL' ? (isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700') : 
                  ticket.priority === 'HIGH' ? (isDark ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-700') : 
                  (isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')
                )}>
                  Priority: {ticket.priority}
                </span>
              </div>
            </div>
          </div>
          
          <div className={cn("flex flex-wrap items-center gap-2 w-full xl:w-auto pt-3 xl:pt-0 border-t xl:border-t-0", isDark ? "border-white/5" : "border-slate-100")}>
            {!isClosed && (
              <>
                <button
                  onClick={() => setShowMergeModal(true)}
                  className={cn("flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 border whitespace-nowrap", isDark ? "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 hover:border-purple-500/30 text-purple-400" : "bg-purple-50 hover:bg-purple-100 border-purple-200 hover:border-purple-300 text-purple-700")}
                >
                  <GitMerge className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Merge
                </button>
                <button
                  onClick={() => handleAction('close')}
                  disabled={isSubmitting}
                  className={cn("flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 border whitespace-nowrap", isDark ? "bg-zinc-500/10 hover:bg-zinc-500/20 border-zinc-500/20 hover:border-zinc-500/30 text-zinc-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700")}
                >
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Close
                </button>
              </>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className={cn("flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 border whitespace-nowrap", isDark ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/30 text-red-400" : "bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 text-red-700")}
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="space-y-5 md:space-y-6 mt-6 sm:mt-8">
        {ticket.status === 'MERGED' && ticket.mergedInto && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("border p-4 sm:p-5 rounded-2xl flex items-center gap-3 sm:gap-4 text-purple-200", isDark ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-200")}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className={cn("w-5 h-5", isDark ? "text-purple-400" : "text-purple-700")} />
            </div>
            <p className="text-xs sm:text-sm">This ticket has been merged into <Link href={`/admin/tickets/${ticket.mergedInto.ticketId.toLowerCase()}`} className={cn("font-bold hover:underline", isDark ? "text-purple-400" : "text-purple-700")}>#{ticket.mergedInto.ticketId}</Link>. All further communication will happen there.</p>
          </motion.div>
        )}

        {ticket.messages.map((msg: any, idx: number) => {
          const isSystem = msg.isSystem;
          const isAdmin = msg.user.role === 'ADMIN';

          if (isSystem) {
            return (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={msg.id} className="flex justify-center my-4 sm:my-6">
                <span className={cn("bg-white/5 border text-xs px-4 py-1.5 sm:px-5 sm:py-2 rounded-full font-medium flex items-center gap-2", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}>
                  <CheckCircle2 className={cn("w-3.5 h-3.5", isDark ? "text-cyan-500" : "text-cyan-700")} /> {msg.message}
                </span>
              </motion.div>
            );
          }

          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: Math.min(idx * 0.05, 0.5) }}
              key={msg.id} 
              className={`flex gap-2.5 sm:gap-3 md:gap-4 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2",
                isAdmin 
                  ? "border-cyan-500/50" 
                  : isDark ? "border-slate-700 bg-slate-800" : "border-slate-300 bg-slate-100"
              )}>
                <img referrerPolicy="no-referrer" 
                  src={msg.user?.image || `/api/avatar?email=${encodeURIComponent(msg.user?.email || 'admin@masdika.id')}&name=${encodeURIComponent(msg.user?.name || 'User')}`} 
                  alt={msg.user?.name} 
                  className="w-full h-full object-cover" 
                loading="lazy" decoding="async" />
              </div>
              <div className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] flex flex-col min-w-0 ${isAdmin ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-1.5 sm:gap-2 mb-1 px-1 flex-wrap ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  {isAdmin && <span className="bg-cyan-500 text-slate-900 text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">Staff</span>}
                  <span className={cn("font-semibold text-xs sm:text-sm", isDark ? "text-zinc-200" : "text-slate-900")}>{msg.user.name}</span>
                  <span className={cn("text-[10px] sm:text-[11px] font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>{new Date(msg.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                </div>
                
                <div className={cn(
                  "px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl relative group max-w-full min-w-0 text-left",
                  isAdmin 
                    ? "bg-cyan-600 text-white rounded-tr-sm border border-cyan-500/30"
                    : isDark 
                      ? "bg-[#0b1322] border border-slate-800 text-zinc-200 rounded-tl-sm" 
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                )}>
                  <div className="text-sm leading-relaxed break-words quill-message-content">
                    {msg.message && renderMessageWithLinks(msg.message)}
                  </div>
                  
                  {msg.attachments?.length > 0 && (
                    <div className={cn("mt-3 pt-3 sm:mt-4 sm:pt-4 border-t space-y-2", isAdmin ? "border-white/20" : isDark ? "border-white/10" : "border-slate-200")}>
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider", isAdmin ? "text-cyan-100" : isDark ? "text-zinc-400" : "text-slate-500")}>
                        Attachments ({msg.attachments.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0">
                        {msg.attachments.map((att: any) => {
                          const isImage = att.mimeType.startsWith('image/');
                          const attBtnClass = cn(
                            "flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-semibold transition-all w-full min-w-0 text-left hover:-translate-y-0.5",
                            isAdmin
                              ? "bg-black/20 hover:bg-black/30 border border-white/15 text-white"
                              : isDark
                                ? "bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200"
                                : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                          );
                          const attIconClass = cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                            isAdmin
                              ? "bg-white/20 border-white/20 text-white"
                              : isDark
                                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                                : "bg-cyan-50 border-cyan-200 text-cyan-700"
                          );

                          return isImage ? (
                            <button 
                              key={att.id}
                              type="button"
                              onClick={(e) => { e.preventDefault(); setLightboxImage(`/api/tickets/attachments/${att.filename}`); setZoomLevel(1); }}
                              className={attBtnClass}
                            >
                              <div className={attIconClass}>
                                <ImageIcon className="w-4 h-4" />
                              </div>
                              <span className="truncate min-w-0 flex-1">{att.originalName}</span>
                            </button>
                          ) : (
                            <a 
                              key={att.id} 
                              href={`/api/tickets/attachments/${att.filename}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={attBtnClass}
                            >
                              <div className={attIconClass}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="truncate min-w-0 flex-1">{att.originalName}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Floating Sticky Input Area */}
      {!isClosed && (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 lg:left-64 z-40 pt-8 sm:pt-12 pb-3 sm:pb-4 md:pb-6 px-3 sm:px-4 md:px-6 pointer-events-none",
          isDark 
            ? "bg-gradient-to-t from-[#000000] via-[#000000]/90 to-transparent" 
            : "bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent"
        )}>
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleAction('reply'); }} 
              className={cn(
                "w-full relative border rounded-2xl sm:rounded-3xl transition-all duration-300",
                isDark 
                  ? "bg-[#0b1322]/95 backdrop-blur-md border-slate-800 shadow-xl" 
                  : "bg-white border-slate-200",
                isDragging 
                  ? "border-cyan-500 ring-4 ring-cyan-500/20" 
                  : "focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/10"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-cyan-900/60 rounded-2xl sm:rounded-3xl flex items-center justify-center backdrop-blur-sm border-2 border-dashed border-cyan-400">
                  <p className={cn("font-bold flex items-center gap-2 text-base sm:text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}><Paperclip className="w-5 h-5 sm:w-6 sm:h-6" /> Drop files to attach here</p>
                </div>
              )}
              
              <div className={`flex flex-col relative pb-2 ${isDark ? 'quill-dark-theme' : 'quill-light-theme'}`}>
                <style>{`
                  .quill-dark-theme .ql-toolbar {
                    border: none;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.02);
                    border-top-left-radius: 1rem;
                    border-top-right-radius: 1rem;
                    padding: 6px 12px;
                  }
                  .quill-dark-theme .ql-container {
                    border: none;
                    font-size: 14px;
                    color: white;
                    min-height: 70px;
                    max-height: 180px;
                    overflow-y: auto;
                  }
                  .quill-dark-theme .ql-editor {
                    padding: 12px 16px;
                  }
                  .quill-dark-theme .ql-editor.ql-blank::before {
                    color: #71717a;
                    font-style: normal;
                    left: 16px;
                    right: 16px;
                  }
                  .quill-dark-theme .ql-stroke {
                    stroke: #a1a1aa;
                  }
                  .quill-dark-theme .ql-fill {
                    fill: #a1a1aa;
                  }
                  .quill-dark-theme .ql-picker-label {
                    color: #a1a1aa;
                  }
                  .quill-dark-theme button:hover .ql-stroke {
                    stroke: white;
                  }
                  .quill-dark-theme button:hover .ql-fill {
                    fill: white;
                  }

                  .quill-light-theme .ql-toolbar {
                    border: none;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    border-top-left-radius: 1rem;
                    border-top-right-radius: 1rem;
                    padding: 6px 12px;
                  }
                  .quill-light-theme .ql-container {
                    border: none;
                    font-size: 14px;
                    color: #020617;
                    min-height: 70px;
                    max-height: 180px;
                    overflow-y: auto;
                  }
                  .quill-light-theme .ql-editor {
                    padding: 12px 16px;
                  }
                  .quill-light-theme .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                    left: 16px;
                    right: 16px;
                  }
                  .quill-light-theme .ql-stroke {
                    stroke: #475569;
                  }
                  .quill-light-theme .ql-fill {
                    fill: #475569;
                  }
                  .quill-light-theme .ql-picker-label {
                    color: #475569;
                  }
                  .quill-light-theme button:hover .ql-stroke {
                    stroke: #020617;
                  }
                  .quill-light-theme button:hover .ql-fill {
                    fill: #020617;
                  }
                  
                  /* Formatted Message Styles */
                  .quill-message-content {
                    color: inherit;
                  }
                  .quill-message-content p {
                    margin-bottom: 0.5em;
                  }
                  .quill-message-content p:last-child {
                    margin-bottom: 0;
                  }
                  .quill-message-content a {
                    color: #0891b2;
                    text-decoration: none;
                    font-weight: 600;
                  }
                  .quill-message-content a:hover {
                    text-decoration: underline;
                  }
                  .quill-message-content pre, .quill-message-content .ql-syntax {
                    background: ${isDark ? '#060b14' : '#f8fafc'};
                    border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                    border-radius: 0.75rem;
                    padding: 2.25rem 1.25rem 1.25rem 1.25rem;
                    margin: 1rem 0;
                    position: relative;
                    overflow-x: auto;
                    font-family: monospace;
                    font-size: 13px;
                    color: ${isDark ? '#e2e8f0' : '#020617'};
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                  }
                  /* macOS Window Dots for Code Blocks */
                  .quill-message-content pre::before, .quill-message-content .ql-syntax::before {
                    content: '';
                    position: absolute;
                    top: 0.8rem;
                    left: 1rem;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #ef4444;
                    box-shadow: 16px 0 0 #f59e0b, 32px 0 0 #10b981;
                  }
                  .quill-message-content code:not(pre code):not(.ql-syntax) {
                    background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
                    padding: 0.1rem 0.3rem;
                    border-radius: 0.25rem;
                    font-size: 0.9em;
                    font-family: monospace;
                    color: ${isDark ? '#bae6fd' : '#0369a1'};
                  }
                  .quill-message-content blockquote {
                    border-left: 3px solid #06b6d4;
                    padding-left: 1rem;
                    color: ${isDark ? 'rgba(255,255,255,0.7)' : '#475569'};
                    margin: 1rem 0;
                    font-style: italic;
                  }
                  .quill-message-content ul, .quill-message-content ol {
                    padding-left: 1.5rem;
                    margin-bottom: 0.5rem;
                  }
                  .quill-message-content ul { list-style-type: disc; }
                  .quill-message-content ol { list-style-type: decimal; }
                `}</style>
                <ReactQuill 
                  theme="snow"
                  bounds={isDark ? ".quill-dark-theme" : ".quill-light-theme"}
                  value={message}
                  onChange={setMessage}
                  placeholder="Type your admin reply here..."
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'strike'],
                      ['blockquote', 'code-block'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                />
                
                {attachments.length > 0 && (
                  <div className="px-4 sm:px-6 pb-2 flex flex-wrap gap-2">
                    {attachments.map((file, i) => (
                      <div key={i} className={cn("border px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className={cn("ml-1 rounded p-0.5 transition-colors", isDark ? "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20" : "text-cyan-600 hover:text-cyan-800 hover:bg-cyan-100")}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="px-3 pb-2.5 pt-1 flex justify-between items-center rounded-b-2xl sm:rounded-b-3xl mt-1">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn("p-2 sm:p-2.5 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 text-xs font-semibold ml-1 sm:ml-2", isDark ? "text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-slate-600 hover:text-cyan-700 hover:bg-cyan-50")}
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="hidden sm:inline">Attach Files</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || ((!message || message === '<p><br></p>') && attachments.length === 0)}
                    className="transition-all px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 group mr-1 sm:mr-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
                  >
                    <span className="hidden sm:inline">{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                    <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("border rounded-3xl w-full max-w-md overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800 text-white shadow-2xl" : "bg-white border-slate-200 text-slate-900 shadow-2xl")}>
            <div className={cn("p-6 border-b flex justify-between items-center", isDark ? "border-slate-800" : "border-slate-200")}>
              <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-white" : "text-slate-900")}>
                <GitMerge className={cn("w-5 h-5", isDark ? "text-purple-400" : "text-purple-600")} />
                Merge Ticket
              </h3>
              <button onClick={() => setShowMergeModal(false)} className={cn("transition-colors p-2 rounded-xl", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleMerge} className="p-6 space-y-5">
              <p className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>
                This will move all messages from the current ticket into the target ticket and mark this ticket as <span className={cn("font-bold", isDark ? "text-purple-400" : "text-purple-700")}>MERGED</span>.
              </p>
              <div>
                <label className={cn("text-xs font-bold uppercase tracking-wider mb-2 block", isDark ? "text-zinc-400" : "text-slate-500")}>Target Ticket ID</label>
                <input
                  required
                  type="text"
                  value={mergeTarget}
                  onChange={e => setMergeTarget(e.target.value)}
                  className={cn("w-full border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-purple-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  placeholder="e.g. TKT-123456"
                />
              </div>

              <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  disabled={isMerging}
                  className={cn("w-full sm:w-auto px-5 py-3 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 border", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMerging || !mergeTarget}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center shadow-sm"
                >
                  {isMerging ? 'Merging...' : 'Merge Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("border rounded-3xl w-full max-w-md overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800 text-white shadow-2xl" : "bg-white border-slate-200 text-slate-900 shadow-2xl")}>
            <div className={cn("p-6 border-b flex justify-between items-center", isDark ? "border-slate-800" : "border-slate-200")}>
              <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-white" : "text-slate-900")}>
                <Trash2 className={cn("w-5 h-5", isDark ? "text-red-400" : "text-red-600")} />
                Delete Ticket
              </h3>
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className={cn("transition-colors p-2 rounded-xl", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className={cn("text-sm leading-relaxed", isDark ? "text-zinc-300" : "text-slate-600")}>
                Are you sure you want to permanently delete ticket <span className={cn("font-bold px-2 py-0.5 rounded", isDark ? "text-white bg-white/10" : "text-slate-900 bg-slate-100")}>#{ticket.ticketId}</span>?
                This will also remove all <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>attached files</span> from storage.
              </p>
              <div className={cn("p-4 border rounded-xl text-sm flex items-start gap-3", isDark ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-700")}>
                <span className="text-xl">⚠️</span>
                <div>
                  <strong>Irreversible Action</strong>
                  <p className="opacity-80 text-xs mt-1">This cannot be undone. Data will be lost forever.</p>
                </div>
              </div>
              <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className={cn("w-full sm:w-auto px-5 py-3 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 border", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col"
          >
            <div className="p-4 flex justify-between items-center bg-black/50">
              <div className="flex gap-2">
                <button onClick={() => setZoomLevel(z => Math.min(z + 0.5, 3))} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button onClick={() => setZoomLevel(z => Math.max(z - 0.5, 0.5))} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
                  <ZoomOut className="w-5 h-5" />
                </button>
                <a href={lightboxImage} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 rounded-xl transition-colors">
                  <Download className="w-5 h-5" />
                </a>
              </div>
              <button onClick={() => setLightboxImage(null)} className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto p-4 custom-scrollbar" onClick={() => setLightboxImage(null)}>
              <motion.img 
                src={lightboxImage} 
                alt="Attachment" 
                style={{ scale: zoomLevel }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="max-w-full max-h-[80vh] object-contain rounded-lg cursor-grab active:cursor-grabbing origin-center"
                onClick={(e) => e.stopPropagation()}
                drag
                dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
