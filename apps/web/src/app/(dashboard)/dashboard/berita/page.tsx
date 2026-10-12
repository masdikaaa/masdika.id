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
      <motion.div variants={itemVariants} className="flex items-center">
        <Link 
          href="/dashboard" 
          className={cn("inline-flex items-center gap-2 text-sm font-medium hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border shadow-sm", isDark ? "text-zinc-400 border-white/5" : "text-slate-500 border-slate-200")}
        >
          <ChevronLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className={cn("border rounded-3xl shadow-md overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("p-6 border-b", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-100 bg-slate-50")}>
          <h1 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <Newspaper className={cn("w-6 h-6", isDark ? "text-cyan-400" : "text-cyan-600")} />
            Latest Announcements
          </h1>
        </div>

        <div className="flex flex-col">
          {beritaList.length === 0 ? (
            <div className={cn("p-12 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No announcements have been published yet.</p>
            </div>
          ) : (
            currentItems.map((berita) => (
              <Link 
                href={`/dashboard/berita/${berita.id}`} 
                key={berita.id}
                className={cn("p-6 border-b transition-colors block group", isDark ? "border-slate-800/60 hover:bg-slate-800/40" : "border-slate-100 hover:bg-slate-50")}
              >
                <h2 className={cn("text-lg font-bold transition-colors mb-2", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-700")}>
                  {berita.title}
                </h2>
                <p className={cn("text-sm line-clamp-3 mb-4 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
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
          <div className="p-6 flex items-center justify-between bg-black/20">
            <Link href="/dashboard" className="text-sm text-fuchsia-400 hover:text-fuchsia-300 transition-colors font-medium">
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