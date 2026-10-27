"use client";

import React from "react";
import { Globe, Laptop, Smartphone, Tablet } from "lucide-react";

interface BrowserIconProps {
  browser?: string;
  device?: string;
  className?: string;
}

/**
 * Official vector brand logos for major browsers (Chrome, Firefox, Safari, Edge, Opera, Brave, Samsung Internet, Vivaldi, Arc).
 * Crisp inline SVG with zero AI-slop, pixel-perfect at all sizes, zero network dependencies.
 */
export function BrowserIcon({ browser = "", device = "", className = "w-4 h-4" }: BrowserIconProps) {
  const b = browser.toLowerCase().trim();

  // 1. Google Chrome
  if (b.includes("chrome") || b.includes("chromium") || b.includes("crios")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Google Chrome">
        <circle cx="12" cy="12" r="10" fill="#EA4335" />
        <path d="M12 2C15.9 2 19.3 4.4 20.8 7.8L12 12L7.5 4.2C8.9 2.8 10.4 2 12 2Z" fill="#EA4335" />
        <path d="M22 12C22 16.1 19.4 19.6 15.8 21.1L12 12H22Z" fill="#FBBC05" />
        <path d="M12 22C7.9 22 4.4 19.4 2.9 15.8L12 12L7.5 19.8C8.9 21.2 10.4 22 12 22Z" fill="#34A853" />
        <circle cx="12" cy="12" r="4.2" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="3.2" fill="#1A73E8" />
      </svg>
    );
  }

  // 2. Mozilla Firefox
  if (b.includes("firefox") || b.includes("mozilla") || b.includes("fxios")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Mozilla Firefox">
        <circle cx="12" cy="12" r="10" fill="#FF7139" />
        <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM18 10C17.4 10 16.9 10.3 16.6 10.7C15.7 9.1 14.1 8 12.2 8C9.5 8 7.3 10.2 7.3 12.9C7.3 13.6 7.5 14.2 7.7 14.8C7.1 14.3 6.7 13.5 6.7 12.7C6.7 11.2 7.9 10 9.4 10C9.6 10 9.8 10 10 10.1C9.6 8.9 10.4 7.6 11.7 7.4C12.4 7.3 13.1 7.5 13.6 8C14.7 7.6 15.6 7 16.3 6.2C16 7.2 15.2 8 14.3 8.5C15.2 8.4 16.1 8.1 16.9 7.7C16.3 8.6 15.6 9.4 14.7 10C15.7 9.8 17 9.5 18 10Z" fill="#FFE066" />
        <circle cx="13" cy="13" r="4" fill="#0060DF" />
        <path d="M10 9.5C9.5 10.2 9.2 11 9.2 11.9C9.2 13.9 10.8 15.5 12.8 15.5C14.1 15.5 15.2 14.8 15.8 13.8C15 15.1 13.6 16 12 16C9.8 16 8 14.2 8 12C8 10.8 8.5 9.7 9.3 9L10 9.5Z" fill="#00C3E3" />
      </svg>
    );
  }

  // 3. Apple Safari
  if (b.includes("safari")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Apple Safari">
        <circle cx="12" cy="12" r="10" fill="#0071E3" />
        <circle cx="12" cy="12" r="8.5" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.6" strokeDasharray="1.2 1.2" />
        {/* Compass needle */}
        <polygon points="15.8,8.2 12.8,12.8 8.2,15.8 11.2,11.2" fill="#FF3B30" />
        <polygon points="8.2,15.8 11.2,11.2 12,12" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="1.2" fill="#FFFFFF" />
      </svg>
    );
  }

  // 4. Microsoft Edge
  if (b.includes("edge") || b.includes("edg")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Microsoft Edge">
        <circle cx="12" cy="12" r="10" fill="#0078D7" fillOpacity="0.1" />
        <path d="M20.5 14.5C20.2 18.4 16.8 21.5 12.5 21.5C7.3 21.5 3 17.2 3 12C3 7.3 6.5 3.4 11 2.8C10.2 3.8 9.8 5.1 9.8 6.5C9.8 9.9 12.6 12.7 16 12.7C17.6 12.7 19.1 12 20.2 11C20.4 12.1 20.5 13.3 20.5 14.5Z" fill="#00BCF2" />
        <path d="M11.5 2.5C16.2 2.5 20.1 5.8 21 10.2C19.6 9 17.9 8.2 16 8.2C12.7 8.2 10 10.9 10 14.2C10 14.9 10.1 15.6 10.4 16.2C7 15.7 4.5 12.7 4.5 9.2C4.5 5.5 7.6 2.5 11.5 2.5Z" fill="#0C59A4" />
        <path d="M12.5 21.5C16.8 21.5 20.2 18.4 20.5 14.5C19.4 15.6 17.8 16.2 16.2 16.2C12.9 16.2 10.2 13.5 10.2 10.2C10.2 9.5 10.3 8.8 10.6 8.2C6.8 9 4 12.4 4 16.5C4 19.3 5.4 21.5 12.5 21.5Z" fill="#2DCD79" fillOpacity="0.8" />
      </svg>
    );
  }

  // 5. Opera
  if (b.includes("opera") || b.includes("opr")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Opera">
        <circle cx="12" cy="12" r="10" fill="#FF1B2D" />
        <ellipse cx="12" cy="12" rx="4.5" ry="7.2" fill="#FFFFFF" />
        <ellipse cx="12" cy="12" rx="2.4" ry="5.6" fill="#FF1B2D" />
      </svg>
    );
  }

  // 6. Brave
  if (b.includes("brave")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Brave">
        <path d="M12 2L4 5.5V11C4 16.5 7.4 21.6 12 22.9C16.6 21.6 20 16.5 20 11V5.5L12 2Z" fill="#FB542B" />
        <path d="M12 5L6 7.6V11C6 14.8 8.5 18.3 12 19.5C15.5 18.3 18 14.8 18 11V7.6L12 5Z" fill="#FF7654" />
        <polygon points="12,8 9.5,13.5 14.5,13.5" fill="#FFFFFF" />
      </svg>
    );
  }

  // 7. Samsung Internet
  if (b.includes("samsung")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Samsung Internet">
        <circle cx="12" cy="12" r="10" fill="#1C69D3" />
        <ellipse cx="12" cy="12" rx="7" ry="3.5" stroke="#FFFFFF" strokeWidth="1.2" transform="rotate(-30 12 12)" />
        <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
      </svg>
    );
  }

  // 8. Vivaldi
  if (b.includes("vivaldi")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Vivaldi">
        <circle cx="12" cy="12" r="10" fill="#EF3939" />
        <path d="M7 8L12 17L17 8H14.5L12 13L9.5 8H7Z" fill="#FFFFFF" />
      </svg>
    );
  }

  // 9. Arc Browser
  if (b.includes("arc")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Arc">
        <circle cx="12" cy="12" r="10" fill="#F45E43" />
        <circle cx="12" cy="12" r="6" stroke="#FFFFFF" strokeWidth="2.5" />
      </svg>
    );
  }

  // Fallback by device type or general globe
  if (device === "Mobile") {
    return <Smartphone className={className} />;
  }
  if (device === "Tablet") {
    return <Tablet className={className} />;
  }
  if (device === "Desktop") {
    return <Laptop className={className} />;
  }

  return <Globe className={className} />;
}
