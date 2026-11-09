"use client";

import { motion } from "framer-motion";
import { Home, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PremiumBackground, SectionOrnaments } from "@/components/ui/PremiumBackground";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 sm:px-6 sm:py-12 md:py-16 font-sans selection:bg-cyan-500/30 text-[var(--text-primary)] transition-colors duration-500">
      {/* Premium Base Canvas & Architectural Ornaments (zero blur haze, zero light bleed) */}
      <PremiumBackground />
      <SectionOrnaments variant="center" />

      <div className="max-w-2xl w-full relative z-10 flex flex-col items-center text-center">
        
        {/* Animated Illustration */}
        <div className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] h-[170px] sm:h-[210px] md:h-[240px] mb-4 sm:mb-6 flex justify-center items-center">
          
          {/* Laptop SVG */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute bottom-1 sm:bottom-2 z-10"
          >
            <svg width="280" height="180" viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[180px] sm:w-[220px] md:w-[260px] h-auto">
              {/* Screen outer */}
              <rect x="20" y="20" width="240" height="150" rx="12" fill="#0a1f33" stroke="#0ea5e9" strokeWidth="4"/>
              {/* Screen inner */}
              <rect x="30" y="30" width="220" height="130" rx="6" fill="#011627"/>
              {/* 404 Text on screen */}
              <text x="140" y="100" fontFamily="monospace" fontSize="64" fontWeight="bold" fill="#0ea5e9" textAnchor="middle">404</text>
              <text x="140" y="135" fontFamily="sans-serif" fontSize="16" fontWeight="bold" fill="#64748b" textAnchor="middle">ERROR</text>
              {/* Keyboard base */}
              <path d="M0 170 L280 170 L270 180 L10 180 Z" fill="#0ea5e9"/>
            </svg>
          </motion.div>

          {/* Unplugged Cable SVG - Animated */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, -3, 3, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-2 sm:top-4 right-1 sm:right-6 md:right-8 z-20"
          >
            <svg width="120" height="140" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[70px] sm:w-[85px] md:w-[100px] h-auto">
              {/* Wire trailing off - moved down to prevent clipping */}
              <path d="M110 20 Q 80 10 60 50" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" fill="none"/>
              {/* Plug body */}
              <rect x="40" y="40" width="40" height="60" rx="8" fill="#1e293b" stroke="#0ea5e9" strokeWidth="3"/>
              {/* Prongs */}
              <rect x="48" y="100" width="6" height="25" rx="3" fill="#94a3b8"/>
              <rect x="66" y="100" width="6" height="25" rx="3" fill="#94a3b8"/>
              {/* Light indicator */}
              <circle cx="60" cy="70" r="4" fill="#0ea5e9"/>
            </svg>

            {/* Sparks */}
            <motion.div
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
              className="absolute bottom-[2px] left-6 sm:left-8 text-cyan-400"
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-cyan-400 opacity-80" />
            </motion.div>
          </motion.div>

          {/* Broken Socket SVG */}
          <motion.div 
             className="absolute bottom-8 sm:bottom-10 right-[-6px] sm:right-0 z-0 opacity-40"
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.4 }}
             transition={{ delay: 1 }}
          >
             <svg width="60" height="80" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[36px] sm:w-[44px] md:w-[50px] h-auto">
                <rect x="10" y="10" width="40" height="60" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
                <rect x="20" y="30" width="6" height="20" rx="3" fill="#011627"/>
                <rect x="34" y="30" width="6" height="20" rx="3" fill="#011627"/>
             </svg>
          </motion.div>

        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center"
        >
          {/* Consistent brand status badge */}
          <div className="mb-3 sm:mb-4">
            <Badge variant="brand" dot dotColor="bg-cyan-400" size="sm" className="font-mono uppercase tracking-wider text-[11px]">
              404 • PAGE NOT FOUND
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-2.5 sm:mb-3 tracking-tight leading-[1.2]">
            Oops! Connection Lost.
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed">
            It looks like this page has been unplugged from the matrix. The link might be broken, or the page may have been removed. Let&apos;s plug you back in.
          </p>

          <div className="flex items-center justify-center">
            <Button
              variant="primary"
              size="md"
              href="/"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Back to Homepage
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
