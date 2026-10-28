"use client";

import React from "react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { SiIntel, SiMikrotik, SiDell, SiJunipernetworks } from "react-icons/si";
import { ShieldCheck } from "lucide-react";

/**
 * Official Dell Vector Logo
 */
export function DellLogo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return <SiDell className={className} {...(props as any)} />;
}

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
 * Compact Architectural Hardware Specification Bar (Top Strip variant)
 */
export function EnterpriseInfraBanner({ className }: { className?: string } = {}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const specs = [
    {
      name: "Intel® Xeon®",
      role: "AVX-512 Compute Nodes",
      logo: <IntelLogo className="w-5 h-5" />,
    },
    {
      name: "Juniper Networks®",
      role: "Core Switching Fabric",
      logo: <JuniperLogo className="w-6 h-auto" />,
    },
    {
      name: "MikroTik® RouterOS",
      role: "Multi-Homed BGP Edge",
      logo: <MikrotikLogo className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] px-4 py-3.5 sm:px-5 sm:py-4 transition-all shadow-xs",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Datacenter Status & SLA */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-cyan-600 dark:text-cyan-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-[var(--text-primary)]">
                Enterprise Bare-Metal Infrastructure
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sidoarjo DC
              </span>
            </div>
            <p className="text-[11px] mt-0.5 leading-normal text-[var(--text-secondary)]">
              1 Gbps redundant uplink · Anti-DDoS BGP · 98.99% uptime SLA
            </p>
          </div>
        </div>

        {/* Right: 3 Hardware Pillars Inline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 lg:w-auto shrink-0">
          {specs.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-[var(--border-primary)] bg-[var(--surface)] text-cyan-600 dark:text-cyan-400">
                {item.logo}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight truncate text-[var(--text-primary)]">
                  {item.name}
                </div>
                <div className="text-[10px] leading-tight truncate mt-0.5 text-[var(--text-secondary)]">
                  {item.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Infrastructure Trust Card for Order Summary Sidebars (MikroTik, Juniper, Dell)
 */
export function EnterpriseInfraSidebarCard({ className }: { className?: string }) {
  const brands = [
    {
      name: "MikroTik",
      role: "Edge BGP",
      icon: <SiMikrotik className="w-3.5 h-3.5" />,
      color: "text-slate-800 dark:text-white",
      title: "Edge routing & VPC powered by MikroTik® RouterOS",
    },
    {
      name: "Juniper",
      role: "Core Fabric",
      icon: <JuniperLogo className="h-2.5 sm:h-3 w-auto" />,
      color: "text-[#00A98F] dark:text-[#2dd4bf]",
      title: "Core switching & backbone powered by Juniper Networks®",
    },
    {
      name: "Dell",
      role: "PowerEdge",
      icon: <SiDell className="w-3.5 h-3.5" />,
      color: "text-[#007DB8] dark:text-[#38bdf8]",
      title: "Server hardware powered by Dell PowerEdge",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] p-3 sm:p-3.5 transition-all shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Enterprise Stack
          </span>
        </div>
        <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          98.99% SLA
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {brands.map((b) => (
          <div
            key={b.name}
            className="py-2 px-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 flex flex-col items-center justify-center text-center gap-1 transition-all group cursor-default"
            title={b.title}
          >
            <div className={cn("h-4 flex items-center justify-center transition-transform group-hover:scale-110", b.color)}>
              {b.icon}
            </div>
            <span className="text-[10px] font-bold leading-none text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {b.name}
            </span>
            <span className="text-[8px] leading-none text-[var(--text-muted)]">
              {b.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CPU Specification Pill for vCPU selection in VpsCheckoutFlow
 */
export function IntelCpuBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-xs font-medium transition-all",
        className
      )}
    >
      <IntelLogo className="w-4 h-4 text-[#0071C5] dark:text-[#38bdf8] shrink-0" />
      <span className="font-semibold text-[11px] text-[var(--text-primary)]">Intel® Xeon®</span>
      <span className="text-[10px] hidden sm:inline text-[var(--text-muted)]">
        · Dedicated Cores
      </span>
    </div>
  );
}

/**
 * Network Infrastructure Badge for Networking selection in VpsCheckoutFlow
 */
export function NetworkInfraBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-xs font-medium transition-all",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
        <JuniperLogo className="w-4 h-auto text-[#00A98F] dark:text-[#2dd4bf]" />
        <span className="font-semibold text-[11px] text-[var(--text-primary)]">Juniper</span>
      </div>
      <span className="text-[var(--text-muted)]">·</span>
      <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
        <MikrotikLogo className="w-3.5 h-3.5 text-slate-800 dark:text-white" />
        <span className="font-semibold text-[11px] text-[var(--text-primary)]">MikroTik BGP</span>
      </div>
    </div>
  );
}
