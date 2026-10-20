'use client';
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ChevronRight, User, Trash2, X, CheckCircle, Search, ChevronLeft, Loader2, Plus, AlertCircle, Paperclip, FileText, Image as ImageIcon, RefreshCw } from 'lucide-react';
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

  const totalCount = tickets.length;
  const openCount = tickets.filter((t: any) => t.status === 'OPEN').length;
  const replyCount = tickets.filter((t: any) => t.status === 'CUSTOMER_REPLY').length;
  const answeredCount = tickets.filter((t: any) => t.status === 'ANSWERED').length;
  const closedCount = tickets.filter((t: any) => t.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Manage Support Tickets
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            View and respond to customer support requests and prioritize escalations.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
            <span>Total Tickets:</span>
            <span className="font-extrabold text-white">{totalCount}</span>
          </div>
          <button
            onClick={() => mutate()}
            className={cn(
              "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Open Ticket</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid (GAMBAR 1 Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL TICKETS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{totalCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>All logged</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>OPEN TICKETS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{openCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-emerald-400" : "text-emerald-600")}>Pending action</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>CUSTOMER REPLIES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-orange-500/15 border-orange-500/25 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700")}>
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{replyCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-orange-400" : "text-orange-600")}>Awaiting response</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>ANSWERED & CLOSED</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{answeredCount + closedCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Resolved tickets</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar (GAMBAR 1 Style) */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("inline-flex p-1 rounded-xl border self-start md:self-auto overflow-x-auto max-w-full", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
          {[
            { key: "", label: "All Tickets", count: totalCount },
            { key: "OPEN", label: "Open", count: openCount },
            { key: "CUSTOMER_REPLY", label: "Customer Reply", count: replyCount },
            { key: "ANSWERED", label: "Answered", count: answeredCount },
            { key: "CLOSED", label: "Closed", count: closedCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setPage(1); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                filter === tab.key
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-white"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("px-1.5 py-0.2 rounded-full text-[10px]", filter === tab.key ? "bg-slate-950/20 text-slate-950 font-extrabold" : isDark ? "bg-white/10 text-zinc-300" : "bg-slate-200 text-slate-700")}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {selectedTickets.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={isBulkDeleting}
              className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedTickets.length})</span>
            </button>
          )}
          <div className="relative w-full md:w-64">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input 
              type="text" 
              placeholder="Search ID, subject, name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl border focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className={cn("border rounded-2xl overflow-hidden relative z-10", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        {isLoading ? (
          <AdminLoader className="min-h-[250px] py-20" />
        ) : error ? (
          <div className={cn("p-8 text-center", isDark ? "text-red-400" : "text-red-700")}>Failed to load tickets.</div>
        ) : tickets?.length === 0 ? (
          <div className="p-16 text-center relative overflow-hidden group">
            <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-transform duration-500 group-hover:scale-105", isDark ? "bg-[#060b14] border-slate-800 text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No tickets found</h3>
            <p className={cn("text-sm max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>There are no tickets matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className={cn("border-b text-xs font-semibold uppercase tracking-wider", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
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
                      className={cn(
                        "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                        tickets.length > 0 && selectedTickets.length === tickets.length
                          ? "bg-cyan-500 border-cyan-500 text-slate-950"
                          : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                      )}
                    >
                      {tickets.length > 0 && selectedTickets.length === tickets.length && <CheckCircle className="w-3.5 h-3.5" />}
                    </button>
                  </th>
                  <th className="p-4 font-medium">Ticket ID & Subject</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Last Updated</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
                {tickets.length > 0 ? tickets.map((t: any) => (
                  <tr key={t.id} className={cn("transition-colors group cursor-pointer", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")} onClick={() => router.push(`/admin/tickets/${t.ticketId.toLowerCase()}`)}>
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
                        className={cn(
                          "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                          selectedTickets.includes(t.ticketId)
                            ? "bg-cyan-500 border-cyan-500 text-slate-950"
                            : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                        )}
                      >
                        {selectedTickets.includes(t.ticketId) && <CheckCircle className="w-3.5 h-3.5" />}
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
                      <StatusBadge status={t.status} isDark={isDark} />
                    </td>
                    <td className={cn("p-4 text-sm whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>
                      {new Date(t.updatedAt).toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-right">
                      <ChevronRight className={cn("w-4 h-4 text-zinc-600 group-hover:inline-block transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")} />
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
            className={cn("p-2.5 rounded-xl transition-all border shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}
          >
            <ChevronLeft className={cn("w-5 h-5", isDark ? "text-white" : "text-slate-900")} />
          </button>
          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={cn("p-2.5 rounded-xl transition-all border shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}
          >
            <ChevronRight className={cn("w-5 h-5", isDark ? "text-white" : "text-slate-900")} />
          </button>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl w-full max-w-md overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800 text-white shadow-2xl" : "bg-white border-slate-200 text-slate-900 shadow-2xl")}>
            <div className={cn("p-5 border-b flex justify-between items-center", isDark ? "border-slate-800" : "border-slate-200")}>
              <h3 className={cn("font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Trash2 className={cn("w-5 h-5", isDark ? "text-red-400" : "text-red-600")} />
                Delete Tickets
              </h3>
              <button onClick={() => setShowBulkDeleteModal(false)} disabled={isBulkDeleting} className={cn("transition-colors", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>
                Are you sure you want to delete {selectedTickets.length} selected tickets? This action cannot be undone.
              </p>
              <div className={cn("flex justify-end gap-3 pt-4 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={isBulkDeleting}
                  className={cn("px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 border", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-6 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
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
          <div className={cn("border rounded-3xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className={cn("p-4 md:p-6 border-b flex justify-between items-start md:items-center relative z-10 shrink-0", isDark ? "border-slate-800" : "border-slate-200")}>
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
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
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
                      className={cn("w-full rounded-2xl px-5 py-3.5 text-sm", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}
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
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
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
                      className={cn("w-full rounded-2xl px-5 py-3.5 text-sm", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}
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
                    className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors resize-none", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                    placeholder="Describe the issue..."
                  />
                </div>

                <div>
                  <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Attachments</label>
                  <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn("flex items-center gap-2 px-5 py-3 border border-dashed hover:border-cyan-500/50 rounded-2xl text-sm hover:text-cyan-400 transition-all w-full justify-center", isDark ? "border-slate-800 text-zinc-400 bg-[#060b14]" : "border-slate-200 text-slate-500 bg-slate-50")}
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach Files (max 5, 5MB each)
                  </button>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {attachments.map((file, i) => (
                        <div key={i} className={cn("flex items-center gap-2 border px-3 py-2 rounded-xl text-xs", isDark ? "border-slate-800 bg-[#060b14] text-zinc-300" : "border-slate-200 bg-slate-50 text-slate-600")}>
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

                <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className={cn("w-full sm:w-auto px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
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
