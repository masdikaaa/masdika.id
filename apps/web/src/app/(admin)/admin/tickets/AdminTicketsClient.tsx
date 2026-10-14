'use client';
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ChevronRight, User, Trash2, X, CheckCircle, Search, ChevronLeft , Loader2, Plus, AlertCircle, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { useTheme } from "@/components/ThemeProvider";
import { toast } from 'sonner';
import { AdminLoader } from '@/components/admin/AdminLoader';
import { Select } from '@/components/ui/Select';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function StatusBadge({ status, isDark }: { status: string; isDark?: boolean }) {
  if (status === 'OPEN') return <span className={cn("bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-semibold", isDark ? "text-emerald-400" : "text-emerald-700")}>OPEN</span>;
  if (status === 'ANSWERED') return <span className={cn("bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>ANSWERED</span>;
  if (status === "CUSTOMER_REPLY") return <span className={cn("bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-xs font-semibold", isDark ? "text-orange-400" : "text-orange-700")}>CUSTOMER REPLY</span>;
  if (status === 'MERGED') return <span className={cn("bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-xs font-semibold", isDark ? "text-purple-400" : "text-purple-700")}>MERGED</span>;
  return <span className={cn("bg-zinc-500/10 border border-zinc-500/20 px-2 py-0.5 rounded text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-500")}>CLOSED</span>;
}

export default function AdminTicketsClient() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [filter, setFilter] = useUrlString<string>("filter", '');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ targetEmail: '', subject: '', service: '', priority: 'NORMAL', message: '' });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [userServices, setUserServices] = useState<any[]>([]);
  const [isFetchingServices, setIsFetchingServices] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [debouncedEmail, setDebouncedEmail] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(formData.targetEmail);
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.targetEmail]);

  useEffect(() => {
    if (debouncedEmail && debouncedEmail.includes('@')) {
      setIsFetchingServices(true);
      fetch(`/api/services/list?email=${encodeURIComponent(debouncedEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserServices(data.services);
            setSubmitError('');
          } else {
            setUserServices([]);
            setSubmitError(data.error || 'User not found');
          }
        })
        .catch(() => {
          setUserServices([]);
        })
        .finally(() => setIsFetchingServices(false));
    } else {
      setUserServices([]);
    }
  }, [debouncedEmail]);

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
    // Clear the input so the user can select more files (or the same file) again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ targetEmail: '', subject: '', service: '', priority: 'NORMAL', message: '' });
    setAttachments([]);
    setSubmitError('');
    setUserServices([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const fd = new FormData();
      fd.append('targetEmail', formData.targetEmail);
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
      mutate();
      closeModal();
      toast.success('Ticket created successfully!');
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchParams = new URLSearchParams();
  if (filter) searchParams.set('status', filter);
  if (debouncedSearch) searchParams.set('search', debouncedSearch);
  searchParams.set('page', page.toString());
  
  const queryUrl = `/api/tickets?${searchParams.toString()}`;
  const { data, error, isLoading, mutate } = useSWR(queryUrl, fetcher, {
    refreshInterval: 10000,
  });

  const tickets = data?.tickets || [];
  const totalPages = data?.totalPages || 1;

  const handleBulkDelete = async () => {
    if (selectedTickets.length === 0) return;
    setIsBulkDeleting(true);
    const toastId = toast.loading(`Deleting ${selectedTickets.length} tickets...`);
    let successCount = 0;
    
    for (const id of selectedTickets) {
      try {
        const res = await fetch(`/api/admin/tickets/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch (e) {
        // ignore
      }
    }
    
    toast.success(`Successfully deleted ${successCount} tickets`, { id: toastId });
    setSelectedTickets([]);
    setShowBulkDeleteModal(false);
    setIsBulkDeleting(false);
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Manage Support Tickets
          </h1>
          <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>View and respond to customer support requests.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-400" : "text-slate-500")} />
            <input 
              type="text" 
              placeholder="Search ID, subject, or name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("w-full border rounded-xl pl-9 pr-4 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
            />
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {selectedTickets.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={isBulkDeleting}
                className={cn("col-span-2 sm:col-span-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0", isDark ? "text-red-400" : "text-red-700")}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span> ({selectedTickets.length})
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className={cn("col-span-1 sm:col-span-1 px-2 sm:px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0 flex items-center justify-center gap-1 sm:gap-2 shadow-lg", isDark ? "bg-cyan-500 hover:bg-cyan-600 text-[#0a0b1a]" : "bg-slate-900 hover:bg-slate-800 text-white")}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">Open Ticket</span>
            </button>
            <div className="col-span-1 sm:col-span-1">
              <Select 
                value={filter} 
                onChange={(val) => setFilter(val)}
                options={[
                  { value: "", label: "All Status" },
                  { value: "OPEN", label: "Open" },
                  { value: "CUSTOMER_REPLY", label: "Customer Reply" },
                  { value: "ANSWERED", label: "Answered" },
                  { value: "CLOSED", label: "Closed" },
                  { value: "MERGED", label: "Merged" }
                ]}
                placeholder="All Status"
                className={cn("w-full rounded-xl px-3 py-2 text-sm", isDark ? "border-white/10" : "border-slate-200")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={cn("glass-card border rounded-[32px] overflow-hidden shadow-2xl relative z-10", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        {isLoading ? (
          <AdminLoader className="min-h-[250px] py-20" />
        ) : error ? (
          <div className={cn("p-8 text-center", isDark ? "text-red-400" : "text-red-700")}>Failed to load tickets.</div>
        ) : tickets?.length === 0 ? (
          <div className="p-16 text-center relative overflow-hidden group">
            <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border group-hover:scale-110 transition-transform duration-500", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
              <MessageSquare className={cn("w-12 h-12 opacity-80", isDark ? "text-cyan-400" : "text-cyan-700")} />
            </div>
            <h3 className={cn("text-2xl font-extrabold mb-3", isDark ? "text-white" : "text-[#0F3B4A]")}>No tickets found</h3>
            <p className={cn("font-medium max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>There are no tickets matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className={cn("border-b text-xs uppercase tracking-wider text-zinc-500", isDark ? "bg-[#0A0B1A]/50 border-white/5 bg-white/[0.02]" : "bg-white border-slate-200 bg-white")}>
                  <th className="p-4 w-12">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tickets.length > 0 && selectedTickets.length === tickets.length) {
                          setSelectedTickets([]);
                        } else {
                          setSelectedTickets(tickets.map((t: any) => t.ticketId));
                        }
                      }}
                      className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                        tickets.length > 0 && selectedTickets.length === tickets.length
                          ? 'bg-cyan-500 border-cyan-500'
                          : 'border-zinc-500 hover:border-zinc-400 bg-transparent'
                      }`}
                    >
                      {tickets.length > 0 && selectedTickets.length === tickets.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                    </button>
                  </th>
                  <th className="p-4 font-medium">Ticket ID & Subject</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Last Updated</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                {tickets.length > 0 ? tickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => router.push(`/admin/tickets/${t.ticketId.toLowerCase()}`)}>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedTickets.includes(t.ticketId)) {
                            setSelectedTickets(selectedTickets.filter(id => id !== t.ticketId));
                          } else {
                            setSelectedTickets([...selectedTickets, t.ticketId]);
                          }
                        }}
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                          selectedTickets.includes(t.ticketId)
                            ? 'bg-cyan-500 border-cyan-500'
                            : 'border-zinc-500 group-hover:border-zinc-400 bg-transparent'
                        }`}
                      >
                        {selectedTickets.includes(t.ticketId) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("font-medium text-xs", isDark ? "text-cyan-400" : "text-cyan-700")}>#{t.ticketId}</span>
                          {t.priority === 'CRITICAL' && <span className={cn("bg-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold", isDark ? "text-red-400" : "text-red-700")}>CRITICAL</span>}
                          {t.priority === 'HIGH' && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[10px] font-bold">HIGH</span>}
                        </div>
                        <span className={cn("text-sm font-semibold group-hover:text-cyan-300 transition-colors truncate max-w-[300px]", isDark ? "text-white" : "text-slate-900")}>{t.subject}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className={cn("w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
                        <span className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>{t.user.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className={cn("p-4 text-sm whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>
                      {new Date(t.updatedAt).toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-right">
                      <ChevronRight className={cn("w-4 h-4 text-zinc-600 group-hover: inline-block transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")} />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className={cn("p-8 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                      {error || "No tickets found matching your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn("p-2.5 rounded-xl transition-all shadow-sm border shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}
          >
            <ChevronLeft className={cn("w-5 h-5", isDark ? "text-white" : "text-slate-900")} />
          </button>
          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={cn("p-2.5 rounded-xl transition-all shadow-sm border shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}
          >
            <ChevronRight className={cn("w-5 h-5", isDark ? "text-white" : "text-slate-900")} />
          </button>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl", isDark ? "bg-[#0A0B1A] border-red-500/20" : "bg-white border-red-200")}>
            <div className="p-5 border-b border-red-500/10 flex justify-between items-center bg-red-500/[0.04]">
              <h3 className={cn("font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Trash2 className={cn("w-5 h-5", isDark ? "text-red-400" : "text-red-700")} />
                Delete Tickets
              </h3>
              <button onClick={() => setShowBulkDeleteModal(false)} disabled={isBulkDeleting} className={cn("hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>
                Are you sure you want to delete {selectedTickets.length} selected tickets? This action cannot be undone.
              </p>
              <div className={cn("flex justify-end gap-3 pt-4 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={isBulkDeleting}
                  className={cn("px-4 py-2 text-sm font-semibold hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50", isDark ? "text-zinc-300" : "text-slate-600")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className={cn("px-6 py-2 text-sm font-bold bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}
                >
                  {isBulkDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("bg-[#0f172a] border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col", isDark ? "border-white/10" : "border-slate-200")}>
            <div className={cn("p-4 md:p-6 border-b flex justify-between items-start md:items-center relative z-10 shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <div className="flex-1 pr-4">
                <h3 className={cn("text-lg md:text-xl font-bold flex items-start md:items-center gap-3", isDark ? "text-white" : "text-slate-900")}>
                  <div className={cn("w-10 h-10 md:w-8 md:h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 md:mt-0", isDark ? "bg-cyan-500/20" : "bg-cyan-50")}>
                    <Plus className={cn("w-5 h-5 md:w-4 md:h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                  </div>
                  <span className="leading-tight">Open Ticket on Behalf of Customer</span>
                </h3>
              </div>
              <button onClick={closeModal} className={cn("transition-colors p-2 rounded-xl shrink-0 mt-1 md:mt-0", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 relative z-10">
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {submitError && (
                  <div className={cn("p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm flex items-center gap-3", isDark ? "text-red-400" : "text-red-700")}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {submitError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Customer Email</label>
                    <input
                      required
                      type="email"
                      value={formData.targetEmail}
                      onChange={e => setFormData({...formData, targetEmail: e.target.value})}
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div>
                    <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Related Service {isFetchingServices && <Loader2 className={cn("w-3 h-3 animate-spin inline-block ml-1", isDark ? "text-cyan-400" : "text-cyan-700")} />}
                    </label>
                    <Select
                      value={formData.service}
                      onChange={val => setFormData({...formData, service: val})}
                      options={[
                        { value: "", label: "-- Select Service (Optional) --" },
                        ...userServices.map(s => ({ value: s.value, label: s.value }))
                      ]}
                      placeholder="-- Select Service (Optional) --"
                      className={cn("w-full rounded-2xl px-5 py-3.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div className="sm:col-span-3">
                    <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Subject</label>
                    <input
                      required
                      type="text"
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                      placeholder="Ticket subject..."
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Priority</label>
                    <Select
                      value={formData.priority}
                      onChange={val => setFormData({...formData, priority: val})}
                      options={[
                        { value: "LOW", label: "Low" },
                        { value: "NORMAL", label: "Normal" },
                        { value: "HIGH", label: "High" },
                        { value: "CRITICAL", label: "Critical" }
                      ]}
                      placeholder="Priority"
                      className={cn("w-full rounded-2xl px-5 py-3.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                    />
                  </div>
                </div>

                <div>
                  <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-all resize-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                    placeholder="Describe the issue..."
                  />
                </div>

                <div>
                  <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Attachments</label>
                  <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn("flex items-center gap-2 px-5 py-3 border border-dashed hover:border-cyan-500/50 rounded-2xl text-sm hover:text-cyan-400 transition-all w-full justify-center", isDark ? "border-white/20 text-zinc-400" : "border-slate-200 text-slate-500")}
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach Files (max 5, 5MB each)
                  </button>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {attachments.map((file, i) => (
                        <div key={i} className={cn("flex items-center gap-2 border px-3 py-2 rounded-xl text-xs", isDark ? "border-white/10 text-zinc-300" : "border-slate-200 text-slate-600")}>
                          {file.type.startsWith('image/') ? <ImageIcon className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} /> : <FileText className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} />}
                          <span className="truncate max-w-[140px]">{file.name}</span>
                          <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className={cn("text-zinc-500 hover: ml-1", isDark ? "text-red-400" : "text-red-700")}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className={cn("w-full sm:w-auto px-4 py-2.5 text-sm font-medium hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn("w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap", isDark ? "bg-cyan-500 hover:bg-cyan-600 text-[#0a0b1a]" : "bg-slate-900 hover:bg-slate-800 text-white")}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
