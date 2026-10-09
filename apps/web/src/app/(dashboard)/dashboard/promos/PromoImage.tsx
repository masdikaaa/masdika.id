"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from "@/components/ThemeProvider";

export default function PromoImage({ src, alt }: { src: string; alt: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <>
      <div 
        className="w-full aspect-[1200/630] relative overflow-hidden bg-black/50 cursor-zoom-in group/img"
        onClick={() => setIsOpen(true)}
      >
        <img referrerPolicy="no-referrer" 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        loading="lazy" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#011627] via-transparent to-transparent opacity-80 pointer-events-none" />
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300">
          <div className={cn("w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border", isDark ? "text-white border-white/20" : "text-slate-900 border-slate-200")}>
            <ZoomIn className="w-6 h-6" />
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                onClick={() => setIsOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 w-full h-full flex items-center justify-center"
              >
                <button 
                  onClick={() => setIsOpen(false)}
                  className={cn("absolute top-4 right-4 sm:top-6 sm:right-6 z-20 w-12 h-12 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center backdrop-blur-md border transition-all hover:scale-105", isDark ? "text-white border-white/20" : "text-slate-900 border-slate-200")}
                >
                  <X className="w-6 h-6" />
                </button>
                <img referrerPolicy="no-referrer" src={src} alt={alt} className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain rounded-xl shadow-2xl" loading="lazy" decoding="async" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}