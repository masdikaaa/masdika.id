'use client';

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, ChevronLeft, Paperclip, FileText, Image as ImageIcon, X, AlertCircle, Loader2, Send, HeadphonesIcon, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import 'react-quill-new/dist/quill.snow.css';

import { Select } from "@/components/ui/Select";

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const getInputClass = (isDark: boolean) => cn(
  'w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all',
  isDark ? 'bg-[#111115] border-white/[0.08] text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-cyan-500/20' : 'bg-slate-50/80 border-slate-200/90 text-slate-800 placeholder-slate-400 focus:border-cyan-600 focus:ring-cyan-600/20'
);

const getLabelClass = (isDark: boolean) => cn(
  'block text-[10px] font-black uppercase tracking-widest mb-2',
  isDark ? 'text-zinc-400' : 'text-slate-500'
);

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ 'header': 1 }, { 'header': 2 }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['link'],
    ['clean']
  ]
};



export default function TicketsNewClient() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();

  const [formData, setFormData] = useState({ subject: '', service: '', priority: 'NORMAL', message: '' });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [userServices, setUserServices] = useState<any[]>([]);
  const [isFetchingServices, setIsFetchingServices] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsFetchingServices(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('subject');
      const srv = params.get('service');
      if (sub || srv) {
        setFormData(prev => ({
          ...prev,
          subject: sub || prev.subject,
          service: srv || prev.service
        }));
      }
    }
    fetch('/api/services/list')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserServices(data.services);
        }
      })
      .finally(() => setIsFetchingServices(false));
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim() || formData.message === '<p><br></p>') {
      toast.error('Subject and Message are required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const fd = new FormData();
      fd.append('subject', formData.subject);
      fd.append('service', formData.service);
      fd.append('priority', formData.priority);
      fd.append('message', formData.message);
      attachments.forEach(file => fd.append('attachments', file));

      const res = await fetch('/api/tickets', { method: 'POST', body: fd });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create ticket');
      }

      const ticket = await res.json();
      toast.success('Ticket created successfully');
      router.push(`/dashboard/tickets/${ticket.ticketId.toLowerCase()}`);
    } catch (err: any) {
      setSubmitError(err.message);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Compact Unboxed Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Open Support Ticket
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
              Customer Support
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Fill in the details and our team will assist you shortly.
          </p>
        </div>

        <Link 
          href="/dashboard/tickets" 
          className={cn(
            "w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-all border shrink-0",
            isDark 
              ? "text-zinc-300 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]" 
              : "text-slate-700 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 border-slate-200/90"
          )}
        >
          <ChevronLeft className="w-4 h-4" /> Back to Tickets
        </Link>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className={cn("border rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}
      >

        {submitError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-3 relative z-10">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {submitError}
          </div>
        )}

        <div className="relative z-10">
          <label className={getLabelClass(isDark)}>Subject</label>
          <input
            required
            type="text"
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            className={getInputClass(isDark)}
            placeholder="e.g. Cannot access my database"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-20">
          <div>
            <label className={getLabelClass(isDark)}>
              Related Service (Optional) {isFetchingServices && <Loader2 className="w-3 h-3 animate-spin inline-block ml-1 text-cyan-400" />}
            </label>
            <Select
              value={formData.service}
              onChange={(val: string) => setFormData({ ...formData, service: val })}
              placeholder="-- Select a Service --"
              options={userServices.length > 0 ? userServices.map(s => ({ value: s.value, label: s.value })) : [{ value: '', label: 'No Available Services', disabled: true }]}
              className="py-3 px-4 rounded-xl w-full"
            />
          </div>
          <div>
            <label className={getLabelClass(isDark)}>Priority</label>
            <Select
              value={formData.priority}
              onChange={(val: string) => setFormData({ ...formData, priority: val })}
              placeholder="Select Priority"
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'CRITICAL', label: 'Critical' }
              ]}
              className="py-3 px-4 rounded-xl w-full"
            />
          </div>
        </div>

        <div className={cn("relative z-10", isDark ? "quill-dark-theme" : "quill-light-theme")}>
          <style>{`
            .quill-dark-theme .ql-toolbar {
              border: none;
              border-bottom: 1px solid rgba(255,255,255,0.08);
              background: rgba(255,255,255,0.02);
              border-top-left-radius: 0.75rem;
              border-top-right-radius: 0.75rem;
              padding: 12px 16px;
            }
            .quill-dark-theme .ql-container {
              border: none;
              font-size: 15px;
              color: white;
              min-height: 250px;
            }
            .quill-dark-theme .ql-editor {
              padding: 20px;
            }
            .quill-dark-theme .ql-editor.ql-blank::before {
              color: #71717a;
              font-style: normal;
              left: 20px;
              right: 20px;
            }
            .quill-dark-theme .ql-stroke { stroke: #a1a1aa; }
            .quill-dark-theme .ql-fill { fill: #a1a1aa; }
            .quill-dark-theme .ql-picker-label { color: #a1a1aa; }
            .quill-dark-theme button:hover .ql-stroke { stroke: white; }
            .quill-dark-theme button:hover .ql-fill { fill: white; }

            .quill-light-theme .ql-toolbar {
              border: none;
              border-bottom: 1px solid #e2e8f0;
              background: #f8fafc;
              border-top-left-radius: 0.75rem;
              border-top-right-radius: 0.75rem;
              padding: 12px 16px;
            }
            .quill-light-theme .ql-container {
              border: none;
              font-size: 15px;
              color: #0f172a;
              min-height: 250px;
            }
            .quill-light-theme .ql-editor {
              padding: 20px;
            }
            .quill-light-theme .ql-editor.ql-blank::before {
              color: #94a3b8;
              font-style: normal;
              left: 20px;
              right: 20px;
            }
            .quill-light-theme .ql-stroke { stroke: #64748b; }
            .quill-light-theme .ql-fill { fill: #64748b; }
            .quill-light-theme .ql-picker-label { color: #64748b; }
            .quill-light-theme button:hover .ql-stroke { stroke: #0ea5e9; }
            .quill-light-theme button:hover .ql-fill { fill: #0ea5e9; }
          `}</style>
          <label className={getLabelClass(isDark)}>Message</label>
          <div className={cn("border rounded-xl overflow-hidden", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
            <ReactQuill
              theme="snow"
              bounds={isDark ? ".quill-dark-theme" : ".quill-light-theme"}
              value={formData.message}
              onChange={(val) => setFormData({ ...formData, message: val })}
              modules={quillModules}
              placeholder="Describe your issue in detail..."
            />
          </div>
        </div>

        <div className="relative z-10">
          <label className={getLabelClass(isDark)}>Attachments (Optional · max 5 · 5MB each)</label>
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn("flex items-center gap-2 px-5 py-4 border border-dashed rounded-xl text-sm transition-all w-full justify-center", isDark ? "bg-[#111115] border-white/[0.12] hover:border-cyan-500/50 text-zinc-400 hover:text-cyan-400" : "bg-slate-50/80 border-slate-300 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-600")}
          >
            <Paperclip className="w-5 h-5" />
            Click to attach files
          </button>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {attachments.map((file, i) => {
                const isImage = file.type.startsWith('image/');
                return (
                  <div key={i} className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs border", isDark ? "bg-[#111115] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-700")}>
                    {isImage ? <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" /> : <FileText className="w-4 h-4 text-cyan-400 shrink-0" />}
                    <span className="truncate max-w-[160px] font-medium">{file.name}</span>
                    <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className={cn("hover:text-red-400 ml-2 transition-colors", isDark ? "text-zinc-500" : "text-slate-500")}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={cn("flex items-center justify-end gap-3 pt-6 border-t relative z-10", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
          <Link
            href="/dashboard/tickets"
            className={cn(
              "px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-colors whitespace-nowrap",
              isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.04]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap bg-cyan-400 hover:bg-cyan-300 text-slate-950"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Ticket
          </button>
        </div>
      </motion.form>
    </div>
  );
}