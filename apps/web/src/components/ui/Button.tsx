"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  target?: string;
  rel?: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
  secondary:
    "border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] hover:border-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] font-medium",
  tertiary:
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] focus-visible:ring-2 focus-visible:ring-cyan-500 font-medium",
  ghost:
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] focus-visible:ring-2 focus-visible:ring-cyan-500 font-medium",
  destructive:
    "bg-red-600 hover:bg-red-500 text-white font-semibold focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
  link:
    "text-cyan-600 dark:text-cyan-400 hover:underline p-0 h-auto font-medium focus-visible:ring-1 focus-visible:ring-cyan-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-lg gap-2",
  lg: "px-7 py-3.5 text-base rounded-lg gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      href,
      target,
      rel,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isLinkVariant = variant === "link";
    const baseClasses = cn(
      "inline-flex items-center justify-center font-medium transition-all duration-200 select-none",
      "focus-visible:outline-none",
      "active:scale-[0.98]",
      "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
      variantStyles[variant],
      !isLinkVariant && sizeStyles[size],
      className
    );

    const iconColorClass =
      variant === "primary"
        ? "text-slate-950"
        : variant === "destructive"
          ? "text-white"
          : "text-cyan-600 dark:text-cyan-400";

    const content = (
      <>
        {loading && <Loader2 className={cn("w-4 h-4 animate-spin shrink-0", iconColorClass)} aria-hidden="true" />}
        {!loading && leftIcon && <span className={cn("shrink-0 flex items-center justify-center", iconColorClass)}>{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span className={cn("shrink-0 flex items-center justify-center", iconColorClass)}>{rightIcon}</span>}
      </>
    );

    if (href && !disabled) {
      return (
        <Link
          href={href}
          target={target}
          rel={rel}
          className={baseClasses}
          ref={ref as React.Ref<HTMLAnchorElement>}
          aria-disabled={disabled}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        className={baseClasses}
        aria-busy={loading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
