"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Atmospheric background replacing boilerplate grid lines with
 * soft, modern, diffused ambient blooms inspired by the reference design.
 * Features ultra-smooth gradient diffusion without harsh lines or AI-slop grids.
 */
export function PremiumBackground() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 overflow-hidden pointer-events-none z-[-1] transition-colors duration-700",
        isDark ? "bg-[#050811]" : "bg-[#f8fafd]"
      )}
    >
      {/* Primary Ambient Aura (Top Right) */}
      <div
        className={cn(
          "absolute -top-32 -right-24 sm:-top-48 sm:-right-32 w-[550px] h-[550px] sm:w-[850px] sm:h-[850px] rounded-full transition-all duration-700 pointer-events-none transform-gpu",
          isDark
            ? "bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-transparent blur-[140px]"
            : "bg-gradient-to-br from-violet-300/40 via-sky-200/40 to-cyan-100/30 blur-[130px]"
        )}
      />

      {/* Secondary Ambient Aura (Middle / Left) */}
      <div
        className={cn(
          "absolute top-[28%] -left-36 sm:-left-48 w-[450px] h-[450px] sm:w-[750px] sm:h-[750px] rounded-full transition-all duration-700 pointer-events-none transform-gpu",
          isDark
            ? "bg-gradient-to-tr from-cyan-600/10 via-indigo-900/15 to-transparent blur-[150px]"
            : "bg-gradient-to-tr from-sky-200/40 via-indigo-100/35 to-transparent blur-[130px]"
        )}
      />

      {/* Tertiary Soft Horizon Glow (Lower Page Bloom) */}
      <div
        className={cn(
          "absolute top-[68%] -right-20 sm:-right-32 w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] rounded-full transition-all duration-700 pointer-events-none transform-gpu",
          isDark
            ? "bg-gradient-to-tl from-cyan-500/10 via-blue-950/20 to-transparent blur-[160px]"
            : "bg-gradient-to-tl from-purple-200/30 via-cyan-100/25 to-transparent blur-[140px]"
        )}
      />

      {/* Subtle organic light wash overlay for seamless depth blending */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          isDark
            ? "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.08),transparent)]"
            : "bg-[radial-gradient(ellipse_80%_80%_at_50%_-15%,rgba(168,85,247,0.06),transparent)]"
        )}
      />
    </div>
  );
}
