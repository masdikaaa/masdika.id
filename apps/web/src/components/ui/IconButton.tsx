"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type IconButtonVariant = "default" | "outline" | "ghost";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  icon: React.ReactNode;
  "aria-label": string;
  className?: string;
}

const variantStyles: Record<IconButtonVariant, string> = {
  default:
    "border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:border-cyan-500/30 hover:bg-[var(--surface)]",
  outline:
    "border border-[var(--border-primary)] bg-transparent text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-[var(--surface-secondary)]",
  ghost:
    "border border-transparent bg-transparent text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:bg-[var(--surface-secondary)]",
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "w-8 h-8 text-sm rounded-lg",
  md: "w-10 h-10 text-base rounded-lg",
  lg: "w-12 h-12 text-lg rounded-xl",
};

/**
 * Shared IconButton primitive complying with Section 8.4:
 * - Minimum accessible interactive target
 * - Consistent stroke and sizing
 * - Visible focus ring (cyan)
 * - Required aria-label
 * - Cyan icon color in dark mode (never plain white)
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = "default",
      size = "md",
      icon,
      "aria-label": ariaLabel,
      className,
      disabled = false,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center shrink-0 transition-colors duration-150 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          "active:scale-95",
          "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        <span className="shrink-0 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
          {icon}
        </span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
