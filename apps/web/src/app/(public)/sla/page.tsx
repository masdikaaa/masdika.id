"use client";

import { motion } from "framer-motion";
import { Activity, Clock, ShieldAlert, Zap, Server, ChevronLeft } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function SLAPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className={cn("min-h-screen pt-24 md:pt-32 pb-20 overflow-hidden relative", isDark ? "text-white bg-transparent" : "text-slate-900 bg-[#f8fafb]")}>
      {/* Cinematic background effects */}
      <div className={cn("absolute top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none", isDark ? "bg-cyan-500/10 mix-blend-screen" : "bg-cyan-500/10 mix-blend-normal opacity-40")} />
      <div className={cn("absolute bottom-[20%] right-[0%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none", isDark ? "bg-cyan-600/10 mix-blend-screen" : "bg-cyan-600/10 mix-blend-normal opacity-40")} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header - Centered like Managed DB */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pt-10 pb-16 text-center"
        >
          <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "text-cyan-700 bg-cyan-50 border border-cyan-200 shadow-sm")}>
            SERVICE RELIABILITY
          </span>
          
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
            Service Level <br className="hidden sm:block" /><span className={cn("bg-gradient-to-r bg-clip-text text-transparent drop-shadow-sm", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Agreement</span>
          </h1>
          
          <p className={cn("text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
            Our commitment to providing you with reliable, highly-available, and high-performance services.
          </p>
          
          <div className={cn("inline-flex items-center justify-center gap-3 text-sm font-bold px-6 py-3 rounded-full border transition-colors shadow-sm", isDark ? "bg-cyan-950/50 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            Effective Date: January 1, 2026
          </div>
        </motion.div>

        <div className={cn("w-full h-px bg-gradient-to-r from-transparent to-transparent mb-16", isDark ? "via-white/10" : "via-black/10")} />

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-16"
        >
          <div className="space-y-16 relative z-10">
              {/* Section 1 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <Activity className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>1. General Terms</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    This Service Level Agreement (SLA) applies strictly between <strong>Masdika</strong> and its direct customers. Customers of third parties or indirect users of our services are not entitled to this SLA. 
                    By using Masdika's services, customers are deemed to have understood and agreed to the SLA, Acceptable Use Policy (AUP), and the terms and conditions of service as an inseparable part of their agreement.
                  </p>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />

              {/* Section 2 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <Zap className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>2. Uptime Guarantee (Server & Network)</h2>
                </div>
                <div className={cn("prose max-w-none ml-13 space-y-4", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    Masdika provides a server and network connectivity uptime guarantee of <strong>99% per month</strong> for its entire ecosystem of services, including <strong>VPS, Managed K3s, CDN, and API Hub</strong>.
                  </p>
                  <ul className={cn("list-disc pl-5 space-y-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <li>This guarantee excludes <em>downtime</em> caused by previously announced routine maintenance.</li>
                    <li>Uptime failures can be claimed if the <em>downtime</em> exceeds the 1% tolerance limit in a single month and occurs within a single continuous timeframe (not an accumulation of micro-interruptions below reasonable limits).</li>
                  </ul>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />

              {/* Section 3 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <Server className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>3. Data Security Guarantee</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    Masdika provides a data security guarantee at the infrastructure level, which includes data protection in File CDN and isolation for VPS/K3s, <strong>provided that the risks are not caused by the customer's negligence</strong> and the customer does not violate the AUP.
                  </p>
                  <p className="leading-relaxed mt-2">Customer negligence that voids this guarantee includes, but is not limited to:</p>
                  <ul className={cn("list-disc pl-5 space-y-2 mt-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <li>Theft of access/authorization due to an insecure customer environment (viruses, malware, keyloggers, phishing).</li>
                    <li>Permission misconfigurations (e.g., inappropriately setting <code>chmod 777</code>).</li>
                    <li>The use of vulnerable scripts, applications, or software versions (bugs) inside the OS of a VPS managed by the customer.</li>
                  </ul>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />

              {/* Section 4 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <Clock className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>4. SLA Claim Procedure & Compensation</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    In the event that we fail to meet the uptime guarantee, you are entitled to claim compensation in the form of a balance addition (deposit) to your account.
                  </p>
                  <ul className={cn("list-disc pl-5 space-y-2 mt-4", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <li>Claims must be submitted a maximum of <strong>7 days</strong> after the disruption incident.</li>
                    <li>Claims must be accompanied by evidence (e.g., logs, traceroute results) at the time of the disruption and will be <em>cross-checked</em> with Masdika's internal monitoring systems.</li>
                    <li>The maximum compensation amount is the subscription cost divided by the duration of the service failure (proportional), or based on a calculated downtime percentage.</li>
                  </ul>
                  <p className={cn("leading-relaxed font-bold mt-4", isDark ? "text-red-400" : "text-red-600")}>
                    Claims are automatically rejected/voided if the customer is currently or has been violating the Acceptable Use Policy (AUP) or if the account is in a suspended/terminated status.
                  </p>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />

              {/* Section 5 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <ShieldAlert className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>5. Disclaimer (Force Majeure)</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    Masdika is exempt from all SLA claims if the disruption is caused by external parties or factors beyond our control, including but not limited to:
                  </p>
                  <ul className={cn("list-disc pl-5 space-y-2 mt-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <li>Connectivity disruptions on the user's local ISP side (Customer's Internet Provider).</li>
                    <li>Natural disasters, riots, fires, undersea cable cuts, or government interventions (<em>Force Majeure</em>).</li>
                    <li>Massive DDoS attacks affecting tier-1 upstream providers.</li>
                  </ul>
                  <p className="leading-relaxed mt-4">
                    Masdika is not responsible for any potential material or immaterial losses, loss of business opportunities, or any other damages experienced by the customer due to service failures.
                  </p>
                </div>
              </div>
            </div>
        </motion.div>
      </div>
    </div>
  );
}
