"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface AdminLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AdminLoader({ className, size = "md" }: AdminLoaderProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("min-h-[60vh] w-full flex items-center justify-center", className)}>
      <RefreshCw
        className={cn(
          sizeClasses[size],
          "animate-spin",
          isDark ? "text-cyan-500" : "text-cyan-700"
        )}
      />
    </div>
  );
}

export default AdminLoader;
