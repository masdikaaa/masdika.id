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
  if (status === 'OPEN') return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(16,185,129,0.2)]">OPEN</span>;
  if (status === 'ANSWERED') return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(6,182,212,0.2)]">ANSWERED</span>;
  if (status === 'CUSTOMER_REPLY') return <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(249,115,22,0.2)]">CUSTOMER REPLY</span>;
  if (status === 'MERGED') return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(168,85,247,0.2)]">MERGED</span>;
  return <span className={cn("bg-zinc-500/20 border border-zinc-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(113,113,122,0.2)]", isDark ? "text-zinc-300" : "text-slate-600")}>CLOSED</span>;
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
      <div className={cn("bg-[#0a1f33]/60 backdrop-blur-sm border p-5 md:p-6 rounded-3xl shadow-2xl relative overflow-hidden group", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        <div className={cn("absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover: transition-colors duration-700", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")} />
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-start md:items-center gap-4">
            <Link href="/admin/tickets" className={cn("p-2.5 hover:bg-white/10 border rounded-xl transition-all hover:-translate-x-1 shrink-0", isDark ? "border-white/10" : "border-slate-200")}>
              <ArrowLeft className={cn("w-5 h-5", isDark ? "text-zinc-300" : "text-slate-600")} />
            </Link>
            <div className="min-w-0">
              <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                <span className="break-words">#{ticket.ticketId} - {ticket.subject}</span>
                <StatusBadge status={ticket.status} />
              </h1>
              <div className={cn("text-sm mt-2 flex flex-wrap items-center gap-x-3 gap-y-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span className={cn("flex items-center gap-1.5 bg-[#011627] px-2.5 py-1 rounded-lg border text-xs font-medium shadow-inner", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-600")}>
                  User: <Link href={`/admin/customers/${ticket.userId}`} className={cn("hover:underline", isDark ? "text-cyan-400" : "text-cyan-700")}>{ticket.user.name}</Link>
                </span>
                {ticket.service && (
                  <span className={cn("flex items-center gap-1.5 bg-[#011627] px-2.5 py-1 rounded-lg border text-xs font-medium shadow-inner", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-600")}>
                    Service: <span className={cn("", isDark ? "text-cyan-400" : "text-cyan-700")}>{ticket.service.replace('_', ' ')}</span>
                  </span>
                )}
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-widest ${
                  ticket.priority === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                  ticket.priority === 'HIGH' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 
                  'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                }`}>
                  Priority: {ticket.priority}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0">
            {!isClosed && (
              <>
                <button
                  onClick={() => setShowMergeModal(true)}
                  className={cn("w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/30 shadow-sm", isDark ? "text-purple-400" : "text-purple-700")}
                >
                  <GitMerge className="w-4 h-4 shrink-0" /> Merge
                </button>
                <button
                  onClick={() => handleAction('close')}
                  disabled={isSubmitting}
                  className={cn("w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-500/20 hover:border-zinc-500/30 shadow-sm", isDark ? "text-zinc-300" : "text-slate-600")}
                >
                  <Lock className="w-4 h-4 shrink-0" /> Close
                </button>
              </>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className={cn("w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 shadow-sm", isDark ? "text-red-400" : "text-red-700")}
            >
              <Trash2 className="w-4 h-4 shrink-0" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="space-y-6 md:space-y-8 mt-8">
        {ticket.status === 'MERGED' && ticket.mergedInto && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("border p-5 rounded-2xl flex items-center gap-4 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.1)]", isDark ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-200")}>
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className={cn("w-5 h-5", isDark ? "text-purple-400" : "text-purple-700")} />
            </div>
            <p className="text-sm">This ticket has been merged into <Link href={`/admin/tickets/${ticket.mergedInto.ticketId.toLowerCase()}`} className={cn("font-bold hover:underline", isDark ? "text-purple-400" : "text-purple-700")}>#{ticket.mergedInto.ticketId}</Link>. All further communication will happen there.</p>
          </motion.div>
        )}

        {ticket.messages.map((msg: any, idx: number) => {
          const isSystem = msg.isSystem;
          const isAdmin = msg.user.role === 'ADMIN';

          if (isSystem) {
            return (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={msg.id} className="flex justify-center my-6">
                <span className={cn("bg-white/5 border text-xs px-5 py-2 rounded-full font-medium shadow-sm flex items-center gap-2", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}>
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
              className={`flex gap-3 md:gap-4 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 ${isAdmin ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-indigo-500/30'}`}>
                <img referrerPolicy="no-referrer" 
                  src={msg.user?.image || `/api/avatar?email=${encodeURIComponent(msg.user?.email || 'admin@masdika.id')}&name=${encodeURIComponent(msg.user?.name || 'User')}`} 
                  alt={msg.user?.name} 
                  className="w-full h-full object-cover" 
                loading="lazy" decoding="async" />
              </div>
              <div className={`max-w-[85%] md:max-w-[75%] flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  {isAdmin && <span className="bg-cyan-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">Staff</span>}
                  <span className="font-bold text-sm text-zinc-200">{msg.user.name}</span>
                  <span className="text-[11px] text-zinc-500 font-medium">{new Date(msg.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                </div>
                
                <div className={`p-4 md:p-5 rounded-3xl shadow-2xl relative group ${
                  isAdmin 
                    ? 'bg-gradient-to-br from-cyan-600 to-cyan-600 text-white rounded-tr-sm border border-cyan-400/20 text-left'
                    : 'bg-[#1e293b]/80 backdrop-blur-md border border-white/5 text-zinc-200 rounded-tl-sm text-left' 
                }`}>
                  {msg.message && renderMessageWithLinks(msg.message)}
                  
                  {msg.attachments?.length > 0 && (
                    <div className={`mt-4 pt-4 border-t ${isAdmin ? isDark ? "border-white/20" : "border-slate-300" : isDark ? "border-white/10" : "border-slate-200"} space-y-3`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'text-cyan-200' : 'text-zinc-500'}`}>Attachments</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((att: any) => {
                          const isImage = att.mimeType.startsWith('image/');
                          return isImage ? (
                              <button 
                                key={att.id}
                                type="button"
                                onClick={(e) => { e.preventDefault(); setLightboxImage(`/api/tickets/attachments/${att.filename}`); setZoomLevel(1); }}
                                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                  isAdmin 
                                    ? 'bg-black/20 hover:bg-black/30 border border-white/10'
                                    : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10' 
                                } hover:-translate-y-0.5 shadow-sm text-left`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAdmin ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                                <span className="truncate max-w-[120px] md:max-w-[200px]">{att.originalName}</span>
                              </button>
                            ) : (
                              <a 
                                key={att.id} 
                                href={`/api/tickets/attachments/${att.filename}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                  isAdmin 
                                    ? 'bg-black/20 hover:bg-black/30 border border-white/10'
                                    : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10' 
                                } hover:-translate-y-0.5 shadow-sm`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAdmin ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <span className="truncate max-w-[120px] md:max-w-[200px]">{att.originalName}</span>
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
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 bg-gradient-to-t from-[#011627] via-[#011627]/90 to-transparent pt-12 pb-4 md:pb-6 px-4 md:px-6 pointer-events-none">
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleAction('reply'); }} 
              className={`w-full relative bg-[#0a1f33]/90 backdrop-blur-sm border rounded-3xl transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.5)] ${
                isDragging ? 'border-cyan-500 ring-4 ring-cyan-500/20' : 'border-white/10 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/10'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-cyan-900/60 rounded-3xl flex items-center justify-center backdrop-blur-sm border-2 border-dashed border-cyan-400">
                  <p className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}><Paperclip className="w-6 h-6" /> Drop files to attach here</p>
                </div>
              )}
              
              <div className="flex flex-col relative quill-dark-theme pb-2">
                <style>{`
                  .quill-dark-theme .ql-toolbar {
                    border: none;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.02);
                    border-top-left-radius: 1.5rem;
                    border-top-right-radius: 1.5rem;
                    padding: 8px 16px;
                  }
                  .quill-dark-theme .ql-container {
                    border: none;
                    font-size: 15px;
                    color: white;
                    min-height: 80px;
                    max-height: 200px;
                    overflow-y: auto;
                  }
                  .quill-dark-theme .ql-editor {
                    padding: 16px 24px;
                  }
                  .quill-dark-theme .ql-editor.ql-blank::before {
                    color: #71717a; /* zinc-500 */
                    font-style: normal;
                    left: 24px;
                    right: 24px;
                  }
                  .quill-dark-theme .ql-stroke {
                    stroke: #a1a1aa; /* zinc-400 */
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
                    color: #22d3ee;
                    text-decoration: none;
                    font-weight: 500;
                  }
                  .quill-message-content a:hover {
                    text-decoration: underline;
                  }
                  .quill-message-content pre, .quill-message-content .ql-syntax {
                    background: #0f172a;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 0.75rem;
                    padding: 2.25rem 1.25rem 1.25rem 1.25rem;
                    margin: 1rem 0;
                    position: relative;
                    overflow-x: auto;
                    font-family: monospace;
                    font-size: 13px;
                    color: #e2e8f0;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
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
                    background: #ef4444; /* red */
                    box-shadow: 16px 0 0 #f59e0b, 32px 0 0 #10b981; /* yellow, green */
                  }
                  .quill-message-content code:not(pre code):not(.ql-syntax) {
                    background: rgba(255,255,255,0.1);
                    padding: 0.1rem 0.3rem;
                    border-radius: 0.25rem;
                    font-size: 0.9em;
                    font-family: monospace;
                    color: #bae6fd;
                  }
                  .quill-message-content blockquote {
                    border-left: 3px solid #06b6d4;
                    padding-left: 1rem;
                    color: rgba(255,255,255,0.7);
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
                  bounds=".quill-dark-theme"
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
                  <div className="px-6 pb-2 flex flex-wrap gap-2">
                    {attachments.map((file, i) => (
                      <div key={i} className={cn("border px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-cyan-300 font-medium", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className={cn("hover:text-cyan-300 ml-1 hover:bg-cyan-500/20 rounded p-0.5 transition-colors", isDark ? "text-cyan-500" : "text-cyan-700")}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="px-3 pb-3 pt-1 flex justify-between items-center bg-white/[0.01] rounded-b-3xl mt-1">
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
                    className={cn("hover:text-cyan-400 hover:bg-cyan-500/10 p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold ml-2", isDark ? "text-zinc-400" : "text-slate-500")}
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="hidden sm:inline">Attach Files</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || ((!message || message === '<p><br></p>') && attachments.length === 0)}
                    className={cn("transition-all shadow-md hover:shadow-lg hover:from-cyan-400 hover:to-cyan-400 disabled:opacity-50 disabled:from-zinc-700 disabled:to-zinc-800 px-7 py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2 shrink-0 group mr-2", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/20" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20")}
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
          <div className={cn("bg-[#0f172a] border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl", isDark ? "border-white/10" : "border-slate-200")}>
            <div className={cn("p-6 border-b flex justify-between items-center", isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-white")}>
              <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-white" : "text-slate-900")}>
                <GitMerge className={cn("w-5 h-5", isDark ? "text-purple-400" : "text-purple-700")} />
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
                  className={cn("w-full border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30 transition-all shadow-inner", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                  placeholder="e.g. TKT-123456"
                />
              </div>

              <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  disabled={isMerging}
                  className={cn("w-full sm:w-auto px-5 py-3 text-sm font-semibold hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50", isDark ? "text-zinc-300" : "text-slate-600")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMerging || !mergeTarget}
                  className={cn("w-full sm:w-auto px-6 py-3 text-sm font-bold bg-purple-500 hover:bg-purple-600 rounded-xl transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50 flex justify-center items-center", isDark ? "text-white" : "text-slate-900")}
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
          <div className="bg-[#0f172a] border border-red-500/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-red-500/10 flex justify-between items-center bg-red-500/[0.04]">
              <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-white" : "text-slate-900")}>
                <Trash2 className={cn("w-5 h-5", isDark ? "text-red-400" : "text-red-700")} />
                Delete Ticket
              </h3>
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className={cn("transition-colors p-2 rounded-xl", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className={cn("text-sm leading-relaxed", isDark ? "text-zinc-300" : "text-slate-600")}>
                Are you sure you want to permanently delete ticket <span className={cn("font-bold px-2 py-0.5 rounded", isDark ? "text-white" : "text-slate-900")}>#{ticket.ticketId}</span>?
                This will also remove all <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>attached files</span> from storage.
              </p>
              <div className={cn("p-4 border rounded-xl text-sm text-red-300 flex items-start gap-3", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
                <span className="text-xl">⚠️</span>
                <div>
                  <strong>Irreversible Action</strong>
                  <p className="opacity-80 text-xs mt-1">This cannot be undone. Data will be lost forever.</p>
                </div>
              </div>
              <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className={cn("w-full sm:w-auto px-5 py-3 text-sm font-semibold hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50", isDark ? "text-zinc-300" : "text-slate-600")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={cn("w-full sm:w-auto px-6 py-3 text-sm font-bold bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2", isDark ? "text-white" : "text-slate-900")}
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
                <button onClick={() => setZoomLevel(z => Math.min(z + 0.5, 3))} className={cn("p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors", isDark ? "text-white" : "text-slate-900")}>
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button onClick={() => setZoomLevel(z => Math.max(z - 0.5, 0.5))} className={cn("p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors", isDark ? "text-white" : "text-slate-900")}>
                  <ZoomOut className="w-5 h-5" />
                </button>
                <a href={lightboxImage} target="_blank" rel="noopener noreferrer" className={cn("p-2.5 bg-cyan-500/20 hover:bg-cyan-500/40 rounded-xl transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Download className="w-5 h-5" />
                </a>
              </div>
              <button onClick={() => setLightboxImage(null)} className={cn("p-2.5 bg-red-500/20 hover:bg-red-500/40 rounded-xl transition-colors", isDark ? "text-red-400" : "text-red-700")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto p-4 custom-scrollbar" onClick={() => setLightboxImage(null)}>
              <motion.img 
                src={lightboxImage} 
                alt="Attachment" 
                style={{ scale: zoomLevel }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing origin-center"
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
