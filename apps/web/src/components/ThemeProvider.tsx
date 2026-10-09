"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialTheme = "dark" }: { children: React.ReactNode, initialTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // If client localStorage differs from cookie/server initialTheme, sync them
    const stored = localStorage.getItem("masdika-theme") as Theme | null;
    if (stored && stored !== initialTheme && (stored === "light" || stored === "dark")) {
      setThemeState(stored);
      document.cookie = `masdika-theme=${stored}; path=/; max-age=31536000; SameSite=Lax`;
    }
    setMounted(true);
  }, [initialTheme]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("masdika-theme", theme);
    document.cookie = `masdika-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    if (!document.startViewTransition) {
      setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
      return;
    }
    
    document.startViewTransition(() => {
      flushSync(() => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
      });
    });
  }, []);

  const setTheme = useCallback((t: Theme) => {
    if (!document.startViewTransition) {
      setThemeState(t);
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => {
        setThemeState(t);
      });
    });
  }, []);

  // Prevent flash by rendering nothing until mounted
  // Actually, we should still render children to avoid layout shift
  // The CSS will handle the flash prevention

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
