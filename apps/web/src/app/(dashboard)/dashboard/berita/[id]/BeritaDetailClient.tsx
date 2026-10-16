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
      <div className="flex items-center">
        <Link 
          href="/dashboard/berita" 
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
            isDark 
              ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
              : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Announcements
        </Link>
      </div>

      <div className={cn("border rounded-3xl shadow-lg overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
        
        <div className={cn("p-6 md:p-8 border-b", isDark ? "border-slate-800 bg-[#0b1322]" : "border-slate-100 bg-white")}>
          <h1 className={cn("text-xl md:text-2xl font-bold mb-4", isDark ? "text-cyan-400" : "text-cyan-600")}>
            {berita.title}
          </h1>
          
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
          
          <div className={cn("mt-8 pt-4 border-t text-xs font-semibold", isDark ? "border-slate-800 text-zinc-500" : "border-slate-100 text-slate-400")}>
            {format(new Date(berita.createdAt), "yyyy-MM-dd HH:mm:ss")}
          </div>
        </div>

        <div className={cn("p-4 sm:p-6", isDark ? "bg-[#080f1a]" : "bg-slate-50/80")}>
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