'use client';

import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MessageSquare, ArrowLeft, Send, Paperclip, X, Image as ImageIcon, FileText, User, ShieldAlert, CheckCircle2, Bold, Italic, Link as LinkIcon, Code, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mutate as globalMutate } from 'swr';
import DOMPurify from 'isomorphic-dompurify';
import 'react-quill-new/dist/quill.snow.css';
import { useTheme } from "@/components/ThemeProvider";

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (status === 'OPEN') return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(16,185,129,0.2)]">OPEN</span>;
  if (status === 'ANSWERED') return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(6,182,212,0.2)]">ANSWERED</span>;
  if (status === 'CUSTOMER_REPLY') return <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(249,115,22,0.2)]">CUSTOMER REPLY</span>;
  if (status === 'MERGED') return <span className="bg-cyan-500/20 text-purple-300 border border-cyan-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(168,85,247,0.2)]">MERGED</span>;
  return <span className={cn("bg-zinc-500/20 border border-zinc-500/30 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(113,113,122,0.2)]", isDark ? "text-zinc-300" : "text-slate-500")}>CLOSED</span>;
}

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
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-400/30 hover:decoration-cyan-300/50 transition-all">${url}</a>`;
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

export default function TicketThreadClient({ ticketId }: { ticketId: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const router = useRouter();
  const { data: ticket, error, isLoading, mutate } = useSWR(`/api/tickets/${ticketId}`, fetcher, {
    refreshInterval: 2000, // Real-time polling every 2s
  });

  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => {
        if (prev.length + newFiles.length > 5) {
          alert("You can only attach a maximum of 5 files.");
          return [...prev, ...newFiles].slice(0, 5);
        }
        return [...prev, ...newFiles];
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('action', 'reply');
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: formData, // fetch automatically sets multipart/form-data with boundary
      });

      if (!res.ok) throw new Error('Failed to reply');

      setMessage('');
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
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
      alert('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin relative z-10" />
      </div>
    </div>
  );
  if (error || !ticket) return <div className="p-8 text-center text-red-400 font-semibold bg-red-500/10 rounded-xl border border-red-500/20 max-w-md mx-auto mt-10">Failed to load ticket details.</div>;

  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'MERGED';

  return (
    <div className="space-y-6 pb-40 md:pb-48">
      {/* Header Card */}
      <div className={cn("backdrop-blur-sm border p-5 md:p-6 rounded-3xl shadow-md relative overflow-hidden group", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-cyan-500/10 transition-colors duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start md:items-center gap-4">
            <Link href="/dashboard/tickets" className={cn("p-2.5 bg-white/5 hover:bg-white/10 border rounded-xl transition-all hover:-translate-x-1 shrink-0", isDark ? "border-white/10" : "border-slate-200")}>
              <ArrowLeft className={cn("w-5 h-5", isDark ? "text-zinc-300" : "text-slate-500")} />
            </Link>
            <div className="min-w-0">
              <h1 className={cn("text-xl md:text-2xl font-black flex flex-wrap items-center gap-3 leading-tight tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                <span className="break-words">#{ticket.ticketId} - {ticket.subject}</span>
                <StatusBadge status={ticket.status} />
              </h1>
              <div className={cn("text-sm mt-2 flex flex-wrap items-center gap-x-3 gap-y-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                {ticket.service && (
                  <span className={cn("flex items-center gap-1.5 bg-[#011627] px-2.5 py-1 rounded-lg border text-xs font-medium shadow-inner", isDark ? "border-white/5 text-zinc-300" : "border-slate-200 text-slate-500")}>
                    Service: <span className="text-cyan-400">{ticket.service.replace('_', ' ')}</span>
                  </span>
                )}
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-widest ${
                  ticket.priority === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                  ticket.priority === 'HIGH' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>
                  Priority: {ticket.priority}
                </span>
              </div>
            </div>
          </div>
          
          {ticket.status !== 'MERGED' && (
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`/api/tickets/${ticketId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: isClosed ? 'REOPEN' : 'CLOSE' })
                  });
                  if (res.ok) mutate();
                } catch (err) {
                  console.error(err);
                }
              }}
              className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 flex items-center justify-center gap-2 ${
                isClosed 
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-[#011627] shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]' 
                  : 'bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-red-400'
              }`}
            >
              {isClosed ? 'Reopen Ticket' : 'Close Ticket'}
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="space-y-6 md:space-y-8 mt-8">
        {ticket.status === 'MERGED' && ticket.mergedInto && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-cyan-500/10 border border-cyan-500/20 p-5 rounded-2xl flex items-center gap-4 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-sm">This ticket has been merged into <Link href={`/dashboard/tickets/${ticket.mergedInto.ticketId.toLowerCase()}`} className="text-cyan-400 font-bold hover:underline">#{ticket.mergedInto.ticketId}</Link>. All further communication will happen there.</p>
          </motion.div>
        )}

        {(ticket.messages ?? []).map((msg: any, idx: number) => {
          const isSystem = msg.isSystem;
          const isAdmin = msg.user.role === 'ADMIN';

          if (isSystem) {
            return (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={msg.id} className="flex justify-center my-6">
                <span className={cn("bg-white/5 border text-xs px-5 py-2 rounded-full font-medium shadow-sm flex items-center gap-2", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" /> {msg.message}
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
              className={`flex gap-3 md:gap-4 ${isAdmin ? 'flex-row' : 'flex-row-reverse'}`}
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 ${isAdmin ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-cyan-500/30'} bg-white/5`}>
                <img referrerPolicy="no-referrer" 
                  src={msg.user?.image || `/api/avatar?email=${encodeURIComponent(msg.user?.email || 'admin@masdika.id')}&name=${encodeURIComponent(msg.user?.name || 'User')}`} 
                  alt={msg.user?.name} 
                  className="w-full h-full object-cover" 
                loading="lazy" decoding="async" />
              </div>
              <div className={`max-w-[85%] md:max-w-[75%] flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  {isAdmin && <span className="bg-cyan-500 text-[#011627] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">Staff</span>}
                  <span className={cn("font-bold text-sm", isDark ? "text-zinc-200" : "text-slate-900")}>{msg.user.name}</span>
                  <span className={cn("text-[11px] font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>{new Date(msg.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                </div>
                
                <div className={`p-4 md:p-5 rounded-3xl shadow-md relative group ${
                  isAdmin 
                    ? 'bg-white/[0.02] backdrop-blur-md border border-white/5 text-zinc-200 rounded-tl-sm' 
                    : 'bg-cyan-600 text-white rounded-tr-sm border border-cyan-400/20'
                }`}>
                {msg.message && renderMessageWithLinks(msg.message)}
                  
                  {msg.attachments?.length > 0 && (
                    <div className={`mt-4 pt-4 border-t ${isAdmin ? 'border-white/10' : 'border-white/20'} space-y-3`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'text-zinc-500' : 'text-cyan-200'}`}>Attachments</p>
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
                                    ? 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10' 
                                    : 'bg-black/20 hover:bg-black/30 border border-white/10'
                                } hover:-translate-y-0.5 shadow-sm text-left`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAdmin ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/20 text-white'}`}>
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
                                    ? 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10' 
                                    : 'bg-black/20 hover:bg-black/30 border border-white/10'
                                } hover:-translate-y-0.5 shadow-sm`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAdmin ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/20 text-white'}`}>
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
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-gradient-to-t from-[#011627] via-[#011627]/90 to-transparent pt-12 pb-4 md:pb-6 px-4 md:px-6 pointer-events-none">
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <form 
              onSubmit={handleReply} 
              className={`w-full relative bg-white/[0.02]/90 backdrop-blur-sm border rounded-3xl transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.5)] ${
                isDragging ? 'border-cyan-500 ring-4 ring-cyan-500/20' : 'border-white/10 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/10'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-cyan-900/60 rounded-3xl flex items-center justify-center backdrop-blur-sm border-2 border-dashed border-cyan-400">
                  <p className="text-cyan-400 font-bold flex items-center gap-2 text-lg"><Paperclip className="w-6 h-6" /> Drop files to attach here</p>
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
                  placeholder="Type your reply to this ticket..."
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
                      <div key={i} className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-cyan-300 font-medium">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(i)} className="text-cyan-500 hover:text-cyan-300 ml-1 hover:bg-cyan-500/20 rounded p-0.5 transition-colors">
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
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:from-zinc-700 disabled:to-zinc-800 text-white px-7 py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-sm disabled:shadow-none flex items-center justify-center gap-2 shrink-0 group mr-2"
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
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-md cursor-grab active:cursor-grabbing origin-center"
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