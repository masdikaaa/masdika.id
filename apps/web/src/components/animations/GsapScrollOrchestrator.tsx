"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Global Motion + GSAP ScrollTrigger orchestrator for public pages.
 * - Renders a sleek top scroll progress bar via Framer Motion useScroll/useSpring.
 * - Strictly avoids double-animating sections and inner grids, and never collides with
 *   Framer Motion (`[data-motion-owned]`) or `[data-no-gsap]` blocks.
 */
export function GsapScrollOrchestrator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let ctx: gsap.Context | undefined;

    const bootTimer = setTimeout(() => {
      ctx = gsap.context(() => {
        const vh = window.innerHeight || 800;

        // 1. Smooth scroll parallax starting at 0px at initial scrollY=0
        gsap.utils.toArray<HTMLElement>("[data-gsap-parallax]").forEach((el) => {
          const speed = Number(el.dataset.gsapParallax || -16);
          gsap.fromTo(
            el,
            { y: 0 },
            {
              y: speed,
              ease: "none",
              scrollTrigger: {
                trigger: root,
                start: "top top",
                end: "+=700",
                scrub: 0.8,
              },
            }
          );
        });

        // 2. Collect explicit & auto-detected stagger grids (excluding Framer Motion / data-no-gsap)
        const staggerTargets = new Set<HTMLElement>(
          gsap.utils
            .toArray<HTMLElement>("[data-gsap-stagger]")
            .filter((el) => !el.closest("[data-no-gsap]"))
        );

        gsap.utils.toArray<HTMLElement>("section:not(:first-of-type) .grid").forEach((grid) => {
          if (
            grid.closest("[data-no-gsap]") ||
            grid.closest("[data-gsap-stagger]") ||
            grid.querySelector("[data-motion-owned]")
          ) {
            return;
          }
          const count = grid.children.length;
          if (count >= 2 && count <= 16) {
            staggerTargets.add(grid);
          }
        });

        // Animate stagger groups strictly below the initial viewport
        staggerTargets.forEach((group) => {
          const items = Array.from(group.children) as HTMLElement[];
          if (items.length === 0) return;

          const rect = group.getBoundingClientRect();
          if (rect.top < vh * 0.98) return;

          gsap.fromTo(
            items,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.48,
              stagger: 0.05,
              ease: "power2.out",
              clearProps: "transform,opacity",
              scrollTrigger: {
                trigger: group,
                start: "top 90%",
                once: true,
              },
            }
          );
        });

        // 3. Animate standalone sections ONLY when they do NOT already contain a stagger grid or Framer Motion block
        const sections = gsap.utils.toArray<HTMLElement>("section");
        sections.forEach((sec, index) => {
          if (
            index === 0 ||
            sec.dataset.noGsap !== undefined ||
            sec.querySelector("[data-motion-owned]")
          ) {
            return;
          }
          const hasStagger = Array.from(staggerTargets).some((g) => sec.contains(g));
          if (hasStagger) return;

          const rect = sec.getBoundingClientRect();
          if (rect.top < vh * 0.98) return;

          gsap.fromTo(
            sec,
            { opacity: 0, y: 18 },
            {
              opacity: 1,
              y: 0,
              duration: 0.55,
              ease: "power2.out",
              clearProps: "transform,opacity",
              scrollTrigger: {
                trigger: sec,
                start: "top 90%",
                once: true,
              },
            }
          );
        });

        ScrollTrigger.refresh();
      }, root);
    }, 90);

    return () => {
      clearTimeout(bootTimer);
      ctx?.revert();
    };
  }, [pathname]);

  return (
    <div ref={containerRef} className="relative w-full flex-1 flex flex-col">
      {/* Live Cyan Scroll Progress Line */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX, transformOrigin: "0% 50%" }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-200 z-[60] pointer-events-none shadow-[0_0_10px_rgba(34,211,238,0.65)]"
      />
      {children}
    </div>
  );
}
