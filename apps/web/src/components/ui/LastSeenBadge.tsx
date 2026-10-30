"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatLastSeen } from "@/lib/last-seen";

interface LastSeenBadgeProps {
  date?: string | Date | null;
  isDark?: boolean;
  className?: string;
  showSubtext?: boolean;
  variant?: "pill" | "inline";
  align?: "left" | "center" | "right";
}

export function LastSeenBadge({
  date,
  isDark = true,
  className,
  showSubtext = false,
  variant = "pill",
  align,
}: LastSeenBadgeProps) {
  const info = formatLastSeen(date);

  // Default alignment: left if showing subtext, center if standalone pill
  const resolvedAlign = align || (showSubtext ? "left" : "center");
  const alignClass =
    resolvedAlign === "left"
      ? "items-start text-left"
      : resolvedAlign === "right"
      ? "items-end text-right"
      : "items-center text-center";

  // INLINE VARIANT: ideal for headers beside email or compact list rows
  if (variant === "inline") {
    if (info.isOnline) {
      return (
        <span
          title={info.fullText}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 select-none",
            className
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Online</span>
        </span>
      );
    }

    const inlineLabel =
      info.label.toLowerCase() === "never"
        ? "never"
        : info.label.toLowerCase() === "yesterday"
        ? "yesterday"
        : info.label;

    return (
      <span
        title={info.fullText}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium select-none cursor-default",
          isDark ? "text-zinc-400" : "text-slate-500",
          className
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            isDark ? "bg-zinc-500" : "bg-slate-400"
          )}
        />
        <span>Last seen {inlineLabel}</span>
      </span>
    );
  }

  // PILL VARIANT (Default): structured status badge matching WHMCS/Admin status badges
  if (info.isOnline) {
    return (
      <div
        title={info.fullText}
        className={cn("inline-flex flex-col select-none cursor-default", alignClass, className)}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition-all",
            isDark
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs"
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Online</span>
        </span>
        {showSubtext && (
          <span
            className={cn(
              "text-[11px] font-medium mt-1 leading-tight",
              isDark ? "text-emerald-400/80" : "text-emerald-600"
            )}
          >
            Active right now
          </span>
        )}
      </div>
    );
  }

  if (info.label === "Never") {
    return (
      <div
        title={info.fullText}
        className={cn("inline-flex flex-col select-none cursor-default", alignClass, className)}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
            isDark
              ? "bg-zinc-900/60 border-zinc-800 text-zinc-500"
              : "bg-slate-100/70 border-slate-200 text-slate-400"
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full shrink-0", isDark ? "bg-zinc-600" : "bg-slate-400")}
          />
          <span className="italic">Never</span>
        </span>
        {showSubtext && (
          <span
            className={cn(
              "text-[11px] mt-1 italic leading-tight",
              isDark ? "text-zinc-500" : "text-slate-400"
            )}
          >
            No activity recorded
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      title={info.fullText}
      className={cn("inline-flex flex-col select-none cursor-default", alignClass, className)}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all",
          isDark
            ? "bg-slate-900/80 border-slate-800 text-zinc-300 shadow-xs"
            : "bg-slate-100 border-slate-200 text-slate-700 shadow-2xs"
        )}
      >
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", isDark ? "bg-zinc-400" : "bg-slate-400")}
        />
        <span>{info.label}</span>
      </span>
      {showSubtext && info.dateFormatted && (
        <span
          className={cn(
            "text-[11px] font-mono mt-1 leading-tight tracking-tight",
            isDark ? "text-zinc-400" : "text-slate-500"
          )}
        >
          {info.dateFormatted}
        </span>
      )}
    </div>
  );
}
