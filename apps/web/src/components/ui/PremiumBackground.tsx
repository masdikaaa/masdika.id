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
          opacity: 0.05,
          backgroundImage: `
            linear-gradient(to right, ${isDark ? "#ffffff" : "#000000"} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDark ? "#ffffff" : "#000000"} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Animated Aurora Glows */}
      <div
        className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] rounded-full blur-[120px] animate-pulse transition-colors duration-500"
        style={{ backgroundColor: isDark ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.06)" }}
      />

      <div
        className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full blur-[130px] animate-pulse transition-colors duration-500"
        style={{ 
          backgroundColor: isDark ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.05)",
          animationDelay: '2s', 
          animationDuration: '20s' 
        }}
      />

      <div
        className="absolute top-[30%] left-[20%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full blur-[100px] animate-pulse transition-colors duration-500"
        style={{ 
          backgroundColor: isDark ? "rgba(6, 182, 212, 0.1)" : "rgba(6, 182, 212, 0.03)",
          animationDelay: '5s', 
          animationDuration: '18s' 
        }}
      />

      {/* Vignette Overlay to darken/lighten edges */}
      <div 
        className="absolute inset-0 transition-colors duration-500"
        style={{ 
          background: `radial-gradient(ellipse at center, transparent 0%, ${isDark ? "#050B14" : "#f8fafb"} 100%)`,
          opacity: isDark ? 0.8 : 0.6 
        }}
      />
    </div>
  );
}
