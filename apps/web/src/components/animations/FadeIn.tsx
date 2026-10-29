"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * High-performance, progressive-enhancement FadeIn animation.
 * 
 * Reliability & Safety Guarantees:
 * - Server-rendered and pre-mount elements are naturally visible without blank cutoff.
 * - Elements in or near initial viewport are displayed immediately upon mount.
 * - Elements further down trigger 150px BEFORE reaching viewport via native IntersectionObserver.
 * - Automatic safety timer guarantees visibility even if scroll events are throttled on iOS.
 * - Pure GPU compositor transitions (zero JS scroll-loop overhead).
 */
export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.5,
  className = "",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) {
      setIsVisible(true);
      return;
    }

    // Immediately show elements that are already within or close to initial screen
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 150) {
      setIsVisible(true);
      return;
    }

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        {
          rootMargin: "150px 0px",
          threshold: 0,
        }
      );

      observer.observe(el);

      // Failsafe timer ensures content NEVER remains stuck at opacity 0
      const safetyTimer = setTimeout(() => {
        setIsVisible(true);
        observer.disconnect();
      }, 1600);

      return () => {
        observer.disconnect();
        clearTimeout(safetyTimer);
      };
    } else {
      setIsVisible(true);
    }
  }, []);

  const translateMap = {
    up: "translateY(20px)",
    down: "translateY(-20px)",
    left: "translateX(20px)",
    right: "translateX(-20px)",
    none: "none",
  };

  // SSR / pre-mount render: standard div (fully visible by default)
  if (!mounted) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : translateMap[direction],
        transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        willChange: isVisible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
