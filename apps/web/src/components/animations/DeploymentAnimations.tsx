"use client";

import { motion } from "framer-motion";

export function AnimatedBeam() {
  return (
    <motion.div 
      animate={{ x: ["-100%", "200%"] }}
      transition={{ duration: 3, ease: "linear", repeat: Infinity }}
      className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]"
    />
  );
}

export function OrbitalRings() {
  return (
    <>
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        className="absolute inset-[-2px] rounded-full border-2 border-dashed border-cyan-500/30"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 12, ease: "linear", repeat: Infinity }}
        className="absolute inset-[-8px] rounded-full border-2 border-transparent border-t-cyan-400/50 border-b-cyan-600/50 opacity-50 group-hover:opacity-100 transition-opacity"
      />
    </>
  );
}
