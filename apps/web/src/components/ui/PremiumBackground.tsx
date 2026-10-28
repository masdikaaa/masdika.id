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
 * Architectural solid cyan diamond badges.
 * Hidden on extra small mobile to ensure zero overlap with mobile headers,
 * vibrant and glowing on desktop and tablet as designed.
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
        "pointer-events-none absolute select-none hidden sm:flex items-center justify-center",
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
        "pointer-events-none absolute select-none hidden sm:block",
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
        "pointer-events-none absolute select-none hidden sm:flex items-center justify-center",
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
  "rounded-full border border-cyan-500/30 dark:border-cyan-400/25";
const RING_ACCENT_DASHED =
  "rounded-full border border-dashed border-cyan-500/30 dark:border-cyan-400/25";

/**
 * Architectural section background ornaments:
 * - Subtle 28x28 radial dot-grid
 * - Concentric dashed neutral & solid accent circular lines (sm+ only, soft opacity)
 * - Translucent diamond outlines & dot matrices strictly on outer margins (xl only)
 * - Safe `-z-10` layer so it NEVER blocks or covers page content
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
        "pointer-events-none absolute inset-0 select-none -z-10 overflow-hidden",
        className
      )}
    >
      {withDotGrid && <DotGridPattern />}

      {variant === "hero" && (
        <>
          {/* Desktop Hero Rings (Framing the mascot & wide margins on desktop) */}
          <div className="hidden lg:block pointer-events-none">
            <div
              className={cn(
                "absolute -top-[12%] left-[10%] w-[960px] h-[960px]",
                RING_NEUTRAL_DASHED
              )}
            />
            <div
              className={cn(
                "absolute top-[16%] -right-[8%] w-[720px] h-[720px]",
                RING_ACCENT_DASHED
              )}
            />
            <div
              className={cn(
                "absolute top-[28%] -right-[4%] w-[520px] h-[520px]",
                RING_NEUTRAL_SOLID
              )}
            />
          </div>

          {/* Mobile & Tablet Hero Rings: Positioned at bottom behind mascot, 100% clear of text & buttons */}
          <div className="lg:hidden pointer-events-none">
            <div
              className={cn(
                "absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 w-[320px] sm:w-[460px] h-[320px] sm:h-[460px]",
                RING_ACCENT_DASHED
              )}
            />
            <div
              className={cn(
                "absolute bottom-0 sm:bottom-4 left-1/2 -translate-x-1/2 w-[420px] sm:w-[580px] h-[420px] sm:h-[580px]",
                RING_NEUTRAL_DASHED
              )}
            />
          </div>

          <DiamondOrnament size={20} className="top-12 left-10 sm:left-20" />
          <DiamondOrnament size={20} className="top-16 right-10 sm:right-24" />
          <DiamondOrnament size={16} className="bottom-20 left-12 sm:left-24" />
          <DiamondOrnament size={18} className="bottom-14 right-12 sm:right-28" />
          <DotMatrixOrnament tone="slate" className="top-24 left-16 sm:left-32" />
          <DotMatrixOrnament tone="accent" className="bottom-16 right-16 sm:right-32" />
          <PlusOrnament tone="accent" className="top-10 right-1/4" />
          <PlusOrnament tone="slate" className="bottom-28 left-1/4" />
        </>
      )}

      {variant === "sides" && (
        <>
          {/* Desktop side rings */}
          <div className="hidden md:block pointer-events-none">
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
          </div>

          {/* Mobile side rings: gently graze outer edge without cutting across cards */}
          <div className="md:hidden pointer-events-none">
            <div
              className={cn(
                "absolute top-1/2 -left-[160px] -translate-y-1/2 w-[220px] h-[220px]",
                RING_NEUTRAL_DASHED
              )}
            />
            <div
              className={cn(
                "absolute top-1/2 -right-[160px] -translate-y-1/2 w-[220px] h-[220px]",
                RING_ACCENT_SOLID
              )}
            />
          </div>

          <DiamondOrnament size={18} className="top-10 left-6 xl:left-12" />
          <DiamondOrnament size={18} className="top-10 right-6 xl:right-12" />
          <DiamondOrnament size={16} className="bottom-10 left-8 xl:left-16" />
          <DiamondOrnament size={16} className="bottom-10 right-8 xl:right-16" />
          <DotMatrixOrnament tone="slate" className="bottom-16 left-10 xl:left-20" />
          <DotMatrixOrnament tone="accent" className="bottom-16 right-10 xl:right-20" />
        </>
      )}

      {variant === "diagonal" && (
        <>
          <div className="hidden md:block pointer-events-none">
            <div
              className={cn(
                "absolute top-[4%] right-[-160px] w-[820px] h-[820px]",
                RING_NEUTRAL_DASHED
              )}
            />
            <div
              className={cn(
                "absolute top-[8%] right-[-80px] w-[620px] h-[620px]",
                RING_ACCENT_SOLID
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
                RING_ACCENT_SOLID
              )}
            />
          </div>
          <DiamondOrnament size={18} className="top-12 right-6 xl:right-12" />
          <DiamondOrnament size={16} className="top-[20%] left-6 xl:left-12" />
          <DiamondOrnament size={18} className="top-[45%] right-6 xl:right-12" />
          <DiamondOrnament size={16} className="bottom-20 right-6 xl:right-12" />
          <DotMatrixOrnament tone="slate" className="top-[24%] left-8 xl:left-16" />
          <DotMatrixOrnament tone="accent" className="bottom-24 left-8 xl:left-16" />
        </>
      )}

      {variant === "center" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[700px] md:w-[1000px] lg:w-[1300px] h-[340px] sm:h-[700px] md:h-[1000px] lg:h-[1300px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] sm:w-[520px] md:w-[750px] lg:w-[1050px] h-[240px] sm:h-[520px] md:h-[750px] lg:h-[1050px]",
              RING_ACCENT_SOLID
            )}
          />
          <DiamondOrnament size={18} className="top-8 left-6 xl:left-12" />
          <DiamondOrnament size={18} className="top-8 right-6 xl:right-12" />
          <DiamondOrnament size={16} className="bottom-8 left-8 xl:left-16" />
          <DiamondOrnament size={16} className="bottom-8 right-8 xl:right-16" />
          <DotMatrixOrnament tone="slate" className="bottom-12 right-10 xl:right-20" />
          <DotMatrixOrnament tone="accent" className="bottom-12 left-10 xl:left-20" />
        </>
      )}

      {variant === "center-wide" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] sm:w-[800px] md:w-[1100px] lg:w-[1450px] h-[360px] sm:h-[800px] md:h-[1100px] lg:h-[1450px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] sm:w-[600px] md:w-[850px] lg:w-[1100px] h-[260px] sm:h-[600px] md:h-[850px] lg:h-[1100px]",
              RING_ACCENT_SOLID
            )}
          />
          <DiamondOrnament size={18} className="top-12 left-6 xl:left-12" />
          <DiamondOrnament size={18} className="top-12 right-6 xl:right-12" />
          <DiamondOrnament size={16} className="bottom-12 left-8 xl:left-16" />
          <DiamondOrnament size={16} className="bottom-12 right-8 xl:right-16" />
          <DotMatrixOrnament tone="slate" className="bottom-16 left-10 xl:left-20" />
          <DotMatrixOrnament tone="accent" className="bottom-16 right-10 xl:right-20" />
        </>
      )}

      {variant === "bottom-left" && (
        <>
          <div className="hidden md:block pointer-events-none">
            <div
              className={cn(
                "absolute -bottom-[80px] left-[6%] w-[800px] h-[800px]",
                RING_NEUTRAL_DASHED
              )}
            />
            <div
              className={cn(
                "absolute -bottom-[20px] left-[10%] w-[620px] h-[620px]",
                RING_ACCENT_SOLID
              )}
            />
            <div
              className={cn(
                "absolute top-[6%] right-[-8%] w-[620px] h-[620px]",
                RING_NEUTRAL_DASHED
              )}
            />
          </div>
          <DiamondOrnament size={18} className="top-10 left-6 xl:left-12" />
          <DiamondOrnament size={18} className="top-10 right-6 xl:right-12" />
          <DiamondOrnament size={16} className="bottom-10 left-8 xl:left-16" />
          <DiamondOrnament size={16} className="bottom-10 right-8 xl:right-16" />
          <DotMatrixOrnament tone="slate" className="bottom-14 left-10 xl:left-20" />
          <DotMatrixOrnament tone="accent" className="bottom-14 right-10 xl:right-20" />
        </>
      )}

      {variant === "right-focus" && (
        <>
          <div className="hidden md:block pointer-events-none">
            <div
              className={cn(
                "absolute top-1/2 -right-[220px] -translate-y-1/2 w-[800px] h-[800px]",
                RING_NEUTRAL_DASHED
              )}
            />
            <div
              className={cn(
                "absolute top-1/2 -right-[140px] -translate-y-1/2 w-[620px] h-[620px]",
                RING_ACCENT_SOLID
              )}
            />
            <div
              className={cn(
                "absolute top-1/4 -left-[200px] w-[680px] h-[680px]",
                RING_NEUTRAL_DASHED
              )}
            />
          </div>
          <DiamondOrnament size={18} className="top-10 left-6 xl:left-12" />
          <DiamondOrnament size={18} className="top-10 right-6 xl:right-12" />
          <DiamondOrnament size={16} className="bottom-12 left-8 xl:left-16" />
          <DiamondOrnament size={16} className="bottom-12 right-8 xl:right-16" />
          <DotMatrixOrnament tone="slate" className="top-18 left-8 xl:left-16" />
          <DotMatrixOrnament tone="accent" className="bottom-16 right-8 xl:right-16" />
        </>
      )}

      {variant === "cta" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[700px] md:w-[1100px] lg:w-[1500px] h-[340px] sm:h-[700px] md:h-[1100px] lg:h-[1500px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[500px] md:w-[800px] lg:w-[1150px] h-[250px] sm:h-[500px] md:h-[800px] lg:h-[1150px]",
              RING_ACCENT_SOLID
            )}
          />
          <DiamondOrnament size={18} className="top-12 left-6 xl:left-12" />
          <DiamondOrnament size={18} className="top-12 right-6 xl:right-12" />
          <DiamondOrnament size={16} className="bottom-16 left-8 xl:left-16" />
          <DiamondOrnament size={16} className="bottom-16 right-8 xl:right-16" />
          <DotMatrixOrnament tone="slate" className="bottom-24 left-10 xl:left-20" />
          <DotMatrixOrnament tone="accent" className="bottom-24 right-10 xl:right-20" />
        </>
      )}

      {variant === "panel" && (
        <>
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[460px] h-[280px] sm:h-[460px]",
              RING_NEUTRAL_DASHED
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] sm:w-[330px] h-[200px] sm:h-[330px]",
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
 * Rendered strictly behind content (`-z-10`) so no elements are obscured.
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
