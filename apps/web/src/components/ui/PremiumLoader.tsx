"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

export function PremiumLoader({ inline = false }: { inline?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={cn(
      "flex flex-col items-center justify-center overflow-hidden transition-colors duration-300",
      inline
        ? "relative py-20 min-h-[300px]"
        : cn("fixed inset-0 z-[100]", isDark ? "bg-[#050B14]" : "bg-[#f8fafb]")
    )}>
      {/* Background Glows */}
      {!inline && (
        <>
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full pointer-events-none blur-[100px] md:blur-[120px]",
            isDark ? "bg-cyan-500/20" : "hidden"
          )} />
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[300px] h-[200px] md:h-[300px] rounded-full pointer-events-none blur-[80px] md:blur-[100px]",
            isDark ? "bg-cyan-500/20" : "hidden"
          )} />
        </>
      )}
      
      {/* Main Loader Container */}
      <div className={cn("relative z-10 flex flex-col items-center", inline ? "scale-75 md:scale-100" : "")}>
        <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
          {/* Outer glowing ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute inset-0 rounded-full border-2 border-transparent",
              isDark
                ? "border-t-cyan-400 border-r-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                : "border-t-cyan-500 border-r-cyan-500"
            )}
          />
          {/* Middle reverse glowing ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute inset-3 md:inset-4 rounded-full border-2 border-transparent",
              isDark
                ? "border-b-cyan-400 border-l-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                : "border-b-cyan-600 border-l-cyan-600"
            )}
          />
          {/* Inner rotating & pulsing ring */}
          <motion.div
            animate={{ rotate: 360, scale: [0.85, 1.05, 0.85] }}
            transition={{
              rotate: { duration: 5, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
            className={cn(
              "absolute inset-6 md:inset-8 rounded-full border-2 border-transparent backdrop-blur-sm",
              isDark
                ? "border-t-cyan-300/80 border-b-cyan-300/40 bg-gradient-to-br from-cyan-400/20 to-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                : "border-t-cyan-400 border-b-cyan-300 bg-gradient-to-br from-cyan-100/60 to-cyan-200/40"
            )}
          />
          {/* Center dot */}
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "w-3.5 h-3.5 md:w-4 md:h-4 rounded-full",
              isDark
                ? "bg-white shadow-[0_0_20px_rgba(255,255,255,1)]"
                : "bg-cyan-500 shadow-sm"
            )}
          />
        </div>

        {/* Text */}
        <div className="mt-8 md:mt-10 flex flex-col items-center">
          <motion.h3
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "font-black tracking-[0.4em] md:tracking-[0.5em] text-sm mb-3 ml-2",
              isDark ? "text-cyan-400" : "text-cyan-700"
            )}
          >
            INITIALIZING
          </motion.h3>
          <div className="flex gap-1.5 md:gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                className={cn(
                  "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                  isDark ? "bg-cyan-400" : "bg-cyan-600"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
