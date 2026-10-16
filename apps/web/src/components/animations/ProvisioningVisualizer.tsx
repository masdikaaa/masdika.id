"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Server, Database, Cpu, Network, HardDrive, Shield, Cable, Unlock, Box, Activity, Globe, ShipWheel, Link2, Code } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface LogLine {
  module: string;
  message: string;
}

interface StatLine {
  value: string;
  label: string;
}

interface ProvisioningVisualizerProps {
  logs: LogLine[];
  stats: StatLine[];
  title?: string;
  iconType?: "vps" | "k3s" | "api-hub" | "file-cdn" | "shortener";
}

function getStatIcon(label: string) {
  switch (label) {
    case "FIREWALL": return <Shield className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
    case "NAT GATEWAY": return <Network className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
    case "VPC PEERING": return <Cable className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
    case "OPEN PORTS": return <Unlock className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
    case "K3s VERSION": return <Box className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
    case "CONTROL PLANE": return <Server className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
    case "SCALING": return <Activity className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
    case "INGRESS": return <Globe className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
    default: return <Database className="w-5 h-5 text-cyan-500 mb-2 opacity-80" />;
  }
}

export function ProvisioningVisualizer({ logs, stats, title = "PROVISIONING", iconType = "vps" }: ProvisioningVisualizerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeStep, setActiveStep] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);

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

  return (
    <div className={cn("w-full rounded-3xl overflow-hidden relative", isDark ? "bg-[#0d1629] backdrop-blur-xl border border-slate-700/80 ring-1 ring-white/5 shadow-2xl shadow-black/50" : "bg-white border border-slate-200 shadow-xl")}>
      {/* Top Progress Bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", isDark ? "bg-white/5" : "bg-slate-100")}>
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.6)] transform-gpu will-change-transform"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="p-4 sm:p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className={cn("text-xl font-bold mb-2 flex items-center gap-3", isDark ? "text-white" : "text-slate-900")}>
              <span className="relative flex h-3 w-3">
                {!isCompleted && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 bg-cyan-500`}></span>
              </span>
              {title}
            </h3>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-600")}>
              {isCompleted ? "Provisioning completed successfully." : "Allocating resources in real-time..."}
            </p>
          </div>
          <div className="text-right">
            <span className={cn("text-4xl font-black bg-clip-text text-transparent", isDark ? "bg-gradient-to-br from-white to-zinc-500" : "bg-gradient-to-br from-slate-800 to-slate-500")}>
              {progress}%
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 md:gap-10">
          {/* Left: Stepper */}
          <div className="space-y-4">
            {logs.map((log, idx) => {
              const isActive = idx === activeStep;
              const isPast = idx < activeStep;
              
              return (
                <div key={idx} className={`flex gap-4 transition-all duration-500 ${isPast || isActive ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="relative flex flex-col items-center">
                    <div className={cn(`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300`,
                      isDark ? 'bg-[#050b14]' : 'bg-white',
                      isPast ? 'border-cyan-500 text-cyan-500' : 
                        isActive ? 'border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 
                        (isDark ? 'border-zinc-700 text-zinc-600' : 'border-slate-300 text-slate-400')
                    )}>
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-700'}`} />}
                    </div>
                    {idx !== logs.length - 1 && (
                      <div className={cn(`absolute top-8 bottom-[-24px] w-[2px] transition-colors duration-500`, isPast ? 'bg-cyan-500/50' : (isDark ? 'bg-zinc-800' : 'bg-slate-200'))} />
                    )}
                  </div>
                  <div className="pb-4">
                    <span className={`text-xs font-bold tracking-wider mb-1 block ${isActive ? 'text-cyan-500' : isPast ? 'text-cyan-600' : (isDark ? 'text-zinc-500' : 'text-slate-400')}`}>
                      {log.module}
                    </span>
                    <span className={`text-sm ${isActive ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-zinc-400' : 'text-slate-500')}`}>
                      {log.message}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Visualizer Graphic */}
          <div className={cn("relative flex flex-col items-center justify-center border rounded-3xl p-4 md:p-6 lg:p-8 overflow-visible", isDark ? "border-slate-700/80 bg-[#080d1a]/80 ring-1 ring-white/5" : "border-slate-200 bg-slate-50")}>
            {/* Ambient Background Glow */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[450px] md:h-[450px] pointer-events-none transition-all duration-1000"
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0) 70%)'
              }}
            />
            
            {/* Abstract Server Visualization */}
            <div className="relative z-10 w-full aspect-square max-w-[280px] flex items-center justify-center">
              <AnimatePresence>
                {activeStep >= 1 && (
                  <motion.div 
                    key="ring-outer"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 border-2 border-cyan-500/30 rounded-full border-dashed animate-[spin_20s_linear_infinite]" 
                  />
                )}
                {activeStep >= 3 && (
                  <motion.div 
                    key="ring-inner"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-4 border border-cyan-400/40 rounded-full animate-[spin_15s_linear_infinite_reverse]" 
                  />
                )}
                
                <motion.div 
                  key="center-icon"
                  className={cn(`w-24 h-24 rounded-2xl flex items-center justify-center z-20 backdrop-blur-md border transform-gpu will-change-transform`, 
                    isCompleted ? (isDark ? 'bg-cyan-950/90 border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.4)]' : 'bg-cyan-50 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.4)]') : (isDark ? 'bg-cyan-950/80 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]' : 'bg-white border-cyan-200 shadow-[0_0_30px_rgba(6,182,212,0.1)]')
                  )}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                >
                  {iconType === "vps" && <Server className={`w-12 h-12 text-cyan-400`} />}
                  {iconType === "k3s" && <ShipWheel className={`w-14 h-14 text-cyan-400`} />}

                  {iconType === "api-hub" && <Code className={`w-12 h-12 text-cyan-400`} />}
                  {iconType === "file-cdn" && <Globe className={`w-12 h-12 text-cyan-400`} />}
                  {iconType === "shortener" && <Link2 className={`w-12 h-12 text-cyan-400`} />}
                </motion.div>

                {/* Floating Resource Icons */}
                {activeStep >= 2 && (
                  <motion.div key="resource-cpu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={cn("absolute top-2 right-2 sm:-right-2 md:-top-6 md:-right-12 backdrop-blur-md px-2 py-1.5 md:px-4 md:py-2 rounded-full border shadow-[0_0_15px_rgba(34,211,238,0.15)] flex items-center gap-1 md:gap-2 transform-gpu will-change-transform", isDark ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300" : "bg-white border-cyan-200 text-cyan-600")}>
                    <Cpu className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase">Compute</span>
                  </motion.div>
                )}
                {activeStep >= 4 && (
                  <motion.div key="resource-hdd" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={cn("absolute bottom-2 left-2 sm:-left-2 md:-bottom-4 md:-left-12 backdrop-blur-md px-2 py-1.5 md:px-4 md:py-2 rounded-full border shadow-[0_0_15px_rgba(34,211,238,0.15)] flex items-center gap-1 md:gap-2 transform-gpu will-change-transform", isDark ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300" : "bg-white border-cyan-200 text-cyan-600")}>
                    <HardDrive className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase">Storage</span>
                  </motion.div>
                )}
                {activeStep >= 5 && (
                  <motion.div key="resource-shield" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={cn("absolute bottom-2 right-6 sm:right-2 md:-bottom-10 md:right-0 backdrop-blur-md px-2 py-1.5 md:px-4 md:py-2 rounded-full border shadow-[0_0_15px_rgba(34,211,238,0.15)] flex items-center gap-1 md:gap-2 transform-gpu will-change-transform", isDark ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300" : "bg-white border-cyan-200 text-cyan-600")}>
                    <Shield className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase">Network</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stats Grid inside the visualizer box */}
            <div className="w-full mt-20 grid grid-cols-2 gap-3 z-10">
               {stats.map((stat, idx) => (
                  <div key={idx} className={cn("border rounded-xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-md transition-colors", isDark ? "bg-[#0d1629] border-slate-700/80 hover:border-cyan-400/50 hover:bg-[#111f38] shadow-md" : "bg-white border-slate-200 hover:border-cyan-300")}>
                     {getStatIcon(stat.label)}
                     <span className={cn("font-bold text-base md:text-lg leading-tight", isDark ? "text-white" : "text-slate-900")}>{stat.value}</span>
                     <span className={cn("text-[9px] font-bold uppercase tracking-widest mt-1.5 whitespace-nowrap", isDark ? "text-cyan-200/50" : "text-slate-500")}>{stat.label}</span>
                  </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
