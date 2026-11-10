"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  baseUrl?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, baseUrl }: PaginationProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (totalPages <= 1) return null;

  const buttonClass = cn(
    "w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none",
    isDark
      ? "bg-white/[0.04] border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
      : "bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100 shadow-2xs"
  );

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {baseUrl ? (
        <Link
          href={currentPage === 1 ? '#' : `${baseUrl}?page=${currentPage - 1}`}
          className={cn(buttonClass, currentPage === 1 && 'opacity-30 pointer-events-none')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={buttonClass}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange && onPageChange(page)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer",
                isActive
                  ? "bg-cyan-400 border-cyan-400 text-slate-950 font-black shadow-xs ring-1 ring-cyan-300/40"
                  : isDark
                    ? "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
              )}
            >
              {page}
            </button>
          );
        })}
      </div>

      {baseUrl ? (
        <Link
          href={currentPage === totalPages ? '#' : `${baseUrl}?page=${currentPage + 1}`}
          className={cn(buttonClass, currentPage === totalPages && 'opacity-30 pointer-events-none')}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={buttonClass}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
