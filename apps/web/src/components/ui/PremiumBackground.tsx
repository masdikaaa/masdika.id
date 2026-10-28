"use client";

import { cn } from "@/lib/utils";

export type OrnamentVariant =
  | "hero"
  | "sides"
  | "diagonal"
  | "center"
  | "center-wide"
  | "bottom-left"
  | "right-focus"
  | "cta"
  | "panel";

const DOT_COORDS = [
  [2, 2],
  [14, 2],
  [26, 2],
  [38, 2],
  [2, 14],
  [14, 14],
  [26, 14],
  [38, 14],
  [2, 26],
  [14, 26],
  [26, 26],
  [38, 26],
] as const;

function DotGridPattern({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 select-none opacity-35 dark:opacity-20",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(rgba(100, 116, 139, 0.4) 1.2px, transparent 1.2px)",
        backgroundSize: "28px 28px",
      }}
    />
  );
}

/**
 * Architectural solid cyan diamond badges (matching SMK Telkom Malang layout).
 * Uses exact responsive coordinates and sizes matching the reference.
 */
function DiamondOrnament({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute select-none flex items-center justify-center",
        className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="w-full h-full bg-cyan-500 dark:bg-cyan-400 rounded-[5px] rotate-45 shadow-md shadow-cyan-500/35 dark:shadow-cyan-400/30" />
    </div>
  );
}

/**
 * Architectural dot matrix clusters (slate & accent).
 */
function DotMatrixOrnament({
  tone = "slate",
  className,
}: {
  tone?: "slate" | "accent";
  className?: string;
}) {
  const fill = tone === "accent" ? "#06B6D4" : "#64748B";
  const fillOpacity = tone === "accent" ? 0.75 : 0.45;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute select-none",
        className
      )}
      style={{ width: "40px", height: "28px" }}
    >
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
        {DOT_COORDS.map(([cx, cy], idx) => (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r="2"
            fill={fill}
            fillOpacity={fillOpacity}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Crosshair plus (+) markers.
 */
function PlusOrnament({
  tone = "accent",
  className,
}: {
  tone?: "slate" | "accent";
  className?: string;
}) {
  const stroke = tone === "accent" ? "#06B6D4" : "#64748B";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute select-none flex items-center justify-center",
        className
      )}
      style={{ width: "16px", height: "16px" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2V14M2 8H14"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.65"
        />
      </svg>
    </div>
  );
}

const RING_NEUTRAL_DASHED =
  "rounded-full border border-dashed border-neutral-300/80 dark:border-zinc-700/60";
const RING_NEUTRAL_SOLID =
  "rounded-full border border-neutral-200/90 dark:border-zinc-800/80";
const RING_ACCENT_SOLID =
  "rounded-full border border-cyan-500/25 dark:border-cyan-400/20";
const RING_ACCENT_DASHED =
  "rounded-full border border-dashed border-cyan-500/25 dark:border-cyan-400/20";

/**
 * Architectural section background ornaments.
 * 100% faithful to the SMK Telkom Malang design system from top to bottom.
 */
export function SectionOrnaments({
  variant = "sides",
  withDotGrid = true,
  className,
}: {
  variant?: OrnamentVariant;
  withDotGrid?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 select-none z-0 overflow-hidden",
        className
      )}
    >
      {withDotGrid && <DotGridPattern />}

      {/* ── 1. HERO VARIANT (Matching SMK Telkom Malang Sec 2) ── */}
      {variant === "hero" && (
        <>
          <div
            className={cn(
              "absolute -top-[12%] left-[10%] w-[960px] h-[960px]",
              RING_NEUTRAL_DASHED
            )}
          />

          <DiamondOrnament size={20} className="top-8 left-8 sm:left-20" />
          <DiamondOrnament size={14} className="top-24 left-1/4 hidden md:flex" />
          <DiamondOrnament size={18} className="top-12 right-10 sm:right-24" />
          <DiamondOrnament size={16} className="bottom-24 left-10 sm:left-24" />
          <DiamondOrnament size={20} className="bottom-14 right-12 sm:right-28" />

          <DotMatrixOrnament tone="slate" className="bottom-28 left-14 sm:left-32" />
          <DotMatrixOrnament tone="accent" className="bottom-20 right-14 sm:right-36" />

          <PlusOrnament tone="accent" className="top-6 left-1/3" />
          <PlusOrnament tone="slate" className="bottom-8 right-1/3" />
        </>
      )}

      {/* ── 2. SIDES VARIANT (Matching SMK Telkom Malang Sec 4 & 10) ── */}
      {variant === "sides" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 -left-[260px] -translate-y-1/2 w-[760px] h-[760px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 -left-[180px] -translate-y-1/2 w-[580px] h-[580px]",
              RING_ACCENT_SOLID
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 -right-[260px] -translate-y-1/2 w-[760px] h-[760px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 -right-[180px] -translate-y-1/2 w-[580px] h-[580px]",
              RING_ACCENT_SOLID
            )}
          />

          <DiamondOrnament size={20} className="top-10 left-6 sm:left-16" />
          <DiamondOrnament size={14} className="top-12 left-1/3 hidden lg:flex" />
          <DiamondOrnament size={20} className="top-10 right-6 sm:right-16" />
          <DiamondOrnament size={16} className="bottom-10 left-8 sm:left-20" />
          <DiamondOrnament size={18} className="bottom-10 right-8 sm:right-20" />

          <DotMatrixOrnament tone="slate" className="bottom-16 left-12 sm:left-28" />
          <DotMatrixOrnament tone="accent" className="bottom-16 right-12 sm:right-28" />

          <PlusOrnament tone="accent" className="top-20 left-1/4" />
          <PlusOrnament tone="slate" className="top-20 right-1/4" />
        </>
      )}

      {/* ── 3. DIAGONAL VARIANT (Matching SMK Telkom Malang Sec 5) ── */}
      {variant === "diagonal" && (
        <>
          <div
            className={cn(
              "absolute top-[4%] right-[-160px] w-[820px] h-[820px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-[8%] right-[-80px] w-[620px] h-[620px]",
              RING_ACCENT_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-[40%] left-[-180px] w-[860px] h-[860px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-[44%] left-[-100px] w-[660px] h-[660px]",
              RING_ACCENT_DASHED
            )}
          />

          <DiamondOrnament size={22} className="top-12 right-8 sm:right-20" />
          <DiamondOrnament size={16} className="top-[18%] left-6 sm:left-16" />
          <DiamondOrnament size={18} className="top-[45%] right-8 sm:right-20" />
          <DiamondOrnament size={16} className="top-[54%] left-6 sm:left-16" />
          <DiamondOrnament size={20} className="bottom-20 right-8 sm:right-20" />
          <DiamondOrnament size={14} className="bottom-28 left-8 sm:left-20" />

          <DotMatrixOrnament tone="slate" className="top-[24%] left-8 sm:left-24" />
          <DotMatrixOrnament tone="accent" className="top-[58%] left-8 sm:left-24" />

          <PlusOrnament tone="accent" className="top-[35%] right-1/4" />
          <PlusOrnament tone="slate" className="top-[70%] left-1/4" />
        </>
      )}

      {/* ── 4. CENTER VARIANT (Matching SMK Telkom Malang Sec 6) ── */}
      {variant === "center" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] sm:w-[1300px] h-[900px] sm:h-[1300px]",
              "rounded-full border border-dashed border-neutral-300/75 dark:border-zinc-700/60"
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[1050px] h-[700px] sm:h-[1050px]",
              RING_ACCENT_SOLID
            )}
          />

          <DiamondOrnament size={20} className="top-8 left-8 sm:left-20" />
          <DiamondOrnament size={18} className="top-8 right-8 sm:right-20" />
          <DiamondOrnament size={16} className="bottom-8 left-10 sm:left-24" />
          <DiamondOrnament size={18} className="bottom-8 right-10 sm:right-24" />

          <DotMatrixOrnament tone="slate" className="bottom-12 right-14 sm:right-32" />
          <DotMatrixOrnament tone="accent" className="bottom-12 left-14 sm:left-32" />
        </>
      )}

      {/* ── 5. CENTER-WIDE VARIANT (Matching SMK Telkom Malang Sec 7) ── */}
      {variant === "center-wide" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1050px] sm:w-[1450px] h-[1050px] sm:h-[1450px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] sm:w-[1100px] h-[750px] sm:h-[1100px]",
              RING_ACCENT_DASHED
            )}
          />

          <DiamondOrnament size={22} className="top-12 left-8 sm:left-20" />
          <DiamondOrnament size={20} className="top-12 right-8 sm:right-20" />
          <DiamondOrnament size={14} className="top-6 left-1/3 hidden lg:flex" />
          <DiamondOrnament size={16} className="bottom-12 left-10 sm:left-24" />
          <DiamondOrnament size={18} className="bottom-12 right-10 sm:right-24" />

          <DotMatrixOrnament tone="slate" className="bottom-16 left-14 sm:left-32" />
          <DotMatrixOrnament tone="accent" className="bottom-16 right-14 sm:right-32" />

          <PlusOrnament tone="accent" className="top-8 left-1/4" />
          <PlusOrnament tone="slate" className="top-8 right-1/4" />
        </>
      )}

      {/* ── 6. BOTTOM-LEFT VARIANT (Matching SMK Telkom Malang Sec 8) ── */}
      {variant === "bottom-left" && (
        <>
          <div
            className={cn(
              "absolute -bottom-[80px] left-[6%] w-[800px] h-[800px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute -bottom-[20px] left-[10%] w-[620px] h-[620px]",
              RING_ACCENT_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-[6%] right-[-8%] w-[620px] h-[620px]",
              "rounded-full border border-dashed border-neutral-300/70 dark:border-zinc-700/60"
            )}
          />

          <DiamondOrnament size={22} className="top-10 left-6 sm:left-14" />
          <DiamondOrnament size={18} className="top-10 right-8 sm:right-20" />
          <DiamondOrnament size={16} className="bottom-10 left-8 sm:left-16" />
          <DiamondOrnament size={20} className="bottom-10 right-8 sm:right-20" />

          <DotMatrixOrnament tone="slate" className="bottom-14 left-10 sm:left-20" />
          <DotMatrixOrnament tone="accent" className="bottom-14 right-12 sm:right-24" />

          <PlusOrnament tone="accent" className="top-6 right-1/3" />
        </>
      )}

      {/* ── 7. RIGHT-FOCUS VARIANT (Matching SMK Telkom Malang Sec 9) ── */}
      {variant === "right-focus" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 -right-[220px] -translate-y-1/2 w-[800px] h-[800px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 -right-[140px] -translate-y-1/2 w-[620px] h-[620px]",
              RING_ACCENT_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/4 -left-[200px] w-[680px] h-[680px]",
              "rounded-full border border-dashed border-neutral-300/70 dark:border-zinc-700/60"
            )}
          />

          <DiamondOrnament size={20} className="top-10 left-8 sm:left-18" />
          <DiamondOrnament size={20} className="top-10 right-8 sm:right-20" />
          <DiamondOrnament size={16} className="bottom-12 left-8 sm:left-18" />
          <DiamondOrnament size={18} className="bottom-12 right-8 sm:right-20" />

          <DotMatrixOrnament tone="slate" className="top-18 left-10 sm:left-22" />
          <DotMatrixOrnament tone="accent" className="bottom-16 right-10 sm:right-24" />

          <PlusOrnament tone="accent" className="top-8 left-1/3" />
        </>
      )}

      {/* ── 8. CTA VARIANT (Matching SMK Telkom Malang Sec 11) ── */}
      {variant === "cta" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] sm:w-[1500px] h-[1100px] sm:h-[1500px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] sm:w-[1150px] h-[800px] sm:h-[1150px]",
              RING_ACCENT_DASHED
            )}
          />

          <DiamondOrnament size={22} className="top-12 left-10 sm:left-20" />
          <DiamondOrnament size={22} className="top-12 right-10 sm:right-20" />
          <DiamondOrnament size={16} className="top-24 left-1/3 hidden lg:flex" />
          <DiamondOrnament size={16} className="top-24 right-1/3 hidden lg:flex" />
          <DiamondOrnament size={18} className="bottom-16 left-10 sm:left-20" />
          <DiamondOrnament size={18} className="bottom-16 right-10 sm:right-20" />

          <DotMatrixOrnament tone="slate" className="bottom-24 left-12 sm:left-24" />
          <DotMatrixOrnament tone="accent" className="bottom-24 right-12 sm:right-24" />

          <PlusOrnament tone="accent" className="top-6 left-1/3" />
          <PlusOrnament tone="slate" className="top-6 right-1/3" />
        </>
      )}

      {/* ── 9. PANEL VARIANT ── */}
      {variant === "panel" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[330px] h-[330px]",
              RING_ACCENT_SOLID
            )}
          />
          <DiamondOrnament size={16} className="top-10 left-6" />
          <DiamondOrnament size={16} className="top-12 right-6" />
          <DiamondOrnament size={14} className="bottom-20 left-6" />
          <DiamondOrnament size={14} className="bottom-20 right-6" />
          <DotMatrixOrnament tone="slate" className="top-28 left-6" />
          <DotMatrixOrnament tone="accent" className="bottom-28 right-6" />
        </>
      )}
    </div>
  );
}

/**
 * Architectural Hero Ornaments precisely aligned with the Hero subject (mascot/avatar),
 * matching the SMK Telkom Malang hero image container layout:
 * - Concentric circles centered behind the subject
 * - Circular node anchor dots
 */
export function HeroOrnaments({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 select-none flex items-center justify-center z-0 overflow-visible",
        className
      )}
      style={{
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 72%)",
        WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 72%)"
      }}
    >
      {/* 1. Large Neutral Ring behind subject (85% of hero height) */}
      <div
        className={cn(
          "pointer-events-none absolute rounded-full border border-neutral-200/80 dark:border-zinc-800/80 bg-transparent z-0",
          "w-[340px] sm:w-[440px] md:w-[500px] lg:w-[540px] xl:w-[600px] h-[340px] sm:h-[440px] md:h-[500px] lg:h-[540px] xl:h-[600px]",
          "left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2"
        )}
      />

      {/* 2. Middle Accent Ring behind subject (52.5% of hero height) */}
      <div
        className={cn(
          "pointer-events-none absolute rounded-full border border-cyan-500/25 dark:border-cyan-400/20 bg-transparent z-0",
          "w-[260px] sm:w-[330px] md:w-[380px] lg:w-[420px] xl:w-[460px] h-[260px] sm:h-[330px] md:h-[380px] lg:h-[420px] xl:h-[460px]",
          "left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2"
        )}
      />

      {/* 3. Small Dashed Ring behind subject (32.5% of hero height) */}
      <div
        className={cn(
          "pointer-events-none absolute rounded-full border border-dashed border-neutral-300/85 dark:border-zinc-700/60 bg-transparent z-0",
          "w-[180px] sm:w-[220px] md:w-[250px] lg:w-[280px] xl:w-[300px] h-[180px] sm:h-[220px] md:h-[250px] lg:h-[280px] xl:h-[300px]",
          "left-[38%] top-[35%] -translate-x-1/2 -translate-y-1/2"
        )}
      />
    </div>
  );
}

const PAGE_ORNAMENT_BANDS: OrnamentVariant[] = [
  "hero",
  "sides",
  "diagonal",
  "center-wide",
  "right-focus",
  "bottom-left",
  "cta",
];

/**
 * Scrolling page-level architectural ornaments for subpages.
 * Rendered strictly behind content (`z-0`) so no elements are obscured.
 */
export function PageOrnaments() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-24 md:top-32 bottom-0 overflow-hidden select-none -z-10"
    >
      <DotGridPattern />
      <div className="flex flex-col w-full">
        {PAGE_ORNAMENT_BANDS.map((variant, idx) => (
          <div key={idx} className="relative w-full h-[850px] shrink-0">
            <SectionOrnaments variant={variant} withDotGrid={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Base canvas background.
 * Kept purely solid so no rings or dots stay frozen (`fixed`) in the viewport when scrolling.
 */
export function PremiumBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none -z-20 bg-[#f8fafb] dark:bg-[#000000] transition-colors duration-700"
    />
  );
}
