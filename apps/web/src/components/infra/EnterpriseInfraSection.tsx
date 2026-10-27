"use client";

import React from "react";
import { ShieldCheck, Cpu, Network, Server, Activity, CheckCircle2 } from "lucide-react";
import { IntelLogo, JuniperLogo, MikrotikLogo } from "@/components/EnterpriseInfraBadges";
import { FadeIn } from "@/components/animations/FadeIn";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface EnterpriseInfraSectionProps {
  mode?: "vps" | "k3s";
}

export function EnterpriseInfraSection({ mode = "vps" }: EnterpriseInfraSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section id="support-infra" className="scroll-mt-24 mb-16 lg:mb-24">
      {/* Outer Card Container */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-5 sm:p-8 md:p-12 shadow-xl overflow-hidden transition-all">
        <div className="relative z-10">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6 mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-[var(--border-primary)]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wide border bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SUPPORTING INFRASTRUCTURE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                Enterprise Hardware &amp; Carrier-Grade Network
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] mt-2 leading-relaxed">
                {mode === "k3s"
                  ? "Every Masdika K3s Kubernetes cluster is deployed on genuine Dell PowerEdge servers with high-frequency Intel® Xeon® processors, carrier-grade Juniper Networks® core fabric, and MikroTik® edge routing at Sidoarjo DC."
                  : "Masdika Cloud VPS instances are backed by dedicated Intel® Xeon® processor nodes, enterprise Juniper Networks® switching fabric, and hardware-accelerated MikroTik® edge BGP routing hosted on-premise at Sidoarjo DC."}
              </p>
            </div>

            {/* Key Specs Pills */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
              <span className="px-3 py-1.5 rounded-xl border font-bold bg-[var(--surface-secondary)] border-[var(--border-primary)] text-cyan-600 dark:text-cyan-400">
                1 Gbps Uplink
              </span>
              <span className="px-3 py-1.5 rounded-xl border font-bold bg-[var(--surface-secondary)] border-[var(--border-primary)] text-emerald-600 dark:text-emerald-400">
                Sidoarjo DC
              </span>
              <span className="px-3 py-1.5 rounded-xl border font-bold bg-[var(--surface-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)]">
                Anti-DDoS BGP
              </span>
            </div>
          </div>

          {/* 3 Pillars Grid: Intel, Juniper, MikroTik */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* 1. Intel Compute */}
            <FadeIn delay={0.1} direction="up" className="h-full">
              <div className="p-5 sm:p-7 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex flex-col justify-between h-full hover:border-cyan-500/40 transition-all duration-300 shadow-sm group">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border transition-colors bg-cyan-50 dark:bg-slate-800/80 border-cyan-200/80 dark:border-slate-700 text-cyan-700 dark:text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                      <IntelLogo className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-primary)]">
                      Compute Architecture
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1">
                    Intel® Xeon® Processors
                  </h3>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2.5 sm:mb-3">
                    High-Frequency Dedicated Cores
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-5 sm:mb-6">
                    Multi-core Intel Xeon processor nodes equipped with AVX-512 vector acceleration and registered ECC DDR4 RAM, ensuring rock-solid compute stability for demanding workloads.
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-primary)] space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Dedicated Hardware Virtualization</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>AVX-512 Compute Acceleration</span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* 2. Juniper Networks Core Fabric */}
            <FadeIn delay={0.2} direction="up" className="h-full">
              <div className="p-5 sm:p-7 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex flex-col justify-between h-full hover:border-cyan-500/40 transition-all duration-300 shadow-sm group">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border transition-colors bg-cyan-50 dark:bg-slate-800/80 border-cyan-200/80 dark:border-slate-700 text-cyan-700 dark:text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                      <JuniperLogo className="w-7 h-auto sm:w-8 sm:h-auto" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-primary)]">
                      Core Backbone
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1">
                    Juniper Networks®
                  </h3>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2.5 sm:mb-3">
                    Carrier-Grade Routing Fabric
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-5 sm:mb-6">
                    Telecom-grade Juniper MX &amp; QFX switching fabric delivering zero-packet-drop routing and redundant 1 Gbps uplinks to Tier-1 upstream Indonesia Internet Exchanges.
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-primary)] space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Hardware BGP FlowSpec Filtering</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Redundant 1 Gbps Datacenter Uplink</span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* 3. MikroTik Edge Peering */}
            <FadeIn delay={0.3} direction="up" className="h-full">
              <div className="p-5 sm:p-7 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex flex-col justify-between h-full hover:border-cyan-500/40 transition-all duration-300 shadow-sm group">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border transition-colors bg-cyan-50 dark:bg-slate-800/80 border-cyan-200/80 dark:border-slate-700 text-cyan-700 dark:text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                      <MikrotikLogo className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-primary)]">
                      Edge Gateway
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1">
                    MikroTik® RouterOS
                  </h3>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2.5 sm:mb-3">
                    Edge BGP &amp; Firewall Peering
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-5 sm:mb-6">
                    Hardware-accelerated edge routing with dynamic multi-homed BGP peering, isolated VPC NAT gateways, and stateful high-throughput line-rate packet inspection.
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-primary)] space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Dynamic Multi-Homed BGP Peering</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Stateful Edge Firewall &amp; NAT Isolation</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Bottom Trust Banner */}
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[var(--border-primary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold text-[var(--text-primary)]">On-Premise Facility at Sidoarjo DC</span>
              <span className="hidden sm:inline">•</span>
              <span>Sub-20ms national latency across Indonesia</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-medium shrink-0">
              <span>98.99% Hardware SLA</span>
              <span>•</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">Anti-DDoS Shield Active</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
