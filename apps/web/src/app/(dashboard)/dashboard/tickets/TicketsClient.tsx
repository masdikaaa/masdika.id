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
  if (status === 'OPEN') return <span className={cn("border px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>Open</span>;
  if (status === 'ANSWERED') return <span className={cn("border px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest", isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>Answered</span>;
  if (status === 'CUSTOMER_REPLY') return <span className={cn("border px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest", isDark ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-700 border-orange-200")}>Your Reply</span>;
  if (status === 'MERGED') return <span className={cn("border px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest", isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200")}>Merged</span>;
  return <span className={cn("border px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest", isDark ? "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-700")}>Closed</span>;
}

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
    <div className="w-full space-y-6 pb-10">
      {/* Compact Unboxed Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Support Tickets
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
              Customer Support
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            View and manage your support requests. Our team typically responds within 24 hours.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("w-full rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm transition-all focus:outline-none focus:ring-2", isDark ? "bg-[#111115] border border-white/[0.08] text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-cyan-500/20" : "bg-slate-50/80 border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20")}
            />
          </div>
          <Link
            href="/dashboard/tickets/new"
            className="w-full sm:w-auto px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 bg-cyan-400 hover:bg-cyan-300 text-slate-950"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </Link>
        </div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div variants={itemVariants} className={cn("rounded-2xl overflow-hidden relative border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
        <div className={cn("p-5 sm:p-6 border-b relative z-10 flex items-center justify-between", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
          <h3 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <MessageSquare className="w-5 h-5 text-cyan-400" /> Your Tickets
          </h3>
          {!isLoading && tickets.length > 0 && (
            <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", isDark ? "text-zinc-400 bg-white/[0.02] border-white/[0.08]" : "text-slate-500 bg-slate-50/80 border-slate-200/90")}>
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="overflow-x-auto relative z-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
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
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 gap-4 text-center px-6">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                <MessageSquare className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-500")} />
              </div>
              <div>
                <h3 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
                  {searchQuery ? 'No tickets found' : 'No tickets yet'}
                </h3>
                <p className={cn("text-xs sm:text-sm max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                  {searchQuery ? `No tickets matching "${searchQuery}".` : "Haven't opened any support tickets yet? We're here to help!"}
                </p>
              </div>
              {!searchQuery && (
                <Link
                  href="/dashboard/tickets/new"
                  className="mt-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all bg-cyan-400 hover:bg-cyan-300 text-slate-950"
                >
                  <Plus className="w-4 h-4" /> Open a Ticket
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[600px] text-left">
              <thead className={cn("border-b", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                <tr className={cn("text-[10px] uppercase tracking-widest font-black", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <th className="px-6 py-4">Ticket ID & Subject</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Updated</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/[0.08]" : "divide-slate-200/90")}>
                {tickets?.map((t: any, i: number) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn("transition-colors group cursor-pointer", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}
                    onClick={() => router.push(`/dashboard/tickets/${t.ticketId.toLowerCase()}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1 border px-2 py-0.5 rounded-lg w-fit", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border-cyan-200")}>#{t.ticketId}</span>
                        <span className={cn("text-sm font-bold transition-colors mt-1", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{t.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("flex items-center gap-2 text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Clock className={cn("w-3.5 h-3.5", isDark ? "text-zinc-500" : "text-slate-400")} />
                        {new Date(t.updatedAt).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all border", isDark ? "bg-white/[0.02] border-white/[0.08] group-hover:bg-cyan-500/20 group-hover:text-cyan-400" : "bg-slate-50/80 border-slate-200/90 group-hover:bg-cyan-500/10 group-hover:text-cyan-700")}>
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
          <div className={cn("p-6 border-t relative z-10", isDark ? "border-white/[0.08] bg-[#111115]" : "border-slate-200/90 bg-slate-50/80")}>
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