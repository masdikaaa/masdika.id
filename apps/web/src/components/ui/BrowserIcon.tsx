"use client";

import React from "react";
import { Globe, Laptop, Smartphone, Tablet } from "lucide-react";
import { FaEdge } from "react-icons/fa";
import {
  SiArc,
  SiBrave,
  SiFirefoxbrowser,
  SiGooglechrome,
  SiOpera,
  SiSafari,
  SiSamsung,
  SiVivaldi,
} from "react-icons/si";
import { cn } from "@/lib/utils";

interface BrowserIconProps {
  browser?: string;
  device?: string;
  className?: string;
}

const BROWSER_MATCHERS: Array<{
  keywords: string[];
  Icon: React.ComponentType<{ className?: string; "aria-label"?: string }>;
  colorClass: string;
  label: string;
}> = [
  {
    keywords: ["edge", "edg"],
    Icon: FaEdge,
    colorClass: "text-[#0078D7] dark:text-[#38BDF8]",
    label: "Microsoft Edge",
  },
  {
    keywords: ["brave"],
    Icon: SiBrave,
    colorClass: "text-[#FB542B]",
    label: "Brave",
  },
  {
    keywords: ["opera", "opr"],
    Icon: SiOpera,
    colorClass: "text-[#FF1B2D]",
    label: "Opera",
  },
  {
    keywords: ["vivaldi"],
    Icon: SiVivaldi,
    colorClass: "text-[#EF3939]",
    label: "Vivaldi",
  },
  {
    keywords: ["arc"],
    Icon: SiArc,
    colorClass: "text-[#F45E43]",
    label: "Arc",
  },
  {
    keywords: ["samsung"],
    Icon: SiSamsung,
    colorClass: "text-[#1C69D3] dark:text-[#60A5FA]",
    label: "Samsung Internet",
  },
  {
    keywords: ["firefox", "mozilla", "fxios"],
    Icon: SiFirefoxbrowser,
    colorClass: "text-[#FF7139]",
    label: "Mozilla Firefox",
  },
  {
    keywords: ["safari"],
    Icon: SiSafari,
    colorClass: "text-[#0071E3] dark:text-[#38BDF8]",
    label: "Apple Safari",
  },
  {
    keywords: ["chrome", "chromium", "crios"],
    Icon: SiGooglechrome,
    colorClass: "text-[#1A73E8] dark:text-[#60A5FA]",
    label: "Google Chrome",
  },
];

/**
 * Official brand icons from react-icons for major browsers, with Lucide device fallback.
 */
export function BrowserIcon({ browser = "", device = "", className = "w-4 h-4" }: BrowserIconProps) {
  const b = browser.toLowerCase().trim();

  for (const entry of BROWSER_MATCHERS) {
    if (entry.keywords.some((kw) => b.includes(kw))) {
      const { Icon } = entry;
      return <Icon className={cn(className, entry.colorClass)} aria-label={entry.label} />;
    }
  }

  const d = device.toLowerCase();
  if (d === "mobile") return <Smartphone className={cn(className, "text-cyan-400")} />;
  if (d === "tablet") return <Tablet className={cn(className, "text-cyan-400")} />;
  if (d === "desktop") return <Laptop className={cn(className, "text-cyan-400")} />;
  return <Globe className={cn(className, "text-zinc-400")} />;
}
