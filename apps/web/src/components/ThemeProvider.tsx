"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem("masdika-theme", theme);
  } catch {}
  document.cookie = `masdika-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialTheme = "light" }: { children: React.ReactNode, initialTheme?: Theme }) {
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
    applyThemeToDom(theme);
    persistTheme(theme);
  }, [theme, mounted]);

  const themeRef = useRef<Theme>(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const switchTheme = useCallback((next: Theme) => {
    if (next === themeRef.current) return;
    themeRef.current = next;

    const root = document.documentElement;
    // Disable every CSS transition/animation-driven colour change while the
    // theme flips, so the browser only has to animate a single crossfade.
    root.classList.add("theme-switching");

    const commit = () => {
      // Apply the class synchronously so the "new" snapshot is the new theme.
      applyThemeToDom(next);
      flushSync(() => setThemeState(next));
      persistTheme(next);
    };

    const done = () => {
      // Wait two frames so no transition runs after the class is removed.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => root.classList.remove("theme-switching"))
      );
    };

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      commit();
      done();
      return;
    }

    const transition = document.startViewTransition(commit);
    transition.finished.then(done, done);
  }, []);

  const toggleTheme = useCallback(() => {
    switchTheme(themeRef.current === "dark" ? "light" : "dark");
  }, [switchTheme]);

  const setTheme = useCallback((t: Theme) => {
    switchTheme(t);
  }, [switchTheme]);

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
