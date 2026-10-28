"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PageOrnaments } from "@/components/ui/PremiumBackground";

/**
 * Lightweight page transition with instant scroll to top on page mount.
 * When a new route finishes loading, it displays cleanly from the top of the page,
 * like standard modern websites.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  useEffect(() => {
    // When the new page route finishes loading and mounts, immediately display from the top
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div
      key={pathname}
      className="flex flex-col min-h-[calc(100vh-64px)] w-full max-w-full page-fade-in relative z-20"
    >
      {!isHomePage && <PageOrnaments />}
      <div className="relative z-10 flex flex-col flex-1 w-full max-w-full min-w-0">
        {children}
      </div>
    </div>
  );
}
