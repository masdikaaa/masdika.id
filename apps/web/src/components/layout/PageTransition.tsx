"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Lightweight page transition using CSS-only opacity fade.
 * Removed AnimatePresence + motion.div wrapper which added significant
 * JS overhead (layout measurement, FLIP animations, exit tracking).
 * The CSS transition achieves the same visual effect at near-zero cost.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    // Only scroll to top when navigating to a different page
    // Not on initial mount (prevPathname is null)
    if (prevPathname.current !== null && prevPathname.current !== pathname) {
      // Use instant scroll so it's not visible — matches standard browser behavior
      window.scrollTo(0, 0);
    }
    prevPathname.current = pathname;
  }, [pathname]);

  return (
    <div
      key={pathname}
      className="flex flex-col min-h-[calc(100vh-64px)] w-full max-w-full page-fade-in"
    >
      {children}
    </div>
  );
}
