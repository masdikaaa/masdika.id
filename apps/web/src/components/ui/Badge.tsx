"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "brand";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral:
    "border border-[var(--border-primary)] bg-white dark:bg-[#0c121e] text-[var(--text-secondary)] shadow-xs",
  success:
    "border border-emerald-500/30 bg-white dark:bg-[#0c121e] text-emerald-700 dark:text-emerald-400 shadow-xs",
  warning:
    "border border-amber-500/30 bg-white dark:bg-[#0c121e] text-amber-700 dark:text-amber-400 shadow-xs",
  danger:
    "border border-red-500/30 bg-white dark:bg-[#0c121e] text-red-700 dark:text-red-400 shadow-xs",
  brand:
    "border border-cyan-500/40 bg-white dark:bg-[#0a101d] text-cyan-700 dark:text-cyan-400 shadow-xs",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  dotColor,
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full tracking-wide select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              dotColor || (variant === "success" ? "bg-emerald-400" : "bg-current")
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-1.5 w-1.5",
              dotColor || (variant === "success" ? "bg-emerald-500" : "bg-current")
            )}
          />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
