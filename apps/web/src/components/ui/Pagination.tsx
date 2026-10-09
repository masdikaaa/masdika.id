import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  baseUrl?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buttonClass = "w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors";

  return (
    <div className="flex items-center justify-center gap-4">
      {baseUrl ? (
        <Link
          href={currentPage === 1 ? '#' : `${baseUrl}?page=${currentPage - 1}`}
          className={`${buttonClass} ${currentPage === 1 ? 'opacity-30 pointer-events-none' : ''}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <button
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={buttonClass}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <div className="text-sm font-bold text-zinc-400 tracking-widest">
        <span className="text-white">{currentPage}</span> <span className="text-zinc-600 font-normal px-1">/</span> {totalPages}
      </div>

      {baseUrl ? (
        <Link
          href={currentPage === totalPages ? '#' : `${baseUrl}?page=${currentPage + 1}`}
          className={`${buttonClass} ${currentPage === totalPages ? 'opacity-30 pointer-events-none' : ''}`}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={buttonClass}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
