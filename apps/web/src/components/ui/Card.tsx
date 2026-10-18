"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string;
  isInteractive?: boolean;
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ href, isInteractive = false, className, children, ...props }, ref) => {
    const baseClasses = cn(
      "rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] transition-all duration-200",
      (isInteractive || href) && [
        "hover:border-cyan-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
        "cursor-pointer",
      ],
      className
    );

    if (href) {
      return (
        <Link href={href} className={cn("block group h-full", baseClasses)}>
          {children}
        </Link>
      );
    }

    return (
      <div ref={ref} className={baseClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 pb-3 flex flex-col gap-1.5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 pt-0 flex-1", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 pt-0 flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}
