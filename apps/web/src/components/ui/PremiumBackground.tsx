"use client";


/**
 * Atmospheric background using pure radial-gradient overlays instead of
 * massive blur() filters. The blur-[140px] + 850px div approach was causing
 * the browser to composite enormous offscreen layers — extremely expensive
 * on GPU memory (100-300MB per blur layer). Radial gradients achieve the
 * same soft-glow effect at near-zero GPU cost.
 */
export function PremiumBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-[#f8fafd] dark:bg-[#030712] transition-colors duration-700"
    >
      {/* ── LIGHT MODE GRADIENT SYSTEM (Matches Gambar 1) ────────── */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-100 dark:opacity-0">
        {/* Primary Ambient Aura: Top-Right Violet/Purple Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 85% 10%, rgba(139,92,246,0.20) 0%, rgba(168,85,247,0.14) 35%, rgba(56,189,248,0.06) 60%, transparent 75%)",
          }}
        />

        {/* Hero Center-Right Aura: The signature Sky-Blue / Cyan blur behind avatar */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 50% at 72% 38%, rgba(56,189,248,0.18) 0%, rgba(6,182,212,0.10) 40%, transparent 68%)",
          }}
        />

        {/* Secondary Ambient Aura: Middle-Left depth behind headline */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 15% 35%, rgba(56,189,248,0.14) 0%, rgba(99,102,241,0.07) 45%, transparent 68%)",
          }}
        />

        {/* Tertiary Soft Horizon Glow: Lower Page Bloom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 80% 75%, rgba(168,85,247,0.10) 0%, rgba(6,182,212,0.06) 45%, transparent 70%)",
          }}
        />

        {/* Top Organic Light Wash Overlay */}
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_70%_at_50%_-15%,rgba(168,85,247,0.06),transparent)]"
        />
      </div>

      {/* ── DARK MODE GRADIENT SYSTEM (Identically Consistent with Gambar 1) ─ */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-0 dark:opacity-100">
        {/* Primary Ambient Aura: Top-Right Violet/Purple Glow (Rich & Elegant) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 75% 65% at 85% 10%, rgba(147,51,234,0.34) 0%, rgba(139,92,246,0.24) 35%, rgba(99,102,241,0.12) 60%, transparent 75%)",
          }}
        />

        {/* Hero Center-Right Aura: The signature Sky-Blue / Electric Cyan blur behind avatar */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 72% 38%, rgba(0,236,254,0.26) 0%, rgba(42,132,253,0.22) 35%, rgba(6,182,212,0.12) 55%, transparent 72%)",
          }}
        />

        {/* Secondary Ambient Aura: Middle-Left depth behind headline */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 15% 35%, rgba(42,132,253,0.18) 0%, rgba(6,182,212,0.10) 40%, transparent 65%)",
          }}
        />

        {/* Tertiary Soft Horizon Glow: Lower Page Bloom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 80% 75%, rgba(168,85,247,0.16) 0%, rgba(6,182,212,0.10) 45%, transparent 70%)",
          }}
        />

        {/* Top Organic Light Wash Overlay */}
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_70%_at_50%_-15%,rgba(147,51,234,0.12),transparent)]"
        />
      </div>
    </div>
  );
}
