"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  image?: string | null;
  email?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  isDark?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

export function UserAvatar({
  image,
  email,
  name,
  size = "md",
  className,
  isDark = true,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const cleanName = (name || "User").trim();
  const cleanEmail = (email || "").trim();
  const cleanImage = (image || "").trim();
  const initial = (cleanName.charAt(0) || "U").toUpperCase();

  // Reset error when props change
  useEffect(() => {
    setHasError(false);
  }, [cleanImage, cleanEmail]);

  // Determine current image source
  const fallbackUrl = `/api/avatar?${hasError ? "fallback=1&" : ""}email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(cleanName)}`;
  const currentSrc = !hasError && cleanImage ? cleanImage : fallbackUrl;

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden border shrink-0 relative flex items-center justify-center select-none",
        sizeClasses[size],
        isDark ? "border-white/[0.08] bg-[#0c0c0e]" : "border-slate-200 bg-slate-100",
        className
      )}
    >
      <img
        key={currentSrc}
        referrerPolicy="no-referrer"
        src={currentSrc}
        alt={cleanName}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          if (!hasError) {
            // First failure: switch to guaranteed /api/avatar?fallback=1
            setHasError(true);
          } else {
            // Second failure: hide img and reveal inline HTML/CSS initial
            e.currentTarget.style.display = "none";
            const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallbackEl) fallbackEl.style.display = "flex";
          }
        }}
      />
      <div
        style={{ display: "none" }}
        className="w-full h-full bg-[#004d40] text-white font-bold items-center justify-center text-center uppercase"
      >
        {initial}
      </div>
    </div>
  );
}
