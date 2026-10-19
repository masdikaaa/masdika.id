"use client";

import { usePathname } from "next/navigation";

/**
 * Lightweight page transition using CSS-only opacity fade.
 * Removed forced window.scrollTo(0, 0) so navigating between pages
 * maintains natural scroll position without jarring jumps.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="flex flex-col min-h-[calc(100vh-64px)] w-full max-w-full page-fade-in"
    >
      {children}
    </div>
  );
}
