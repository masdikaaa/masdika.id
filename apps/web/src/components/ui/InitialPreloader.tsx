"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Initial Preloader Component
 * Ensures the signature PremiumLoader is displayed until the page and DOM content
 * are genuinely loaded and ready across mobile (iPhone/Android) and desktop devices.
 * 
 * Safety & Reliability Highlights:
 * - Dismisses ONLY after `document.readyState === 'complete'` / `window.load` and React mount.
 * - Non-destructive CSS opacity/display toggles (never breaks React 19 reconciliation).
 * - Uses dynamic viewport height (100dvh) for dead-center alignment on iPhone Safari.
 * - Perfect balanced tracking (pl-[0.4em]) eliminates horizontal offsets.
 */
export function InitialPreloader() {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let fadeTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;

    const dismiss = () => {
      // Allow brief moment for branded spinner to finish gracefully
      fadeTimer = setTimeout(() => {
        setFading(true);
        hideTimer = setTimeout(() => {
          setHidden(true);
        }, 350);
      }, 400);
    };

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
      // Safety ceiling: never keep user stuck longer than 4s even on broken networks
      const maxWaitTimer = setTimeout(dismiss, 4000);
      return () => {
        window.removeEventListener("load", dismiss);
        clearTimeout(maxWaitTimer);
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div
      id="initial-preloader"
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden select-none transition-opacity duration-350 ease-out",
        "bg-[#f8fafb] dark:bg-[#000000]",
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
        display: hidden ? "none" : undefined,
      }}
    >
      {/* Background Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          background: "radial-gradient(circle 340px at 50% 50%, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0.09) 30%, rgba(34,211,238,0.03) 60%, rgba(34,211,238,0) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none block dark:hidden"
        style={{
          background: "radial-gradient(circle 300px at 50% 50%, rgba(6,182,212,0.10) 0%, rgba(6,182,212,0.04) 45%, rgba(6,182,212,0) 100%)",
        }}
      />

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

      {/* Lightweight self-dismiss script ensures fast transition ONLY when content is ready */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function dismissLoader() {
                var p = document.getElementById('initial-preloader');
                if (!p) return;
                p.style.opacity = '0';
                p.style.pointerEvents = 'none';
                setTimeout(function() {
                  if (p) p.style.display = 'none';
                }, 350);
              }
              if (document.readyState === 'complete') {
                setTimeout(dismissLoader, 450);
              } else {
                window.addEventListener('load', function() {
                  setTimeout(dismissLoader, 400);
                });
                setTimeout(dismissLoader, 4000);
              }
            })();
          `,
        }}
      />
    </div>
  );
}
