"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Home, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center relative overflow-hidden px-6 py-12 md:py-20 font-sans selection:bg-cyan-500/30 text-white">
      {/* Clean atmospheric cyan background matching frontend */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.05) 45%, transparent 75%), radial-gradient(ellipse 55% 45% at 20% 85%, rgba(6,182,212,0.10) 0%, transparent 65%)"
        }}
      />

      <div className="max-w-4xl w-full relative z-10 flex flex-col items-center text-center">
        
        {/* Animated Illustration */}
        <div className="relative w-full max-w-[400px] h-[300px] mb-8 flex justify-center items-center">
          
          {/* Laptop SVG */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute bottom-2 z-10"
          >
            <svg width="280" height="180" viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[240px] sm:w-[280px]">
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
              y: [0, -15, 0],
              rotate: [0, -3, 3, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-10 right-4 sm:right-10 z-20"
          >
            <svg width="120" height="140" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[100px] sm:w-[120px]">
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
              className="absolute bottom-[5px] left-10 text-cyan-400"
            >
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 fill-cyan-400 opacity-80" />
            </motion.div>
          </motion.div>

          {/* Broken Socket SVG */}
          <motion.div 
             className="absolute bottom-16 right-[-10px] z-0 opacity-40"
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.4 }}
             transition={{ delay: 1 }}
          >
             <svg width="60" height="80" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="40" height="60" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
                <rect x="20" y="30" width="6" height="20" rx="3" fill="#011627"/>
                <rect x="34" y="30" width="6" height="20" rx="3" fill="#011627"/>
             </svg>
          </motion.div>

        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-md">
            Oops! Connection Lost.
          </h2>
          <p className="text-lg text-zinc-400 mb-12 max-w-xl mx-auto leading-relaxed">
            It looks like this page has been unplugged from the matrix. The link might be broken, or the page may have been removed. Let's plug you back in.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              href="/"
              leftIcon={<Home className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Back to Homepage
            </Button>
            
            <Button
              variant="secondary"
              size="lg"
              onClick={() => window.history.back()}
              leftIcon={<ArrowLeft className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
