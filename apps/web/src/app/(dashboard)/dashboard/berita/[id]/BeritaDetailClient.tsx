"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface BeritaDetailClientProps {
  berita: any;
  contentHtml: string;
  isStructured: boolean;
}

export default function BeritaDetailClient({ berita, contentHtml, isStructured }: BeritaDetailClientProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6 pb-10 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {berita.title}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
              Announcement
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Published on {format(new Date(berita.createdAt), "yyyy-MM-dd HH:mm:ss")}
          </p>
        </div>

        <Link 
          href="/dashboard/berita" 
          className={cn(
            "w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-all border shrink-0",
            isDark 
              ? "text-zinc-300 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]" 
              : "text-slate-700 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 border-slate-200/90"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Announcements
        </Link>
      </div>

      <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
        
        <div className={cn("p-6 md:p-8 border-b", isDark ? "border-white/[0.08] bg-[#0a0a0c]" : "border-slate-200/90 bg-white")}>
          <div className={cn("prose max-w-none w-full [&_table]:min-w-[500px] md:[&_table]:min-w-full prose-p:my-2.5 prose-p:leading-relaxed prose-table:my-4", isDark ? "prose-invert text-zinc-300" : "text-slate-700")}>
            {isStructured ? (
              <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
            ) : (
              <div 
                dangerouslySetInnerHTML={{ __html: contentHtml }} 
                className="space-y-3"
              />
            )}
          </div>
          
          <div className={cn("mt-8 pt-4 border-t text-xs font-semibold", isDark ? "border-white/[0.08] text-zinc-500" : "border-slate-200/90 text-slate-400")}>
            {format(new Date(berita.createdAt), "yyyy-MM-dd HH:mm:ss")}
          </div>
        </div>

        <div className={cn("p-4 sm:p-6", isDark ? "bg-white/[0.02]" : "bg-slate-50/80")}>
          <Link 
            href="/dashboard/berita" 
            className={cn("transition-colors font-medium text-sm flex items-center gap-1 w-fit", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-700")}
          >
            <ChevronLeft className="w-4 h-4" />
            All announcements
          </Link>
        </div>

      </div>
    </div>
  );
}