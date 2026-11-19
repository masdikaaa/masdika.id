"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  baseUrl?: string;
  compact?: boolean;
}

export function getPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis-left" | "ellipsis-right"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];

  if (currentPage <= 3) {
    items.push(2, 3, 4, "ellipsis-right");
  } else if (currentPage >= totalPages - 2) {
    items.push("ellipsis-left", totalPages - 3, totalPages - 2, totalPages - 1);
  } else {
    items.push("ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right");
  }

  items.push(totalPages);
  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  baseUrl,
  compact = false,
}: PaginationProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (totalPages <= 1) return null;

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;
  const items = getPaginationItems(currentPage, totalPages);

  const buttonClass = cn(
    "w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none",
    isDark
      ? "bg-white/[0.04] border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
      : "bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100 shadow-2xs"
  );

  const renderNavControl = (direction: "prev" | "next") => {
    const isPrev = direction === "prev";
    const disabled = isPrev ? isFirst : isLast;
    const targetPage = isPrev ? Math.max(1, currentPage - 1) : Math.min(totalPages, currentPage + 1);
    const label = isPrev ? "Previous page" : "Next page";
    const icon = isPrev ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />;

    if (baseUrl) {
      return (
        <Link
          href={disabled ? "#" : `${baseUrl}?page=${targetPage}`}
          className={cn(buttonClass, disabled && "opacity-30 pointer-events-none")}
          aria-label={label}
          aria-disabled={disabled}
        >
          {icon}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onPageChange && onPageChange(targetPage)}
        disabled={disabled}
        className={buttonClass}
        aria-label={label}
      >
        {icon}
      </button>
    );
  };

  return (
    <nav aria-label="Pagination" className="w-full sm:w-auto max-w-full flex items-center justify-center py-1">
      {/* Compact / Mobile View */}
      <div className={cn("items-center justify-center gap-2", compact ? "flex" : "flex sm:hidden")}>
        {renderNavControl("prev")}
        <span
          className={cn(
            "h-8 px-3 inline-flex items-center justify-center rounded-lg border text-xs font-mono font-semibold tabular-nums whitespace-nowrap select-none",
            isDark
              ? "bg-white/[0.03] border-white/[0.08] text-zinc-300"
              : "bg-white border-slate-200 text-slate-700 shadow-2xs"
          )}
        >
          Page <span className={cn("mx-1 font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{currentPage}</span> / {totalPages}
        </span>
        {renderNavControl("next")}
      </div>

      {/* Desktop View */}
      {!compact && (
        <div className="hidden sm:flex items-center justify-center gap-1.5 flex-nowrap">
          {renderNavControl("prev")}

          <div className="flex items-center gap-1 flex-nowrap">
            {items.map((item) => {
              if (item === "ellipsis-left" || item === "ellipsis-right") {
                return (
                  <span
                    key={item}
                    className={cn(
                      "w-6 h-8 flex items-center justify-center text-xs font-mono select-none shrink-0",
                      isDark ? "text-zinc-500" : "text-slate-400"
                    )}
                  >
                    ...
                  </span>
                );
              }

              const page = item;
              const isActive = page === currentPage;
              const pageClass = cn(
                "min-w-8 h-8 px-2 shrink-0 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer flex items-center justify-center",
                isActive
                  ? "bg-cyan-400 border-cyan-400 text-slate-950 font-black shadow-xs ring-1 ring-cyan-300/40"
                  : isDark
                    ? "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
              );

              return baseUrl ? (
                <Link
                  key={page}
                  href={`${baseUrl}?page=${page}`}
                  className={pageClass}
                  aria-current={isActive ? "page" : undefined}
                >
                  {page}
                </Link>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange && onPageChange(page)}
                  className={pageClass}
                  aria-current={isActive ? "page" : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {renderNavControl("next")}
        </div>
      )}
    </nav>
  );
}
