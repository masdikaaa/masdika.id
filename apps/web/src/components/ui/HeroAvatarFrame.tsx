"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { HeroOrnaments } from "@/components/ui/PremiumBackground";

export interface HeroBadgeItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}

export interface HeroAvatarFrameProps {
  imageSrc: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  badges: [HeroBadgeItem, HeroBadgeItem, HeroBadgeItem, HeroBadgeItem];
  priority?: boolean;
  isPortrait?: boolean;
  className?: string;
}

const BADGE_POSITIONS = [
  { pos: "top-2 -left-1 sm:top-4 sm:-left-6 lg:-left-10", anim: "animate-float-1" },
  { pos: "top-12 -right-1 sm:top-6 sm:-right-6 lg:-right-10", anim: "animate-float-2" },
  { pos: "bottom-12 -left-1 sm:bottom-10 sm:-left-6 lg:-left-10", anim: "animate-float-3" },
  { pos: "bottom-6 -right-1 sm:bottom-10 sm:-right-6 lg:-right-10", anim: "animate-float-4" },
];

/**
 * Unified Hero Avatar Frame for all public pages on Masdika.id.
 * Ensures consistent responsive heights, grounded bottom fades, signature
 * architectural background rings (SMK Telkom Malang aesthetic), and balanced
 * 4 floating badges.
 */
export function HeroAvatarFrame({
  imageSrc,
  imageAlt,
  imageWidth = 1536,
  imageHeight = 1024,
  badges,
  priority = true,
  isPortrait = false,
  className,
}: HeroAvatarFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full mx-auto flex items-end justify-center select-none",
        isPortrait
          ? "max-w-[340px] sm:max-w-[420px] lg:max-w-[500px] h-[420px] sm:h-[500px] lg:h-[600px]"
          : "max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] h-[380px] sm:h-[440px] lg:h-[480px]",
        className
      )}
    >
      {/* Architectural Hero Background Ornaments precisely framed around the hero avatar */}
      <HeroOrnaments className="z-0" />

      {/* Subtle ambient depth bloom behind avatar — pure Cyan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      {/* Hero Character with progressive grounded bottom fade */}
      <div
        className="w-full h-full relative z-10 flex items-end justify-center overflow-hidden"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 84%, rgba(0,0,0,0.6) 93%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 84%, rgba(0,0,0,0.6) 93%, rgba(0,0,0,0) 100%)",
        }}
      >
        <Image
          referrerPolicy="no-referrer"
          src={imageSrc}
          alt={imageAlt}
          width={imageWidth}
          height={imageHeight}
          priority={priority}
          unoptimized={true}
          className="w-full h-full object-contain object-bottom relative z-10"
        />
        {/* Soft grounded bottom vignette fade into background */}
        <div className="absolute bottom-0 inset-x-0 h-10 sm:h-14 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/30 to-transparent pointer-events-none z-10" />
      </div>

      {/* 4 Floating animated hero badges */}
      {badges.map((badge, idx) => {
        const { pos, anim } = BADGE_POSITIONS[idx] || BADGE_POSITIONS[0];
        const Icon = badge.icon;
        return (
          <div
            key={idx}
            className={cn(
              "flex absolute z-30 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl items-center gap-2 sm:gap-3 max-w-[170px] sm:max-w-none",
              pos,
              anim,
              "bg-white dark:bg-[#0a0a0c] border border-slate-200/90 dark:border-white/15",
              "shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)]",
              "hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 cursor-default"
            )}
          >
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
              <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                {badge.label}
              </div>
              <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 truncate max-w-[115px] sm:max-w-none">
                {badge.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

