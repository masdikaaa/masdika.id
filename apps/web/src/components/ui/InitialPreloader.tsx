"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Premium Initial Preloader Component
 * Hydrates in-place without createPortal remounting so CSS animations never reset or stutter.
 */
export function InitialPreloader() {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // 1. Safety watchdog: hard fallback to ensure loader is ALWAYS removed within 1s
    const hardTimeout = setTimeout(() => {
      setFading(true);
      setHidden(true);
      const el = document.getElementById("initial-preloader");
      if (el) el.style.display = "none";
    }, 1000);

    // 2. Fast-path: if user already loaded this site in current tab/session (e.g. refreshed or navigated), dismiss immediately
    try {
      if (sessionStorage.getItem("masdika-initial-loaded") === "true") {
        setFading(true);
        const fastTimer = setTimeout(() => {
          setHidden(true);
        }, 50);
        return () => {
          clearTimeout(hardTimeout);
          clearTimeout(fastTimer);
        };
      }
      sessionStorage.setItem("masdika-initial-loaded", "true");
    } catch {}

    // 3. First visit in session: snappy branded intro with smooth fade
    let hideTimer: ReturnType<typeof setTimeout>;
    const fadeTimer = setTimeout(() => {
      setFading(true);
      hideTimer = setTimeout(() => {
        setHidden(true);
      }, 200);
    }, 300);

    return () => {
      clearTimeout(hardTimeout);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <>
      <noscript>
        <style>{`#initial-preloader { display: none !important; }`}</style>
      </noscript>
      <div
        id="initial-preloader"
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden select-none",
          "bg-[#f8fafb] dark:bg-[#000000]",
          "transition-opacity duration-250 ease-out",
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
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-cyan-500 dark:border-t-cyan-400 dark:border-r-cyan-400 dark:shadow-[0_0_30px_rgba(34,211,238,0.4)] premium-spin" />
            <div className="absolute inset-3 md:inset-4 rounded-full border-2 border-transparent border-b-cyan-600 border-l-cyan-600 dark:border-b-cyan-400 dark:border-l-cyan-400 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] premium-spin-reverse" />
            <div className="absolute inset-6 md:inset-8 rounded-full border-2 border-transparent border-t-cyan-400 border-b-cyan-300 bg-gradient-to-br from-cyan-100/60 to-cyan-200/40 dark:border-t-cyan-300/80 dark:border-b-cyan-300/40 dark:bg-gradient-to-br dark:from-cyan-400/20 dark:to-cyan-500/20 dark:shadow-[0_0_15px_rgba(34,211,238,0.3)] premium-spin-pulse" />
            <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-cyan-500 shadow-sm dark:bg-white dark:shadow-[0_0_20px_rgba(255,255,255,1)] premium-pulse" />
          </div>

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
    </>
  );
}
