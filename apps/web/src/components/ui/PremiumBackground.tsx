"use client";

import { useTheme } from "@/components/ThemeProvider";

export function PremiumBackground() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] transition-colors duration-500"
      style={{ backgroundColor: isDark ? "#050B14" : "#f8fafb" }}
    >
      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 transition-opacity duration-500" 
        style={{
          opacity: isDark ? 0.07 : 0.05,
          backgroundImage: `
            linear-gradient(to right, ${isDark ? "#ffffff" : "#000000"} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDark ? "#ffffff" : "#000000"} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}
