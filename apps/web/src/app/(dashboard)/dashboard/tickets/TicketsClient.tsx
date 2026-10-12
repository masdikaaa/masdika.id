'use client';

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, MessageSquare, AlertCircle, ChevronRight, Activity, X, Paperclip, FileText, Image as ImageIcon, Search, ChevronLeft, TicketSlash, Loader2, Clock, HeadphonesIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pagination } from '@/components/ui/Pagination';
import { toast } from 'sonner';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (status === 'OPEN') return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Open</span>;
  if (status === 'ANSWERED') return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Answered</span>;
  if (status === 'CUSTOMER_REPLY') return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Your Reply</span>;
  if (status === 'MERGED') return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Merged</span>;
  return <span className={cn("bg-zinc-500/10 border border-zinc-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Closed</span>;
}

const inputClass = 'w-full bg-[#0b1120] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-sm';
const labelClass = 'block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2';

export default function TicketsClient() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchParams = new URLSearchParams();
  if (debouncedSearch) searchParams.set('search', debouncedSearch);
  searchParams.set('page', page.toString());
  
  const queryUrl = `/api/tickets?${searchParams.toString()}`;
  const { data, error, isLoading } = useSWR(queryUrl, fetcher, {
    refreshInterval: 10000,
  });

  const tickets = data?.tickets || [];
  const totalPages = data?.totalPages || 1;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header section */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6 border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative z-10 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-4 tracking-wide">
            <HeadphonesIcon className="w-3 h-3" /> Customer Support
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Support <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Tickets</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>View and manage your support requests. Our team typically responds within 24 hours.</p>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-500")} />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm transition-all focus:outline-none focus:ring-2", isDark ? "bg-[#060b14] border border-slate-800 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-cyan-500/20" : "bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 shadow-sm")}
            />
          </div>
          <Link
            href="/dashboard/tickets/new"
            className={cn("px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shrink-0", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm")}
          >
            <Plus className="w-5 h-5" />
            New Ticket
          </Link>
        </div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div variants={itemVariants} className={cn("rounded-3xl overflow-hidden shadow-md relative border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("p-6 md:p-8 border-b relative z-10 flex items-center justify-between", isDark ? "border-slate-800" : "border-slate-100")}>
          <h3 className={cn("text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <MessageSquare className="w-5 h-5 text-sky-400" /> Your Tickets
          </h3>
          {!isLoading && tickets.length > 0 && (
            <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", isDark ? "text-zinc-500 bg-white/5 border-white/5" : "text-slate-500 bg-slate-100 border-slate-200")}>
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="overflow-x-auto relative z-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
              <p className={cn("text-sm font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>Loading your tickets...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 font-semibold">Failed to load tickets.</p>
            </div>
          ) : tickets?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
              <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center transform -rotate-6">
                <MessageSquare className={cn("w-12 h-12 transform rotate-6", isDark ? "text-zinc-600" : "text-slate-900")} />
              </div>
              <div>
                <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
                  {searchQuery ? 'No tickets found' : 'No tickets yet'}
                </h3>
                <p className={cn("text-sm max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                  {searchQuery ? `No tickets matching "${searchQuery}".` : "Haven't opened any support tickets yet? We're here to help!"}
                </p>
              </div>
              {!searchQuery && (
                <Link
                  href="/dashboard/tickets/new"
                  className={cn("mt-2 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm")}
                >
                  <Plus className="w-4 h-4" /> Open a Ticket
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[600px] text-left">
              <thead className={cn("border-b", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                <tr className={cn("text-[10px] uppercase tracking-widest font-black", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <th className="px-6 py-5">Ticket ID & Subject</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Last Updated</th>
                  <th className="px-6 py-5 w-10"></th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-slate-800/60" : "divide-slate-200")}>
                {tickets?.map((t: any, i: number) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn("transition-colors group cursor-pointer", isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}
                    onClick={() => router.push(`/dashboard/tickets/${t.ticketId.toLowerCase()}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg w-fit">#{t.ticketId}</span>
                        <span className={cn("text-sm font-bold group-hover:text-sky-300 transition-colors mt-1", isDark ? "text-white" : "text-slate-900")}>{t.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-6 py-5">
                      <div className={cn("flex items-center gap-2 text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Clock className={cn("w-3.5 h-3.5", isDark ? "text-zinc-600" : "text-slate-900")} />
                        {new Date(t.updatedAt).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all", isDark ? "bg-slate-800/60 group-hover:bg-cyan-500/20 group-hover:text-cyan-400" : "bg-slate-100 group-hover:bg-cyan-500/10 group-hover:text-cyan-700")}>
                        <ChevronRight className={cn("w-4 h-4 transition-colors", isDark ? "text-zinc-500 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600")} />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className={cn("p-6 border-t relative z-10", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50/50")}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}