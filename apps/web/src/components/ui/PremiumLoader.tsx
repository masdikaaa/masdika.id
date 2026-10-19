"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Ultra-lightweight loading spinner using pure CSS animations.
 * Zero Framer Motion dependency = instant render, no JS animation overhead,
 * dramatically lower CPU/RAM usage while spinning.
 * 
 * The spinner continuously rotates until the page fully loads.
 */
export function PremiumLoader({ inline = false }: { inline?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={cn(
      "flex flex-col items-center justify-center overflow-hidden",
      inline
        ? "relative py-20 min-h-[300px]"
        : cn("fixed inset-0 z-[100]", isDark ? "bg-[#000000]" : "bg-[#f8fafb]")
    )}>
      {/* Background Glow — pure radial gradient, no CSS blur */}
      {!inline && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "radial-gradient(circle 340px at 50% 50%, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0.09) 30%, rgba(34,211,238,0.03) 60%, rgba(34,211,238,0) 100%)"
              : "radial-gradient(circle 300px at 50% 50%, rgba(6,182,212,0.10) 0%, rgba(6,182,212,0.04) 45%, rgba(6,182,212,0) 100%)",
          }}
        />
      )}
      
      {/* Main Loader Container — pure CSS, no JS animation frames */}
      <div className={cn("relative z-10 flex flex-col items-center", inline ? "scale-75 md:scale-100" : "")}>
        <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
          {/* Outer glowing ring — CSS spin */}
          <div
            className={cn(
              "absolute inset-0 rounded-full border-2 border-transparent premium-spin",
              isDark
                ? "border-t-cyan-400 border-r-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                : "border-t-cyan-500 border-r-cyan-500"
            )}
          />
          {/* Middle reverse glowing ring — CSS spin reverse */}
          <div
            className={cn(
              "absolute inset-3 md:inset-4 rounded-full border-2 border-transparent premium-spin-reverse",
              isDark
                ? "border-b-cyan-400 border-l-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                : "border-b-cyan-600 border-l-cyan-600"
            )}
          />
          {/* Inner rotating & pulsing ring — CSS spin + pulse */}
          <div
            className={cn(
              "absolute inset-6 md:inset-8 rounded-full border-2 border-transparent premium-spin-pulse",
              isDark
                ? "border-t-cyan-300/80 border-b-cyan-300/40 bg-gradient-to-br from-cyan-400/20 to-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                : "border-t-cyan-400 border-b-cyan-300 bg-gradient-to-br from-cyan-100/60 to-cyan-200/40"
            )}
          />
          {/* Center dot — CSS pulse */}
          <div
            className={cn(
              "w-3.5 h-3.5 md:w-4 md:h-4 rounded-full premium-pulse",
              isDark
                ? "bg-white shadow-[0_0_20px_rgba(255,255,255,1)]"
                : "bg-cyan-500 shadow-sm"
            )}
          />
        </div>

        {/* Text */}
        <div className="mt-8 md:mt-10 flex flex-col items-center">
          <h3
            className={cn(
              "font-black tracking-[0.4em] md:tracking-[0.5em] text-sm mb-3 ml-2 premium-text-pulse",
              isDark ? "text-cyan-400" : "text-cyan-700"
            )}
          >
            LOADING
          </h3>
          <div className="flex gap-1.5 md:gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full premium-dot-pulse",
                  isDark ? "bg-cyan-400" : "bg-cyan-600"
                )}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
