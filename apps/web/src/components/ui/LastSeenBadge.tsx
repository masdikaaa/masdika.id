"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatLastSeen } from "@/lib/last-seen";

interface LastSeenBadgeProps {
  date?: string | Date | null;
  isDark?: boolean;
  className?: string;
  showSubtext?: boolean;
}

export function LastSeenBadge({
  date,
  isDark = true,
  className,
  showSubtext = false,
}: LastSeenBadgeProps) {
  const info = formatLastSeen(date);

  if (info.isOnline) {
    return (
      <span
        title={info.fullText}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all select-none",
          isDark
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            : "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs",
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Online</span>
      </span>
    );
  }

  if (info.label === "Never") {
    return (
      <span
        title={info.fullText}
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium italic select-none",
          isDark ? "text-zinc-500 bg-white/[0.02]" : "text-slate-400 bg-slate-100/50",
          className
        )}
      >
        Never
      </span>
    );
  }

  return (
    <div
      title={info.fullText}
      className={cn("inline-flex flex-col items-center justify-center cursor-default select-none", className)}
    >
      <span
        className={cn(
          "text-xs font-medium whitespace-nowrap",
          isDark ? "text-zinc-200" : "text-slate-800"
        )}
      >
        {info.label}
      </span>
      {(showSubtext || info.dateFormatted) && (
        <span
          className={cn(
            "text-[10px] font-mono leading-tight whitespace-nowrap opacity-75 mt-0.5",
            isDark ? "text-zinc-400" : "text-slate-500"
          )}
        >
          {info.dateFormatted?.split(",")[0]}
        </span>
      )}
    </div>
  );
}

