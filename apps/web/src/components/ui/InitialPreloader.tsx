"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Premium Initial Preloader Component
 * Displays the signature branded loader on first open and page refresh,
 * then smoothly fades out once React has mounted and the DOM is ready.
 * 
 * Reliability & Experience Highlights:
 * - Crisp branded display: 1000ms on client mount, allowing users to clearly see
 *   and appreciate the signature spinning rings & pulsating brand indicator.
 * - Smooth fade out (400ms): seamlessly cross-fades into the already-rendered page.
 * - Uses createPortal to document.body on mount to prevent any parent overflow clipping.
 * - Fully unmounts after fadeout to free up memory and GPU layers.
 */
export function InitialPreloader() {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let hideTimer: ReturnType<typeof setTimeout>;
    // Keep branded preloader visible for 1000ms so user clearly sees the signature animation
    const fadeTimer = setTimeout(() => {
      setFading(true);
      hideTimer = setTimeout(() => {
        setHidden(true);
      }, 400);
    }, 1000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  const content = (
    <div
      id="initial-preloader"
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden select-none",
        "bg-[#f8fafb] dark:bg-[#000000]",
        "transition-opacity duration-400 ease-out",
        fading ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
      )}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100dvh",
        minHeight: "100dvh",
      }}
    >
      {/* Main Loader Container — perfectly centered in visible 100dvh viewport */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
          {/* Outer glowing ring — CSS spin */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-cyan-500 dark:border-t-cyan-400 dark:border-r-cyan-400 dark:shadow-[0_0_30px_rgba(34,211,238,0.4)] premium-spin" />
          
          {/* Middle reverse glowing ring — CSS spin reverse */}
          <div className="absolute inset-3 md:inset-4 rounded-full border-2 border-transparent border-b-cyan-600 border-l-cyan-600 dark:border-b-cyan-400 dark:border-l-cyan-400 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] premium-spin-reverse" />
          
          {/* Inner rotating & pulsing ring — CSS spin + pulse */}
          <div className="absolute inset-6 md:inset-8 rounded-full border-2 border-transparent border-t-cyan-400 border-b-cyan-300 bg-gradient-to-br from-cyan-100/60 to-cyan-200/40 dark:border-t-cyan-300/80 dark:border-b-cyan-300/40 dark:bg-gradient-to-br dark:from-cyan-400/20 dark:to-cyan-500/20 dark:shadow-[0_0_15px_rgba(34,211,238,0.3)] premium-spin-pulse" />
          
          {/* Center dot — CSS pulse */}
          <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-cyan-500 shadow-sm dark:bg-white dark:shadow-[0_0_20px_rgba(255,255,255,1)] premium-pulse" />
        </div>

        {/* Text — perfectly centered horizontally with pl-[0.4em] */}
        <div className="mt-8 md:mt-10 flex flex-col items-center">
          <h3 className="font-black tracking-[0.4em] md:tracking-[0.5em] pl-[0.4em] text-sm mb-3 text-cyan-700 dark:text-cyan-400 premium-text-pulse">
            LOADING
          </h3>
          <div className="flex gap-1.5 md:gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 premium-dot-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // When hydrated on client, portal to document.body to prevent any container clipping
  if (mounted && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  // SSR initial render directly into HTML stream
  return (
    <>
      <noscript>
        <style>{`#initial-preloader { display: none !important; }`}</style>
      </noscript>
      {content}
    </>
  );
}
