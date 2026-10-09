import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number in compact notation.
 * e.g. 1000 → "1k", 1500 → "1.5k", 1_000_000 → "1M", 2_500_000 → "2.5M"
 * Strips unnecessary trailing zeros: 1.0k → "1k"
 */
export function formatCompact(n: number | undefined | null): string {
  if (n === undefined || n === null) return "0";
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return `${parseFloat(v.toFixed(1))}B`;
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${parseFloat(v.toFixed(1))}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${parseFloat(v.toFixed(1))}k`;
  }
  return n.toString();
}
