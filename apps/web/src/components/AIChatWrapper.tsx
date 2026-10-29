"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const AIChat = dynamic(() => import("@/components/AIChat").then((m) => m.AIChat), {
  ssr: false,
  loading: () => null,
});

export function AIChatWrapper() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Defer loading until after page hydration and browser idle so it never competes with FCP/LCP
    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        const id = (window as any).requestIdleCallback(() => setReady(true), { timeout: 3500 });
        return () => (window as any).cancelIdleCallback(id);
      } else {
        const t = setTimeout(() => setReady(true), 2500);
        return () => clearTimeout(t);
      }
    }
  }, []);

  if (!ready) return null;
  return <AIChat />;
}
