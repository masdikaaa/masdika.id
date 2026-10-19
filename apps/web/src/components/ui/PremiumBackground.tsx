"use client";

/**
 * Atmospheric background using pure radial-gradient overlays and
 * subtle architectural grid lines matching the VELIXS dark mode aesthetic.
 * Clean, high-contrast, zero-cyan atmospheric depth with near-zero GPU overhead.
 */
export function PremiumBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-[#f8fafd] dark:bg-[#000000] transition-colors duration-700"
    >


      {/* ── LIGHT MODE GRADIENT SYSTEM (Pure Unified Brand Cyan & Sky) ─── */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-100 dark:opacity-0">
        {/* Soft, clean Cyan aura on hero / top-right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 80% 12%, rgba(6,182,212,0.14) 0%, rgba(6,182,212,0.04) 45%, transparent 70%)",
          }}
        />

        {/* Hero Center-Right Aura: Cyan blur behind avatar */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 50% at 72% 38%, rgba(6,182,212,0.12) 0%, transparent 68%)",
          }}
        />

        {/* Secondary Ambient Aura: Middle-Left depth behind headline */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 15% 35%, rgba(6,182,212,0.10) 0%, transparent 65%)",
          }}
        />

        {/* Tertiary Soft Horizon Glow: Lower Page Bloom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 80% 75%, rgba(6,182,212,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Top Organic Light Wash Overlay */}
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(6,182,212,0.06),transparent)]"
        />
      </div>

      {/* ── DARK MODE GRADIENT SYSTEM (Identik Konsisten dengan Light Mode) ─── */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-0 dark:opacity-100">
        {/* Primary Ambient Aura: Top-Right Cyan Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.06) 45%, transparent 75%)",
          }}
        />

        {/* Hero Center-Right Aura: Cyan blur behind avatar */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 50% at 72% 38%, rgba(6,182,212,0.16) 0%, transparent 68%)",
          }}
        />

        {/* Secondary Ambient Aura: Middle-Left depth behind headline */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 15% 35%, rgba(6,182,212,0.12) 0%, transparent 65%)",
          }}
        />

        {/* Tertiary Soft Horizon Glow: Lower Page Bloom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 80% 75%, rgba(6,182,212,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Top Organic Light Wash Overlay */}
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_45%_at_50%_0%,rgba(6,182,212,0.09),transparent)]"
        />
      </div>
    </div>
  );
}
