"use client";

import React from "react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { SiIntel, SiMikrotik } from "react-icons/si";
import { ShieldCheck, Cpu, Network } from "lucide-react";

/**
 * Official Juniper Networks Vector Logo
 * ViewBox: 0 0 718.2 196.3
 */
export function JuniperLogo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 718.2 196.3"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Juniper Networks"
      className={className}
      {...props}
    >
      <path d="m352.3 157.6h4.4l22.7 31.3v-31.3h3.9v38h-3.7l-23.4-32.3v32.3h-3.9zm40.7 0h25.1v3.8h-21.1v12.6h20.6v3.8h-20.6v14.1h21.3v3.7h-25.3zm45.5 3.9h-14.3v-3.8h32.6v3.8h-14.3v34.2h-4.1v-34.2zm23.2-3.9h4.2l10 31.4 10.2-31.4h3.5l10.2 31.4 10.1-31.4h3.9l-12.2 38.3h-3.6l-10.3-31.7-10.2 31.7h-3.5zm55.7 19c0-13.5 6.9-19.6 19.1-19.6s19.2 6.1 19.2 19.6c0 13.6-7 19.6-19.2 19.6-12.2.1-19.1-6-19.1-19.6zm34.2.1c0-10.3-4.8-15.8-15.1-15.8s-15 5.5-15 15.8 4.7 15.9 15 15.9c10.3-.1 15.1-5.6 15.1-15.9zm27.6 3.4h-11.4v15.5h-4v-38h16.4c8.8 0 12.8 3.5 12.8 11.1 0 6.6-3.1 10.4-9.7 11.3l9.2 15.6h-4.3zm1.2-3.7c5.4 0 8.7-1.6 8.7-7.6 0-5.9-3.2-7.4-8.9-7.4h-12.4v15.1h12.6zm32.9-.9-7.6 8.3v11.9h-3.9v-38h3.9v21l19.2-21h4.7l-13.6 14.8 15.5 23.1h-4.6zm21.5 16.3 2.1-3.1c4.6 2.9 9 3.8 13.6 3.8 7.9 0 11.3-2.2 11.3-7.4 0-5.4-4.5-6.2-11.3-7.4-8.2-1.4-13.7-2.8-13.7-10.5 0-7.3 4.7-10.2 13.7-10.2 6 0 10.2 1.3 13.2 3.4l-2.2 3.3c-2.7-1.8-6.8-3-11.1-3-6.8 0-9.7 1.9-9.7 6.4 0 4.8 4 5.7 10.7 7 8.3 1.5 14.3 2.7 14.3 10.9 0 7.5-4.8 11.2-15.2 11.2-5.7-.1-10.8-1.2-15.7-4.4zm70.7-191.3c-53.4 0-55.7 23.9-55.7 57.7v82.9h12.6v-82.9c0-25.5-1-45.9 43.1-45.9 4.7 0 8.9.2 12.7.7v-12c-3.9-.3-8.1-.5-12.7-.5zm-623.3 86.7v-83.9h12.9v84.2c0 24.2-.2 44.6 44.1 44.6 44.1 0 43.1-20.4 43.1-45.9v-82.9h12.6v82.9c0 33.8-2.3 57.7-55.7 57.7-53.7 0-57-23.9-57-56.7zm246.7-30v83.9h-12.9v-84.1c0-24.2.3-44.6-44.1-44.6-44.1 0-43.1 20.4-43.1 45.9v82.9h-12.6v-83c0-33.8 2.3-57.7 55.7-57.7 53.7 0 57 24 57 56.7zm23.4-53.7h12.3v137.6h-12.3zm35.4 0h64.4c32 0 46.4 15.9 46.4 44.1 0 28.4-14.3 45.7-46.6 45.7h-51.9v47.8h-12.3zm64.6 77.5c22.3 0 33.3-10.8 33.3-32.8 0-21.9-11.9-32.3-33.9-32.3h-51.7v65.1zm60.6-9.2c0-40.6 11.6-71.8 63.5-71.8 53.7 0 55.5 36 55.2 74.1h-106.3c.3 33.5 8.6 58.5 52.2 58.5 23.2 0 33.8-6.3 45.1-14.6l7.1 9.3c-12.6 9.3-27.5 16.6-52.2 16.6-54.5 0-64.6-31.5-64.6-72.1zm12.7-9.3h93.8c-1.3-27.5-3-50.9-43.1-50.9-38.6 0-49.2 20.9-50.7 50.9zm-520.8 108.5c53.4 0 55.7-23.9 55.7-57.7v-110h-12.6v110c0 25.5 1 45.9-43.1 45.9-1.7 0-3.3 0-4.8-.1v11.9zm685.2-29.2c-4.8 0-8.7-3.9-8.7-8.7s3.9-8.7 8.7-8.7 8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7zm0-16.3c-4.2 0-7.6 3.4-7.6 7.6s3.4 7.6 7.6 7.6 7.6-3.4 7.6-7.6-3.4-7.6-7.6-7.6z" />
      <path d="m690.6 134.2h-2.8v3.8h-1.3v-10h4.4c2.5 0 3.5 1 3.5 3 0 1.6-.7 2.7-2.4 3l2.3 3.9h-1.4zm.3-1.2c1.4 0 2.1-.4 2.1-1.9 0-1.4-.8-1.8-2.2-1.8h-3.1v3.6h3.2z" />
    </svg>
  );
}

/**
 * Official Intel Vector Logo
 */
export function IntelLogo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return <SiIntel className={className} {...(props as any)} />;
}

/**
 * Official MikroTik Vector Logo
 */
export function MikrotikLogo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return <SiMikrotik className={className} {...(props as any)} />;
}

/**
 * Full Enterprise Infrastructure Trust Showcase (Top Banner variant)
 */
export function EnterpriseInfraBanner() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-3xl border p-4 sm:p-6 md:p-8 shadow-md relative overflow-hidden transition-all",
        isDark
          ? "bg-[#0b1322] border-slate-800/80 shadow-md"
          : "bg-white border-slate-200 shadow-sm"
      )}
    >
      <div className="relative z-10">
        {/* Header */}
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b transition-colors", isDark ? "border-slate-800/80" : "border-slate-100")}>
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
                isDark
                  ? "bg-slate-800/80 border-slate-700 text-cyan-400"
                  : "bg-slate-100 border-slate-200 text-cyan-700"
              )}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn("text-sm sm:text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Enterprise Infrastructure & Hardware
                </h3>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sidoarjo DC
                </span>
              </div>
              <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
                Engineered with genuine enterprise processors & carrier-grade routing for 98.99% uptime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono shrink-0 self-start sm:self-auto">
            <span className={cn("px-2.5 py-1 rounded-lg border font-semibold", isDark ? "bg-[#060b14] border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
              1 Gbps Uplink
            </span>
            <span className={cn("px-2.5 py-1 rounded-lg border font-semibold", isDark ? "bg-[#060b14] border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
              Anti-DDoS BGP
            </span>
          </div>
        </div>

        {/* 3 Pillars: Intel Compute, Juniper Core, MikroTik Edge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* 1. Intel Compute */}
          <div
            className={cn(
              "p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between",
              isDark
                ? "bg-[#060b14] border-slate-800 hover:border-slate-700"
                : "bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-xs"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
                      isDark
                        ? "bg-slate-800/80 border-slate-700 text-cyan-400"
                        : "bg-slate-100 border-slate-200 text-cyan-700"
                    )}
                  >
                    <IntelLogo className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={cn("font-bold text-sm leading-tight", isDark ? "text-white" : "text-slate-900")}>
                      Intel® Xeon®
                    </div>
                    <div className={cn("text-[10px] font-semibold uppercase tracking-wider mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      Compute Architecture
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border shrink-0", isDark ? "bg-slate-800/80 text-slate-400 border-slate-700/80" : "bg-slate-100 text-slate-600 border-slate-200")}>
                  COMPUTE
                </span>
              </div>
              <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                High-performance Intel Xeon processor nodes with AVX-512 acceleration and dedicated hardware virtualization.
              </p>
            </div>
          </div>

          {/* 2. Juniper Networks Core */}
          <div
            className={cn(
              "p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between",
              isDark
                ? "bg-[#060b14] border-slate-800 hover:border-slate-700"
                : "bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-xs"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
                      isDark
                        ? "bg-slate-800/80 border-slate-700 text-cyan-400"
                        : "bg-slate-100 border-slate-200 text-cyan-700"
                    )}
                  >
                    <JuniperLogo className="w-6 h-auto" />
                  </div>
                  <div className="min-w-0">
                    <div className={cn("font-bold text-sm leading-tight", isDark ? "text-white" : "text-slate-900")}>
                      Juniper Networks®
                    </div>
                    <div className={cn("text-[10px] font-semibold uppercase tracking-wider mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      Core Routing Backbone
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border shrink-0", isDark ? "bg-slate-800/80 text-slate-400 border-slate-700/80" : "bg-slate-100 text-slate-600 border-slate-200")}>
                  CORE NET
                </span>
              </div>
              <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Carrier-grade Juniper MX & QFX core switching fabric ensuring zero-packet-drop routing and redundant 1 Gbps uplinks.
              </p>
            </div>
          </div>

          {/* 3. MikroTik Edge & BGP */}
          <div
            className={cn(
              "p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between",
              isDark
                ? "bg-[#060b14] border-slate-800 hover:border-slate-700"
                : "bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-xs"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
                      isDark
                        ? "bg-slate-800/80 border-slate-700 text-cyan-400"
                        : "bg-slate-100 border-slate-200 text-cyan-700"
                    )}
                  >
                    <MikrotikLogo className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={cn("font-bold text-sm leading-tight", isDark ? "text-white" : "text-slate-900")}>
                      MikroTik® RouterOS
                    </div>
                    <div className={cn("text-[10px] font-semibold uppercase tracking-wider mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      Edge & BGP Gateway
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border shrink-0", isDark ? "bg-slate-800/80 text-slate-400 border-slate-700/80" : "bg-slate-100 text-slate-600 border-slate-200")}>
                  EDGE BGP
                </span>
              </div>
              <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Hardware-accelerated edge routing with dynamic multi-homed BGP peering, NAT gateway isolation, and traffic shaping.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Infrastructure Trust Card for Order Summary Sidebars
 */
export function EnterpriseInfraSidebarCard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all relative overflow-hidden",
        isDark ? "bg-[#060b14] border-slate-800 shadow-sm" : "bg-slate-50/80 border-slate-200 shadow-xs"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
        <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-slate-300" : "text-slate-700")}>
          Enterprise Infrastructure
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Intel */}
        <div
          className={cn(
            "p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-colors",
            isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
          )}
          title="Server powered by Intel® Xeon® processors"
        >
          <div className={cn("w-6 h-6 flex items-center justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
            <IntelLogo className="w-5 h-5" />
          </div>
          <span className={cn("text-[10px] font-bold leading-tight", isDark ? "text-slate-200" : "text-slate-800")}>
            Intel® Xeon®
          </span>
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Compute</span>
        </div>

        {/* Juniper */}
        <div
          className={cn(
            "p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-colors",
            isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
          )}
          title="Core network powered by Juniper Networks®"
        >
          <div className={cn("w-6 h-6 flex items-center justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
            <JuniperLogo className="w-5 h-auto" />
          </div>
          <span className={cn("text-[10px] font-bold leading-tight", isDark ? "text-slate-200" : "text-slate-800")}>
            Juniper®
          </span>
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Core Net</span>
        </div>

        {/* MikroTik */}
        <div
          className={cn(
            "p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-colors",
            isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
          )}
          title="Edge routing powered by MikroTik® RouterOS"
        >
          <div className={cn("w-6 h-6 flex items-center justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
            <MikrotikLogo className="w-4 h-4" />
          </div>
          <span className={cn("text-[10px] font-bold leading-tight", isDark ? "text-slate-200" : "text-slate-800")}>
            MikroTik®
          </span>
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Edge BGP</span>
        </div>
      </div>

      <div className={cn("pt-2.5 border-t flex items-center justify-between text-[10px] font-medium", isDark ? "border-slate-800 text-zinc-400" : "border-slate-200 text-slate-500")}>
        <span>Sidoarjo DC • 1 Gbps</span>
        <span className="text-emerald-400 font-bold">98.99% SLA</span>
      </div>
    </div>
  );
}

/**
 * CPU Specification Pill for vCPU selection in VpsCheckoutFlow
 */
export function IntelCpuBadge({ className }: { className?: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all shadow-xs",
        isDark
          ? "bg-[#060b14] border-slate-800 text-slate-300 hover:border-slate-700"
          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300",
        className
      )}
    >
      <IntelLogo className="w-4 h-4 text-cyan-400 shrink-0" />
      <span className="font-bold">Intel® Xeon® Processor</span>
      <span className={cn("text-[10px] opacity-75 hidden sm:inline", isDark ? "text-cyan-400/80" : "text-cyan-700")}>
        · Enterprise Cores
      </span>
    </div>
  );
}

/**
 * Network Infrastructure Badge for Networking selection in VpsCheckoutFlow
 */
export function NetworkInfraBadge({ className }: { className?: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all shadow-xs",
        isDark
          ? "bg-[#060b14] border-slate-800 text-slate-300 hover:border-slate-700"
          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-cyan-400">
        <JuniperLogo className="w-4 h-auto" />
        <span className="font-bold text-[11px] text-slate-300 dark:text-slate-200">Juniper Core</span>
      </div>
      <span className="text-slate-600 dark:text-slate-500">•</span>
      <div className="flex items-center gap-1.5 text-cyan-400">
        <MikrotikLogo className="w-3.5 h-3.5" />
        <span className="font-bold text-[11px] text-slate-300 dark:text-slate-200">MikroTik BGP</span>
      </div>
      <span className="text-slate-600 dark:text-slate-500">•</span>
      <span className="text-[10px] font-mono text-cyan-400 font-semibold">1 Gbps</span>
    </div>
  );
}
