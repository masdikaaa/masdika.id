"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="flex flex-col min-h-[calc(100vh-64px)] w-full max-w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
