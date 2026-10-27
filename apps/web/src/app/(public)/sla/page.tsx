"use client";

import { motion } from "framer-motion";
import { Activity, Clock, ShieldAlert, Zap, Server, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function SLAPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Events, Vacancies & design.md) ────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left – Text & Actions */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl relative z-30"
            >
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  SERVICE RELIABILITY GUARANTEE
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Enterprise Service <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Level Agreement.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Our strict commitment to delivering dependable, highly-available, and resilient cloud infrastructure backed by guaranteed uptime standards.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#sla-content"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore SLA Guarantees
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                  leftIcon={<ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Contact Support
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (sla.webp) with Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-10 lg:mt-0"
            >
              <div className="relative w-full max-w-[380px] sm:max-w-[480px] lg:max-w-[560px] xl:max-w-[600px] h-[400px] sm:h-[460px] lg:h-[500px] mx-auto flex items-end justify-center">
                {/* Subtle ambient depth bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left (Uptime Guarantee) */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Uptime Guarantee
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      98.99% Availability
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right (Incident Response) */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Incident Response
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      &lt; 15 Min MTTR
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left (Infrastructure Tier) */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Server className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Infrastructure
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Enterprise Tier
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right (Global Support) */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Global Operations
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      24/7 Monitoring
                    </div>
                  </div>
                </div>

                {/* Karakter sla.webp utuh, proporsional & konsisten dengan halaman lain */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                  }}
                >
                  <Image
                    src="/sla.webp"
                    alt="Masdika – Service Level Agreement"
                    width={1536}
                    height={1024}
                    priority={true}
                    unoptimized={true}
                    className="w-full h-full object-contain object-bottom"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 1. CONTENT (Document details) ────────── */}
        <div id="sla-content" className="max-w-4xl mx-auto pt-8 sm:pt-12 scroll-mt-28">
          
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-8 sm:mb-10 pb-4 border-b border-[var(--border-primary)]">
            <div className="inline-flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-mono font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
              <span>Effective Date: January 1, 2026</span>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap shrink-0">
              V2.4 REVISED
            </span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 sm:space-y-8 relative z-10"
          >
            {/* Section 1 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  1. General Terms
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  This Service Level Agreement (SLA) applies strictly between <strong className="text-[var(--text-primary)] font-bold">Masdika</strong> and its direct customers. Customers of third parties or indirect users of our services are not entitled to this SLA.
                </p>
                <p>
                  By using Masdika&apos;s services, customers are deemed to have understood and agreed to the SLA, Acceptable Use Policy (AUP), and the terms and conditions of service as an inseparable part of their agreement.
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  2. Uptime Guarantee (Server &amp; Network)
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  Masdika provides a server and network connectivity uptime guarantee of <strong className="text-[var(--text-primary)] font-bold">98.99% per month</strong> for its entire ecosystem of services, including <strong className="text-[var(--text-primary)] font-bold">VPS, Managed K3s, CDN, and API Hub</strong>.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>This guarantee excludes <em className="text-cyan-600 dark:text-cyan-400 font-medium">downtime</em> caused by previously announced routine maintenance.</li>
                  <li>Uptime failures can be claimed if the <em className="text-cyan-600 dark:text-cyan-400 font-medium">downtime</em> exceeds the 1.01% tolerance limit in a single month and occurs within a single continuous timeframe (not an accumulation of micro-interruptions below reasonable limits).</li>
                </ul>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Server className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  3. Data Security Guarantee
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  Masdika provides a data security guarantee at the infrastructure level, which includes data protection in File CDN and isolation for VPS/K3s, <strong className="text-[var(--text-primary)] font-bold">provided that the risks are not caused by the customer&apos;s negligence</strong> and the customer does not violate the AUP.
                </p>
                <p>Customer negligence that voids this guarantee includes, but is not limited to:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>Theft of access/authorization due to an insecure customer environment (viruses, malware, keyloggers, phishing).</li>
                  <li>Permission misconfigurations (e.g., inappropriately setting <code className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono text-xs">chmod 777</code>).</li>
                  <li>The use of vulnerable scripts, applications, or software versions (bugs) inside the OS of a VPS managed by the customer.</li>
                </ul>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  4. SLA Claim Procedure &amp; Compensation
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  In the event that we fail to meet the uptime guarantee, you are entitled to claim compensation in the form of a balance addition (deposit) to your account.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>Claims must be submitted a maximum of <strong className="text-[var(--text-primary)] font-bold">7 days</strong> after the disruption incident.</li>
                  <li>Claims must be accompanied by evidence (e.g., logs, traceroute results) at the time of the disruption and will be <em className="text-cyan-600 dark:text-cyan-400 font-medium">cross-checked</em> with Masdika&apos;s internal monitoring systems.</li>
                  <li>The maximum compensation amount is the subscription cost divided by the duration of the service failure (proportional), or based on a calculated downtime percentage.</li>
                </ul>
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold leading-relaxed">
                  Claims are automatically rejected/voided if the customer is currently or has been violating the Acceptable Use Policy (AUP) or if the account is in a suspended/terminated status.
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  5. Disclaimer (Force Majeure)
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  Masdika is exempt from all SLA claims if the disruption is caused by external parties or factors beyond our control, including but not limited to:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>Connectivity disruptions on the user&apos;s local ISP side (Customer&apos;s Internet Provider).</li>
                  <li>Natural disasters, riots, fires, undersea cable cuts, or government interventions (<em className="text-cyan-600 dark:text-cyan-400 font-medium">Force Majeure</em>).</li>
                  <li>Massive DDoS attacks affecting tier-1 upstream providers.</li>
                </ul>
                <p className="pt-1">
                  Masdika is not responsible for any potential material or immaterial losses, loss of business opportunities, or any other damages experienced by the customer due to service failures.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
