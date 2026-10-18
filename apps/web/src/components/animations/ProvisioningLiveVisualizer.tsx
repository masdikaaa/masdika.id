"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Copy, Check, Terminal } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface LogLine {
  module: string;
  message: string;
  time?: string;
  isCommand?: boolean;
}

interface StatLine {
  value: string;
  label: string;
}

interface ProvisioningVisualizerProps {
  logs: LogLine[];
  stats?: StatLine[];
  title?: string;
  iconType?: "vps" | "k3s" | "api-hub" | "file-cdn" | "shortener";
  targetServer?: string;
  provisionEstimate?: string;
}

export function ProvisioningLiveVisualizer({
  logs,
  title = "PROVISIONING",
  targetServer = "Dell PowerEdge R630 • Sidoarjo DC",
  provisionEstimate = "Backend: KVM Hypervisor (Estimasi ~5 Menit)",
}: ProvisioningVisualizerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeStep, setActiveStep] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        setActiveStep(0);
        setIsCompleted(false);
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (activeStep < logs.length) {
      const timer = setTimeout(() => {
        if (activeStep === logs.length - 1) {
          setIsCompleted(true);
        }
        setActiveStep((prev) => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [activeStep, isCompleted, logs.length]);

  const progress = Math.min(Math.floor((activeStep / logs.length) * 100), 100);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div
      className={cn(
        "w-full rounded-3xl overflow-hidden relative border shadow-2xl transition-all duration-300",
        isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-slate-200/90 shadow-xl"
      )}
    >
      {/* Top Gradient Progress Bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", isDark ? "bg-white/5" : "bg-slate-100")}>
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] transform-gpu will-change-transform"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="p-5 sm:p-7 md:p-8 lg:p-9">
        {/* Terminal Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-inherit">
          <div className="flex items-center gap-3">
            {/* macOS-style Window Dots */}
            <div className="flex items-center gap-1.5 mr-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div>
              <h3 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>{title}</span>
              </h3>
              <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                {isCompleted ? "Provisioning cycle finished successfully." : "Simulating real-time automated infrastructure allocation..."}
              </p>
            </div>
          </div>

          {/* Progress / Status Pill */}
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border transition-colors",
                isCompleted
                  ? isDark
                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : isDark
                    ? "bg-cyan-950/50 border-cyan-500/30 text-cyan-300"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isCompleted ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"
                )}
              />
              {isCompleted ? "READY" : "RUNNING"}
            </span>

            <span className={cn("text-2xl sm:text-3xl font-black font-mono tracking-tight", isDark ? "text-cyan-400" : "text-cyan-600")}>
              {progress}%
            </span>
          </div>
        </div>

        {/* Stepper / Live Terminal Logs - Full Width */}
        <div className="space-y-2 sm:space-y-3">
          {logs.map((log, idx) => {
            const isActive = idx === activeStep;
            const isPast = idx < activeStep;

            return (
              <div
                key={idx}
                className={cn(
                  "relative flex items-start gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl transition-all duration-300",
                  isActive
                    ? isDark
                      ? "bg-cyan-500/[0.07] border border-cyan-500/30 shadow-[0_0_20px_rgba(0,210,255,0.06)]"
                      : "bg-cyan-50/90 border border-cyan-200 shadow-sm"
                    : "border border-transparent",
                  isPast || isActive ? "opacity-100" : "opacity-35"
                )}
              >
                {/* Stepper Node & Connecting Line */}
                <div className="relative flex flex-col items-center pt-0.5 shrink-0">
                  <div
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300",
                      isPast
                        ? isDark
                          ? "bg-cyan-950/60 border-cyan-400 text-cyan-400"
                          : "bg-cyan-50 border-cyan-500 text-cyan-600"
                        : isActive
                          ? isDark
                            ? "bg-[var(--surface)] border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                            : "bg-white border-cyan-500 text-cyan-600 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : isDark
                            ? "bg-[var(--surface)] border-[var(--border-primary)] text-zinc-600"
                            : "bg-white border-slate-200 text-slate-300"
                    )}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isActive
                            ? "bg-cyan-400 animate-pulse"
                            : isDark
                              ? "bg-zinc-700"
                              : "bg-slate-300"
                        )}
                      />
                    )}
                  </div>

                  {idx !== logs.length - 1 && (
                    <div
                      className={cn(
                        "absolute top-8 bottom-[-16px] sm:bottom-[-20px] w-[2px] transition-colors duration-500",
                        isPast
                          ? "bg-cyan-500/40"
                          : isDark
                            ? "bg-white/10"
                            : "bg-slate-200"
                      )}
                    />
                  )}
                </div>

                {/* Log Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase border",
                        isActive
                          ? isDark
                            ? "bg-cyan-950/80 border-cyan-400/40 text-cyan-300 shadow-sm"
                            : "bg-cyan-100/80 border-cyan-300 text-cyan-800"
                          : isPast
                            ? isDark
                              ? "bg-white/5 border-white/10 text-zinc-300"
                              : "bg-slate-100 border-slate-200 text-slate-600"
                            : isDark
                              ? "bg-white/5 border-white/5 text-zinc-500"
                              : "bg-slate-50 border-slate-200/60 text-slate-400"
                      )}
                    >
                      {log.module}
                    </span>

                    {log.time && (
                      <span className={cn("text-[11px] font-mono", isDark ? "text-zinc-500" : "text-slate-400")}>
                        {log.time}
                      </span>
                    )}
                  </div>

                  {/* Message / Command Display */}
                  {log.isCommand ? (
                    <div
                      className={cn(
                        "mt-1.5 flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl font-mono text-xs sm:text-[13px] border transition-colors",
                        isDark
                          ? "bg-[var(--surface-secondary)] border-cyan-500/30 text-emerald-400"
                          : "bg-slate-900 border-slate-800 text-emerald-400"
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-x-auto min-w-0">
                        <span className="text-zinc-500 select-none">$</span>
                        <code className="break-all">{log.message}</code>
                      </div>
                      <button
                        onClick={() => handleCopy(log.message, idx)}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors shrink-0"
                        title="Copy command"
                        aria-label="Copy command"
                      >
                        {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "text-xs sm:text-sm font-medium leading-relaxed transition-colors",
                        isActive
                          ? isDark
                            ? "text-white"
                            : "text-slate-900 font-semibold"
                          : isPast
                            ? isDark
                              ? "text-zinc-300"
                              : "text-slate-700"
                            : isDark
                              ? "text-zinc-500"
                              : "text-slate-400"
                      )}
                    >
                      {log.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Status Bar */}
        <div
          className={cn(
            "mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-mono",
            isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>Target: {targetServer}</span>
          </div>
          <div>
            <span>{provisionEstimate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ProvisioningLiveVisualizer as ProvisioningVisualizer };
