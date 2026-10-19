"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

export interface SelectOption {
  value: string | number;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  className,
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={cn("relative w-full", isOpen ? "z-50" : "z-auto")} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between border rounded-xl px-4 py-3 text-sm text-left focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          isDark 
            ? "bg-black/40 border-white/10 text-white focus:border-cyan-500 hover:border-cyan-500/50" 
            : "bg-white border-slate-200 text-slate-900 focus:border-cyan-400 hover:border-cyan-400",
          isOpen && (isDark ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-cyan-400 ring-1 ring-cyan-400/20"),
          className
        )}
      >
        <span className={cn("block truncate", !selectedOption && (isDark ? "text-zinc-500" : "text-slate-400"))}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isDark ? "text-zinc-400" : "text-slate-500",
            isOpen && "rotate-180 text-cyan-500"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-50 w-full mt-2 rounded-xl shadow-2xl overflow-hidden border",
              isDark ? "bg-[#0c0c0e] border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]" : "bg-white border-slate-200/90 shadow-xl"
            )}
          >
            <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar space-y-0.5">
              {options.length === 0 ? (
                <div className={cn("p-3 text-sm text-center", isDark ? "text-zinc-500" : "text-slate-500")}>No options found</div>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg text-left transition-all",
                      opt.disabled 
                        ? (isDark ? "opacity-50 cursor-not-allowed text-zinc-600" : "opacity-50 cursor-not-allowed text-slate-400")
                        : (value === opt.value
                            ? (isDark 
                                ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30"
                                : "bg-cyan-500/10 text-cyan-700 font-bold border border-cyan-500/20")
                            : (isDark
                                ? "text-zinc-300 hover:bg-white/5 hover:text-white"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900")
                          )
                    )}
                  >
                    <span>{opt.label}</span>
                    {value === opt.value && <Check className="w-4 h-4 text-cyan-500" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
