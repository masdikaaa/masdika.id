"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Atmospheric background using pure radial-gradient overlays instead of
 * massive blur() filters. The blur-[140px] + 850px div approach was causing
 * the browser to composite enormous offscreen layers — extremely expensive
 * on GPU memory (100-300MB per blur layer). Radial gradients achieve the
 * same soft-glow effect at near-zero GPU cost.
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
      {/* Primary Ambient Aura (Top Right) — radial gradient instead of blur */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 70% 60% at 85% 10%, rgba(6,182,212,0.15) 0%, rgba(37,99,235,0.08) 40%, transparent 70%)"
            : "radial-gradient(ellipse 70% 60% at 85% 10%, rgba(139,92,246,0.18) 0%, rgba(56,189,248,0.12) 40%, rgba(6,182,212,0.06) 60%, transparent 75%)",
        }}
      />

      {/* Secondary Ambient Aura (Middle / Left) — radial gradient instead of blur */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 60% 50% at 10% 40%, rgba(6,182,212,0.10) 0%, rgba(67,56,202,0.08) 45%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 10% 40%, rgba(56,189,248,0.15) 0%, rgba(99,102,241,0.08) 45%, transparent 70%)",
        }}
      />

      {/* Tertiary Soft Horizon Glow (Lower Page Bloom) — radial gradient instead of blur */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 65% 50% at 80% 75%, rgba(6,182,212,0.08) 0%, rgba(30,58,138,0.10) 45%, transparent 70%)"
            : "radial-gradient(ellipse 65% 50% at 80% 75%, rgba(168,85,247,0.10) 0%, rgba(6,182,212,0.06) 45%, transparent 70%)",
        }}
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
