"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

interface ImageZoomProps {
  src: string;
  alt: string;
  /** 
   * "default" → banner style (h-64/h-96), used on blog/event 
   * "hero"    → full hero style (h-[400px]/h-[500px]), used on portfolio detail
   */
  variant?: "default" | "hero";
  hintText?: string;
}

export function ImageZoom({ src, alt, variant = "default", hintText }: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const lightbox = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0,0,0,0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
      }}
      onClick={() => setIsOpen(false)}
    >
      {/* Close button */}
      <button
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 100000,
          padding: "0.5rem",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "50%",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
        }}
      >
        <X size={20} />
      </button>

      <img referrerPolicy="no-referrer"         src={src}
        alt={alt}
        style={{
          maxWidth: "95vw",
          maxHeight: "95vh",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          display: "block",
          borderRadius: "0.75rem",
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );

  if (variant === "hero") {
    return (
      <>
        {/* Hero style thumbnail */}
        <div
          className="w-full rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] overflow-hidden relative group cursor-zoom-in"
          onClick={() => setIsOpen(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-cyan-500/20 z-10 pointer-events-none" />
          <img referrerPolicy="no-referrer"             src={src}
            alt={alt}
            className="w-full h-auto object-cover transition-all duration-700 relative z-0"
          loading="lazy" decoding="async" />
          {hintText && <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-10" />}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-20 ${hintText ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <div className={`bg-black/50 backdrop-blur-md ${hintText ? 'py-2 px-4 sm:py-3 sm:px-5 border border-white/10 group-hover:border-white/30 group-hover:bg-black/60 shadow-xl' : 'p-3 sm:p-4'} rounded-full text-white flex items-center gap-1.5 sm:gap-2 transition-all`}>
              <ZoomIn className="w-5 h-5 sm:w-7 sm:h-7" />
              {hintText && <span className="text-xs sm:text-sm font-bold tracking-wide">{hintText}</span>}
            </div>
          </div>
        </div>

        {/* Lightbox */}
        {isOpen && mounted && createPortal(lightbox, document.body)}
      </>
    );
  }

  // default variant - banner style (blog / event)
  return (
    <>
      <div
        className="w-full rounded-3xl overflow-hidden mb-10 border border-[var(--border-primary)] relative cursor-zoom-in group bg-[var(--surface)]"
        onClick={() => setIsOpen(true)}
      >
        <img referrerPolicy="no-referrer"           src={src}
          alt={alt}
          className="w-full h-auto max-h-[400px] sm:max-h-[500px] object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy" decoding="async" />
        {hintText && <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${hintText ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className={`bg-black/50 backdrop-blur-md ${hintText ? 'py-1.5 px-3 sm:py-2.5 sm:px-5 border border-white/10 group-hover:border-white/30 group-hover:bg-black/60 shadow-xl' : 'p-2.5 sm:p-3'} rounded-full text-white flex items-center gap-1.5 sm:gap-2 transition-all`}>
            <ZoomIn className="w-4 h-4 sm:w-6 sm:h-6" />
            {hintText && <span className="text-[11px] sm:text-sm font-bold tracking-wide">{hintText}</span>}
          </div>
        </div>
      </div>

      {/* Lightbox rendered at document.body to bypass stacking contexts */}
      {isOpen && mounted && createPortal(lightbox, document.body)}
    </>
  );
}
