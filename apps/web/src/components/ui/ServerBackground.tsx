"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function ServerBackground({ showRacks = true }: { showRacks?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const config = {
    rack1: {
      style: { right: "5%", top: "20%", transform: "scale(1.5) rotate(-12deg)" },
      mobileStyle: { right: "-30%", top: "5%", transform: "scale(0.6) rotate(-12deg)" },
      count: 5, color1: "#22d3ee", color2: "#06b6d4"
    },
    rack2: {
      style: { left: "5%", bottom: "15%", transform: "scale(1.2) rotate(12deg)" },
      mobileStyle: { left: "-20%", bottom: "5%", transform: "scale(0.5) rotate(12deg)" },
      count: 4, color1: "#60a5fa", color2: "#22d3ee"
    },
    shouldAnimate: false
  };

  return (
    <div className={cn(
      "absolute inset-0 overflow-hidden pointer-events-none z-0 transition-colors duration-500",
      isDark ? "bg-[#010a14]" : "bg-[#f8fafb]"
    )}>
      {/* Glow Orbs */}
      <div className={cn(
        "absolute top-[-10%] left-[-10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full blur-[100px] md:blur-[120px] animate-pulse",
        isDark ? "bg-cyan-500/20" : "bg-cyan-400/10"
      )} />
      <div className={cn(
        "absolute bottom-[-5%] right-[-10%] w-[350px] h-[350px] md:w-[600px] md:h-[600px] rounded-full blur-[100px] md:blur-[150px] animate-pulse",
        isDark ? "bg-cyan-600/20" : "bg-cyan-400/8"
      )} />
      <div className={cn(
        "absolute top-1/2 left-1/4 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full blur-[80px] md:blur-[100px] -translate-y-1/2 animate-pulse",
        isDark ? "bg-cyan-500/20" : "bg-blue-400/8"
      )} />

      {/* Grid overlay */}
      <div className={cn(
        "absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]",
        isDark
          ? "bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:40px_40px] mix-blend-screen"
          : "bg-[linear-gradient(#475569_1px,transparent_1px),linear-gradient(90deg,#475569_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.07]"
      )} />

      {/* Server Racks — only in dark, too visually heavy on white */}
      {showRacks && isDark && (
        <>
          {/* Rack 1 - Desktop */}
          <motion.div
            className="hidden md:block absolute opacity-[0.15] perspective-1000"
            style={config.rack1.style as any}
          >
            <div className="flex flex-col gap-5 w-[350px]">
              {Array.from({ length: config.rack1.count }).map((_, i) => (
                <div key={i} className="h-16 w-full border border-cyan-500/40 rounded-xl bg-white/5 flex items-center px-8 relative overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  <motion.div
                    animate={{ x: ["-100%", "300%"] }}
                    transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent skew-x-12"
                  />
                  <div className="flex gap-4">
                    <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} className="w-2.5 h-2.5 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: config.rack1.color1, color: config.rack1.color1 }} />
                    <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} className="w-2.5 h-2.5 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: config.rack1.color2, color: config.rack1.color2 }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Rack 1 - Mobile */}
          <motion.div className="block md:hidden absolute opacity-10 perspective-1000" style={config.rack1.mobileStyle as any}>
            <div className="flex flex-col gap-5 w-[350px]">
              {Array.from({ length: config.rack1.count }).map((_, i) => (
                <div key={i} className="h-16 w-full border border-cyan-500/40 rounded-xl bg-white/5 flex items-center px-8 relative overflow-hidden">
                  <motion.div animate={{ x: ["-100%", "300%"] }} transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "linear" }} className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent skew-x-12" />
                  <div className="flex gap-4">
                    <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.rack1.color1 }} />
                    <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.rack1.color2 }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Rack 2 - Desktop */}
          <motion.div className="hidden md:block absolute opacity-[0.15] perspective-1000" style={config.rack2.style as any}>
            <div className="flex flex-col gap-4 w-[280px]">
              {Array.from({ length: config.rack2.count }).map((_, i) => (
                <div key={i} className="h-12 w-full border border-cyan-500/40 rounded-xl bg-white/5 flex items-center px-6 relative overflow-hidden">
                  <motion.div animate={{ x: ["-100%", "300%"] }} transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: "linear" }} className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent skew-x-12" />
                  <div className="flex gap-3">
                    <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} className="w-2 h-2 rounded-full" style={{ backgroundColor: config.rack2.color1 }} />
                    <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }} className="w-2 h-2 rounded-full" style={{ backgroundColor: config.rack2.color2 }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Rack 2 - Mobile */}
          <motion.div className="block md:hidden absolute opacity-10 perspective-1000" style={config.rack2.mobileStyle as any}>
            <div className="flex flex-col gap-4 w-[280px]">
              {Array.from({ length: config.rack2.count }).map((_, i) => (
                <div key={i} className="h-12 w-full border border-cyan-500/40 rounded-xl bg-white/5 flex items-center px-6 relative overflow-hidden">
                  <motion.div animate={{ x: ["-100%", "300%"] }} transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: "linear" }} className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent skew-x-12" />
                  <div className="flex gap-3">
                    <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} className="w-2 h-2 rounded-full" style={{ backgroundColor: config.rack2.color1 }} />
                    <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }} className="w-2 h-2 rounded-full" style={{ backgroundColor: config.rack2.color2 }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
