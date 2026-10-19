"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Lock, Eye, Server, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function PrivacyPolicyPage() {
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
                  DATA INTEGRITY &amp; PRIVACY
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Enterprise Privacy <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Policy &amp; Security.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Transparent data handling, strict GDPR alignment, and zero-knowledge infrastructure protection across all Masdika cloud services.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#privacy-content"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Read Policy Terms
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                  leftIcon={<Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Privacy Inquiries
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (privacy-policy.webp) with Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-10 lg:mt-0"
            >
              <div className="relative w-full max-w-[380px] sm:max-w-[480px] lg:max-w-[560px] xl:max-w-[600px] h-[400px] sm:h-[460px] lg:h-[500px] mx-auto flex items-end justify-center">
                {/* Subtle ambient depth bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left (Encryption Standard) */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Lock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Encryption Standard
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      AES-256 / TLS 1.3
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right (Compliance) */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Shield className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Compliance
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      GDPR &amp; ISO Aligned
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left (Zero Log Policy) */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Server className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Data Sovereignty
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      Zero Log Policy
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right (Transparency) */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Eye className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                      Transparency
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                      User Controlled
                    </div>
                  </div>
                </div>

                {/* Karakter privacy-policy.webp utuh, proporsional & konsisten dengan halaman lain */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                  }}
                >
                  <Image
                    src="/privacy-policy.webp"
                    alt="Masdika – Privacy Policy"
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
        <div id="privacy-content" className="max-w-4xl mx-auto pt-8 sm:pt-12 scroll-mt-28">
          
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-8 sm:mb-10 pb-4 border-b border-[var(--border-primary)]">
            <div className="inline-flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-mono font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
              <span>Last Updated: June 28, 2026</span>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap shrink-0">
              V3.1 GDPR
            </span>
          </div>

          <div className="space-y-6 sm:space-y-8 relative z-10">
            
            {/* Section 1 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  1. Information We Collect
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  When you use Masdika Cloud services (including Cloud VPS, File CDN, and API Hub), we collect specific types of information to provide and improve our services:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li><strong className="text-[var(--text-primary)] font-bold">Account Information:</strong> Name, email address, and billing details provided during registration.</li>
                  <li><strong className="text-[var(--text-primary)] font-bold">Usage Data:</strong> API request logs, bandwidth consumption, and storage metrics to ensure fair usage and generate accurate invoices.</li>
                  <li><strong className="text-[var(--text-primary)] font-bold">Technical Data:</strong> IP addresses, browser types, and access times for security monitoring and fraud prevention.</li>
                </ul>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Server className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  2. How We Use Your Data
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  We strictly use your collected information for the following operational purposes:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>To provision, maintain, and monitor the performance of your subscribed cloud infrastructure.</li>
                  <li>To process transactions, manage account balances, and deliver automated billing invoices.</li>
                  <li>To send critical service announcements, security alerts, and support responses.</li>
                  <li>To detect, investigate, and prevent fraudulent transactions or abuse of our network infrastructure.</li>
                </ul>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  3. Data Security &amp; Storage
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  Security is deeply ingrained in our architecture. We implement industry-standard security measures to protect your personal information and stored data:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li><strong className="text-[var(--text-primary)] font-bold">Encryption:</strong> All passwords and sensitive API keys are hashed and encrypted (AES-256) at rest. All network transmissions are secured via TLS/SSL.</li>
                  <li><strong className="text-[var(--text-primary)] font-bold">Isolation:</strong> Customer servers and storage buckets are strictly isolated. We do not inspect the contents of your Cloud VPS or File CDN unless legally compelled or explicitly requested by you for technical support.</li>
                  <li><strong className="text-[var(--text-primary)] font-bold">Data Sovereignty:</strong> Unless otherwise specified, your primary data is hosted securely within our designated data centers and is subject to local compliance laws.</li>
                </ul>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  4. Third-Party Sharing
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  We <strong className="text-[var(--text-primary)] font-bold">do not sell</strong> your personal information. We may share necessary data exclusively with trusted third-party service providers (such as payment gateways like Duitku) strictly for processing your payments and delivering our core services. All third parties are bound by strict confidentiality agreements.
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  5. Your Rights &amp; Contact
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  You have the right to access, update, or request the deletion of your personal data at any time. If you wish to terminate your account or have privacy-related inquiries, please contact our Data Protection Officer at:
                </p>
                <div className="pt-1">
                  <div className="px-4 py-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 inline-block">
                    <a href="mailto:me@masdika.id" className="font-bold text-sm text-cyan-600 dark:text-cyan-400 hover:underline">
                      me@masdika.id
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  6. Billing &amp; Refunds
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  For your security, we do not store full credit card numbers or sensitive payment details on our servers. All transactions are handled by secure third-party gateways. <strong className="text-[var(--text-primary)] font-bold">Please note that all payments for our services (VPS, K3s, File CDN, etc.) are final and non-refundable.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
