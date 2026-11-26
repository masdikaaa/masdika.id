import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlowCtaOrnaments() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-[0.14] blur-[100px]"
        style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
      />
    </>
  );
}

export function GlowCtaCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-[var(--surface)] p-8 sm:p-12 shadow-sm",
        className
      )}
    >
      <GlowCtaOrnaments />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
