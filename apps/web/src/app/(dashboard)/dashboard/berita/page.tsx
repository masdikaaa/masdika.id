"use client";

import { useUrlNumber } from "@/lib/useUrlTab";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, FileText, Newspaper } from "lucide-react";

import { Pagination } from "@/components/ui/Pagination";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function BeritaListPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [beritaList, setBeritaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useUrlNumber("page", 1);
  const itemsPerPage = 3;

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBeritaList(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(beritaList.length / itemsPerPage);
  const currentItems = beritaList.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const getBeritaExcerpt = (content: string) => {
    if (content.startsWith("<!-- state: ")) {
      try {
        const stateStr = content.match(/<!-- state: (.*?) -->/)?.[1];
        if (stateStr) {
          const state = JSON.parse(stateStr);
          return state.reason || state.impact || `Maintenance on ${state.service} (${state.node})`;
        }
      } catch (e) {}
    }
    const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return stripped.length > 0 ? stripped : "No summary available";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-10 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Compact Unboxed Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Latest Announcements
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-700")}>
              <Newspaper className="w-3 h-3" /> News & Maintenance
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Official platform announcements, scheduled maintenance notices, and service updates.</p>
        </div>

        <div className="w-full sm:w-auto shrink-0">
          <Link 
            href="/dashboard" 
            className={cn("w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all border", isDark ? "text-zinc-300 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08]" : "text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs")}
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </Link>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
        <div className={cn("p-4 sm:p-5 border-b", isDark ? "border-white/[0.08] bg-[#111115]" : "border-slate-200/90 bg-slate-50/80")}>
          <h2 className={cn("text-sm sm:text-base font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <Newspaper className={cn("w-4 h-4 sm:w-5 sm:h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
            Published Feed
          </h2>
        </div>

        <div className="flex flex-col">
          {beritaList.length === 0 ? (
            <div className={cn("p-12 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-xs sm:text-sm">No announcements have been published yet.</p>
            </div>
          ) : (
            currentItems.map((berita) => (
              <Link 
                href={`/dashboard/berita/${berita.id}`} 
                key={berita.id}
                className={cn("p-5 sm:p-6 border-b last:border-b-0 transition-colors block group", isDark ? "border-white/[0.06] hover:bg-white/[0.02]" : "border-slate-200/90 hover:bg-slate-50/80")}
              >
                <h2 className={cn("text-base sm:text-lg font-bold transition-colors mb-2", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-700")}>
                  {berita.title}
                </h2>
                <p className={cn("text-xs sm:text-sm line-clamp-3 mb-3.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                  {getBeritaExcerpt(berita.content)}
                </p>
                <div className={cn("flex items-center text-[11px] font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  {new Date(berita.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </Link>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className={cn("p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t", isDark ? "border-white/[0.08] bg-[#111115]" : "border-slate-200/90 bg-slate-50/80")}>
            <Link href="/dashboard" className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
              Back to Dashboard
            </Link>
            
            <div className="flex gap-1">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}