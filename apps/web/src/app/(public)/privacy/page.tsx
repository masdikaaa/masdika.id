"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Shield, Lock, Eye, Server, FileText, ChevronLeft } from 'lucide-react';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export default function PrivacyPolicyPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <main className={cn("min-h-screen pt-24 md:pt-32 pb-20 overflow-hidden relative", isDark ? "text-white bg-transparent" : "text-slate-900 bg-[#f8fafb]")}>
      {/* Cinematic background effects */}
      <div className={cn("absolute top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none", isDark ? "bg-cyan-500/10 mix-blend-screen" : "bg-cyan-500/10 mix-blend-normal opacity-40")} />
      <div className={cn("absolute bottom-[20%] right-[0%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none", isDark ? "bg-cyan-600/10 mix-blend-screen" : "bg-cyan-600/10 mix-blend-normal opacity-40")} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header - Centered like Managed DB */}
        <AnimatedSection className="pt-10 pb-16 text-center" delay={0}>
          <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]" : "text-cyan-700 bg-cyan-50 border border-cyan-200 shadow-sm")}>
            DATA PROTECTION
          </span>
          
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
            Privacy <br className="hidden sm:block" /><span className={cn("bg-gradient-to-r bg-clip-text text-transparent drop-shadow-sm", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Policy</span>
          </h1>
          
          <p className={cn("text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
            At Masdika, we take your privacy seriously. This document outlines how we collect, use, and protect your personal data across all our cloud services.
          </p>
          
          <div className={cn("inline-flex items-center justify-center gap-3 text-sm font-bold px-6 py-3 rounded-full border transition-colors shadow-sm", isDark ? "bg-cyan-950/50 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            Last Updated: June 28, 2026
          </div>
        </AnimatedSection>

        <div className={cn("w-full h-px bg-gradient-to-r from-transparent to-transparent mb-16", isDark ? "via-white/10" : "via-black/10")} />

        {/* Content */}
        <AnimatedSection delay={0.2} className="space-y-16 relative z-10">
            
            {/* Section 1 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <Eye className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>1. Information We Collect</h2>
              </div>
              <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                <p className="leading-relaxed">
                  When you use Masdika Cloud services (including Cloud VPS, File CDN, and API Hub), we collect specific types of information to provide and improve our services:
                </p>
                <ul className="leading-relaxed mt-4">
                  <li><strong>Account Information:</strong> Name, email address, and billing details provided during registration.</li>
                  <li><strong>Usage Data:</strong> API request logs, bandwidth consumption, and storage metrics to ensure fair usage and generate accurate invoices.</li>
                  <li><strong>Technical Data:</strong> IP addresses, browser types, and access times for security monitoring and fraud prevention.</li>
                </ul>
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <Server className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>2. How We Use Your Data</h2>
              </div>
              <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                <p className="leading-relaxed">
                  We strictly use your collected information for the following operational purposes:
                </p>
                <ul className="leading-relaxed mt-4">
                  <li>To provision, maintain, and monitor the performance of your subscribed cloud infrastructure.</li>
                  <li>To process transactions, manage account balances, and deliver automated billing invoices.</li>
                  <li>To send critical service announcements, security alerts, and support responses.</li>
                  <li>To detect, investigate, and prevent fraudulent transactions or abuse of our network infrastructure.</li>
                </ul>
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <Lock className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>3. Data Security & Storage</h2>
              </div>
              <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                <p className="leading-relaxed mb-4">
                  Security is deeply ingrained in our architecture. We implement industry-standard security measures to protect your personal information and stored data:
                </p>
                <ul className="leading-relaxed mt-4">
                  <li><strong>Encryption:</strong> All passwords and sensitive API keys are hashed and encrypted (AES-256) at rest. All network transmissions are secured via TLS/SSL.</li>
                  <li><strong>Isolation:</strong> Customer servers and storage buckets are strictly isolated. We do not inspect the contents of your Cloud VPS or File CDN unless legally compelled or explicitly requested by you for technical support.</li>
                  <li><strong>Data Sovereignty:</strong> Unless otherwise specified, your primary data is hosted securely within our designated data centers and is subject to local compliance laws.</li>
                </ul>
              </div>
            </div>

            {/* Section 4 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <FileText className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>4. Third-Party Sharing</h2>
              </div>
              <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                <p className="leading-relaxed">
                  We <strong>do not sell</strong> your personal information. We may share necessary data exclusively with trusted third-party service providers (such as payment gateways like Duitku) strictly for processing your payments and delivering our core services. All third parties are bound by strict confidentiality agreements.
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <Shield className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>5. Your Rights & Contact</h2>
              </div>
              <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                <p className="leading-relaxed">
                  You have the right to access, update, or request the deletion of your personal data at any time. If you wish to terminate your account or have privacy-related inquiries, please contact our Data Protection Officer at:
                </p>
                <div className={cn("mt-4 p-4 rounded-xl border inline-block not-prose transition-colors", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <a href="mailto:me@masdika.id" className={cn("font-bold hover:underline", isDark ? "text-cyan-400" : "text-cyan-700")}>me@masdika.id</a>
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <Lock className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>6. Billing & Refunds</h2>
              </div>
              <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                <p className="leading-relaxed">
                  For your security, we do not store full credit card numbers or sensitive payment details on our servers. All transactions are handled by secure third-party gateways. <strong>Please note that all payments for our services (VPS, K3s, File CDN, etc.) are final and non-refundable.</strong>
                </p>
              </div>
            </div>

        </AnimatedSection>
      </div>
    </main>
  );
}
