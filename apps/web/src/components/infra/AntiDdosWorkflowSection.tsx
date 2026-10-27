"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Activity, 
  Server, 
  CheckCircle2, 
  Radio,
  Flame,
  Filter
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { JuniperLogo, MikrotikLogo } from "@/components/EnterpriseInfraBadges";
import { cn } from "@/lib/utils";

interface AntiDdosWorkflowSectionProps {
  mode?: "vps" | "k3s";
}

export function AntiDdosWorkflowSection({ mode = "vps" }: AntiDdosWorkflowSectionProps) {
  const [isAttackMode, setIsAttackMode] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [blockedPackets, setBlockedPackets] = useState(14820);

  // Dynamic increment for blocked attack packets when attack simulation is active
  useEffect(() => {
    if (!isAttackMode) return;
    const interval = setInterval(() => {
      setBlockedPackets(prev => prev + Math.floor(Math.random() * 45) + 15);
    }, 1200);
    return () => clearInterval(interval);
  }, [isAttackMode]);

  const steps = [
    {
      id: 1,
      title: "1. Edge Peering & Anomaly Detection",
      vendor: "MikroTik® RouterOS",
      badge: "L3/L4 Inspection",
      desc: "Our edge routers monitor incoming line-rate packets in real-time. Abnormal packet-per-second (PPS) spikes and connection floods are isolated at the BGP perimeter before entering Masdika's core fabric.",
      detail: "Instantly identifies SYN floods, ACK floods, ICMP storms, and malformed TCP flags at line-rate, preventing upstream interface saturation.",
    },
    {
      id: 2,
      title: "2. Hardware Scrubbing Center",
      vendor: "Juniper Networks® MX/QFX",
      badge: "BGP FlowSpec & Hardware ACL",
      desc: "Juniper silicon hardware filters drop and blackhole malicious attack vectors instantaneously with zero latency degradation for legitimate users.",
      detail: "Automated mitigation against UDP Amplification (DNS/NTP/Memcached), HTTP/2 Rapid Reset, and volumetric floods without consuming your server's vCPU.",
    },
    {
      id: 3,
      title: "3. Clean Traffic Forwarding",
      vendor: "1 Gbps Sidoarjo DC Backbone",
      badge: "< 1.2ms Overhead",
      desc: "Only cryptographically verified and legitimate packets pass through our redundant 1 Gbps backbone pipeline directly to Sidoarjo DC.",
      detail: "Scrubbed clean traffic is routed over low-latency direct cross-connects into Sidoarjo DC server racks with dedicated VPC / private network isolation.",
    },
    {
      id: 4,
      title: mode === "k3s" ? "4. K3s Ingress & Pod Routing" : "4. VPS Hardware Delivery",
      vendor: mode === "k3s" ? "Traefik Ingress + Pod Network" : "KVM Hypervisor + Intel Xeon",
      badge: mode === "k3s" ? "0% Pod Disruption" : "100% VM Responsive",
      desc: mode === "k3s"
        ? "Traefik Ingress distributes clean requests to your container pods inside the VPC without interruption, guaranteeing microservice uptime."
        : "The KVM hypervisor passes clean packets directly to your VPS vNIC interface, keeping CPU utilization stable and your web services responsive.",
      detail: mode === "k3s"
        ? "Flannel CNI delivers clean traffic to target Kubernetes Services while your replica pods continue serving production requests with zero packet drop."
        : "Your VPS instance remains completely immune to bandwidth exhaustion attacks, allowing real customers to checkout and browse without lag.",
    },
  ];

  return (
    <section id="anti-ddos-workflow" className="scroll-mt-24 mb-16 lg:mb-24">
      <div className="relative rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-5 sm:p-8 md:p-12 shadow-xl overflow-hidden transition-all">
        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6 mb-7 sm:mb-10 pb-6 sm:pb-8 border-b border-[var(--border-primary)]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wide border bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>MULTI-LAYER SECURITY ARCHITECTURE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                How Masdika Anti-DDoS Works
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] mt-2 leading-relaxed">
                {mode === "k3s"
                  ? "Interactive simulation demonstrating how automated multi-tier mitigation at our MikroTik edge and Juniper core fabric scrubs millions of malicious packets before they ever reach your K3s cluster at Sidoarjo DC."
                  : "Interactive simulation demonstrating how automated multi-tier security filters out cyber attacks and ensures your Cloud VPS instance remains 100% responsive with zero CPU spikes."}
              </p>
            </div>

            {/* Interactive Simulation Switch (Responsive full-width on mobile) */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3 shrink-0">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Simulate Traffic:</span>
              <div className="w-full sm:w-auto grid grid-cols-2 sm:flex p-1 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] shadow-inner">
                <button
                  type="button"
                  onClick={() => setIsAttackMode(true)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                    isAttackMode
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/60"
                  )}
                >
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Simulate Attack</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAttackMode(false)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                    !isAttackMode
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/60"
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Normal Traffic</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── LIVE INTERACTIVE PIPELINE VISUALIZER ─────────────────────── */}
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4 sm:p-7 md:p-8 mb-6 sm:mb-8 overflow-hidden">
            {/* Visual Header / Real-time Status Bar (Mobile-friendly flex wrap) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--border-primary)] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 animate-pulse", isAttackMode ? "bg-cyan-400" : "bg-emerald-400")} />
                <span className="font-bold text-[var(--text-primary)] truncate text-xs sm:text-sm">
                  {isAttackMode ? "Active Defense: Volumetric Scrubbing Engaged" : "Normal Operation: All Network Telemetry Nominal"}
                </span>
              </div>
              
              {/* Telemetry Pills */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded-md border bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)]">
                  Filter: <strong className="text-cyan-600 dark:text-cyan-400">BGP FlowSpec</strong>
                </span>
                <span className="px-2 py-0.5 rounded-md border bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)]">
                  Scrubbed: <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{isAttackMode ? blockedPackets.toLocaleString() : "0"} pps</strong>
                </span>
                <span className="px-2 py-0.5 rounded-md border bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)]">
                  PoP: <strong className="text-[var(--text-primary)]">Sidoarjo DC</strong>
                </span>
              </div>
            </div>

            {/* 4 Pipeline Stages (Grid 1 column on mobile, 4 on desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative">
              
              {/* STAGE 1: INCOMING TRAFFIC */}
              <div 
                onClick={() => setActiveStep(1)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer text-left relative",
                  activeStep === 1 
                    ? "border-cyan-500 bg-[var(--surface)] shadow-md ring-1 ring-cyan-500/20" 
                    : "border-[var(--border-primary)] bg-[var(--surface)]/70 hover:border-cyan-500/30"
                )}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    STAGE 01
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">
                  Incoming Traffic
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mb-3">
                  {isAttackMode ? "Legitimate Users + Attack Floods" : "Verified Customer Traffic"}
                </div>

                {/* Animated Packet Stream Simulation */}
                <div className="h-6 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] relative overflow-hidden flex items-center px-2 gap-1.5">
                  {isAttackMode ? (
                    <>
                      <motion.div animate={{ x: [0, 80] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-2 h-2 rounded-full bg-slate-500 dark:bg-slate-400 shrink-0 shadow-xs" title="Filtered Attack Packet" />
                      <motion.div animate={{ x: [0, 80] }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear", delay: 0.2 }} className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-xs" title="Legit Visitor" />
                      <motion.div animate={{ x: [0, 80] }} transition={{ repeat: Infinity, duration: 1.7, ease: "linear", delay: 0.4 }} className="w-2 h-2 rounded-full bg-slate-500 dark:bg-slate-400 shrink-0 shadow-xs" title="Filtered Attack Packet" />
                      <motion.div animate={{ x: [0, 80] }} transition={{ repeat: Infinity, duration: 1.4, ease: "linear", delay: 0.6 }} className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-xs" title="Legit Visitor" />
                    </>
                  ) : (
                    <>
                      <motion.div animate={{ x: [0, 80] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-xs" />
                      <motion.div animate={{ x: [0, 80] }} transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 0.5 }} className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-xs" />
                      <motion.div animate={{ x: [0, 80] }} transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }} className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-xs" />
                    </>
                  )}
                </div>
              </div>

              {/* STAGE 2: MIKROTIK BGP EDGE */}
              <div 
                onClick={() => setActiveStep(2)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer text-left relative",
                  activeStep === 2 
                    ? "border-cyan-500 bg-[var(--surface)] shadow-md ring-1 ring-cyan-500/20" 
                    : "border-[var(--border-primary)] bg-[var(--surface)]/70 hover:border-cyan-500/30"
                )}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    STAGE 02
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400">
                    <MikrotikLogo className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">
                  MikroTik® Edge
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mb-3">
                  Rate-Limiting &amp; Tracking
                </div>

                <div className="h-6 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] flex items-center justify-between px-2 text-[10px] font-mono">
                  <span className="text-zinc-500">Inspection:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">Line-Rate</span>
                </div>
              </div>

              {/* STAGE 3: JUNIPER CORE SCRUBBING */}
              <div 
                onClick={() => setActiveStep(3)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer text-left relative",
                  activeStep === 3 
                    ? "border-cyan-500 bg-[var(--surface)] shadow-md ring-1 ring-cyan-500/20" 
                    : "border-[var(--border-primary)] bg-[var(--surface)]/70 hover:border-cyan-500/30"
                )}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    STAGE 03
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400">
                    <JuniperLogo className="w-5 h-auto" />
                  </div>
                </div>
                <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">
                  Juniper® Core Filter
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mb-3">
                  Hardware FlowSpec Drop
                </div>

                <div className="h-6 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] flex items-center justify-between px-2 text-[10px] font-mono">
                  <span className="text-zinc-500">Mitigation:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    {isAttackMode ? "Hardware Scrubbing" : "Standby / Nominal"}
                  </span>
                </div>
              </div>

              {/* STAGE 4: DESTINATION (K3s CLUSTER OR VPS INSTANCE) */}
              <div 
                onClick={() => setActiveStep(4)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer text-left relative",
                  activeStep === 4 
                    ? "border-cyan-500 bg-[var(--surface)] shadow-md ring-1 ring-cyan-500/20" 
                    : "border-[var(--border-primary)] bg-[var(--surface)]/70 hover:border-cyan-500/30"
                )}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    STAGE 04
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400">
                    {mode === "k3s" ? <SiKubernetes className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">
                  {mode === "k3s" ? "K3s Pods / Ingress" : "VPS Server Instance"}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mb-3">
                  Sidoarjo DC • 1 Gbps
                </div>

                <div className="h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between px-2 text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                  <span>Packet Health:</span>
                  <span className="font-bold">100% Clean</span>
                </div>
              </div>

            </div>

            {/* Stage Selector Dots / Guide */}
            <div className="mt-4 pt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>Click any stage to inspect the defense layer:</span>
              <div className="flex gap-1.5 ml-1">
                {[1, 2, 3, 4].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveStep(s)}
                    className={cn(
                      "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer",
                      activeStep === s 
                        ? "bg-cyan-500 text-slate-950 font-black shadow-xs" 
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:border-cyan-500/40"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── DETAILED ACTIVE STAGE ACCORDION/CARD ─────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-5 sm:p-7 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] mb-6 sm:mb-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {activeStep}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-[var(--text-primary)]">
                      {steps[activeStep - 1].title}
                    </h4>
                    <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                      {steps[activeStep - 1].vendor}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border self-start sm:self-auto bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-primary)]">
                  <Filter className="w-3 h-3 text-cyan-500" />
                  {steps[activeStep - 1].badge}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed mb-2.5">
                {steps[activeStep - 1].desc}
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {steps[activeStep - 1].detail}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* ── 4 REAL-TIME TELEMETRY STATS (Consistent Cyan Colors) ──── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="p-3.5 sm:p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col justify-center">
              <span className="text-xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mb-0.5 sm:mb-1">
                1 Gbps
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Backbone Uplink
              </span>
            </div>

            <div className="p-3.5 sm:p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col justify-center">
              <span className="text-xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mb-0.5 sm:mb-1">
                &lt; 1.2 ms
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Scrubbing Latency
              </span>
            </div>

            <div className="p-3.5 sm:p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col justify-center">
              <span className="text-xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mb-0.5 sm:mb-1">
                L3 / L4 / L7
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Multi-Layer Defense
              </span>
            </div>

            <div className="p-3.5 sm:p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col justify-center">
              <span className="text-xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mb-0.5 sm:mb-1">
                98.99%
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Sidoarjo DC SLA
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
