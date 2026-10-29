"use client";

import { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * Lightweight FadeIn wrapper.
 * Renders content immediately without hiding it behind opacity:0,
 * guaranteeing instant visibility on mobile and desktop scroll.
 */
export function FadeIn({
  children,
  className = "",
}: FadeInProps) {
  return <div className={className}>{children}</div>;
}
