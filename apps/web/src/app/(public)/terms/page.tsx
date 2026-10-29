"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Scale, Info, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";

export default function TermsPage() {
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
                  LEGAL COMPLIANCE &amp; TERMS
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Enterprise Terms <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  &amp; Service Conditions.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Please review these governing terms and Acceptable Use Policies carefully before provisioning or deploying workloads on Masdika infrastructure.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#terms-content"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View Terms of Service
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                  leftIcon={<Scale className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Legal Inquiries
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (term-condition.webp) with Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/term-condition.webp"
                imageAlt="Masdika – Terms and Conditions"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Scale, label: "Legal Framework", value: "Fair Use Terms" },
                  { icon: ShieldCheck, label: "Service Standards", value: "Governed SLAs" },
                  { icon: Info, label: "Transparency", value: "Zero Hidden Fees" },
                  { icon: CheckCircle, label: "Data Protection", value: "Compliant Hosting" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 1. CONTENT (Document details) ────────── */}
        <div id="terms-content" className="max-w-4xl mx-auto pt-8 sm:pt-12 scroll-mt-28">
          
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-8 sm:mb-10 pb-4 border-b border-[var(--border-primary)]">
            <div className="inline-flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-mono font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
              <span>Last Updated: June 12, 2026</span>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap shrink-0">
              V4.0 LEGAL
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
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  1. Acceptance of Terms
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using this website&apos;s particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  2. Use License
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  Permission is granted to temporarily download one copy of the materials (information or software) on Masdika&apos;s website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>Modify or copy the materials;</li>
                  <li>Use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                  <li>Attempt to decompile or reverse engineer any software contained on the website;</li>
                  <li>Remove any copyright or other proprietary notations from the materials;</li>
                  <li>Transfer the materials to another person or &quot;mirror&quot; the materials on any other server.</li>
                </ul>
                <p>
                  This license shall automatically terminate if you violate any of these restrictions and may be terminated by Masdika at any time.
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  3. User Responsibilities
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  As a user of our services, you agree to use our platform responsibly. You must not use our website in any way that causes, or may cause, damage to the website or impairment of the availability or accessibility of the website. You must not use our website to copy, store, host, transmit, send, use, publish or distribute any material which consists of (or is linked to) any spyware, computer virus, Trojan horse, worm, keystroke logger, rootkit or other malicious computer software.
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  4. Limitations
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  In no event shall Masdika or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Masdika&apos;s website, even if Masdika or a Masdika authorized representative has been notified orally or in writing of the possibility of such damage.
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  5. Disclaimer
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  The materials on Masdika&apos;s website are provided on an &apos;as is&apos; basis. Masdika makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  6. Refund Policy (All Payments are Final)
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  <strong className="text-[var(--text-primary)] font-bold">All sales and payments are strictly final (No Refunds).</strong> We do not offer refunds, partial or in full, under any circumstances for any of our services (including but not limited to VPS, Managed K3s, File CDN, and API Hub). Please ensure you have read the rules carefully and reviewed your order before making a payment.
                </p>
              </div>
            </div>

            {/* Section 7 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  7. Prohibited Activities
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  Users are strictly prohibited from using our VPS or server services for the following activities. Violation of these rules will result in <strong className="text-[var(--text-primary)] font-bold">unilateral service termination (suspend/terminate) without any refund</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li><strong className="text-[var(--text-primary)] font-bold">VPN / Proxy / Tunnels:</strong> Installing VPNs, Proxies, or Mikrotik CHR on regular VPS is prohibited. We provide specialized packages for such requirements.</li>
                  <li><strong className="text-[var(--text-primary)] font-bold">Crypto Mining:</strong> Cryptocurrency mining of any kind that causes abnormal CPU load is strictly prohibited.</li>
                  <li><strong className="text-[var(--text-primary)] font-bold">Malware &amp; Phishing:</strong> Distributing malware, viruses, trojans, or creating phishing and scam sites is strictly forbidden.</li>
                  <li><strong className="text-[var(--text-primary)] font-bold">DDoS &amp; Hacking:</strong> Using our servers to launch DDoS attacks, port scanning, bruteforcing, or any hacking activities is prohibited.</li>
                  <li><strong className="text-[var(--text-primary)] font-bold">Spamming:</strong> Sending spam emails or illegal mass mailing is strictly forbidden.</li>
                </ul>
                <p className="font-bold mt-2 text-rose-500 dark:text-rose-400">
                  Please read these rules carefully. By using our services, you fully agree to this policy.
                </p>
              </div>
            </div>
            
            {/* Section 8 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  8. Acceptable Use Policy (AUP)
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <p>
                  This policy governs the usage rules for Masdika facilities included in the services used by our customers.
                </p>
                
                <div className="space-y-1.5 pt-1">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">Content &amp; Websites</h3>
                  <p>Customers are prohibited from hosting content or websites that are related to or feature:</p>
                  <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
                    <li>Pornography, gambling, racism, insults, and violations of public decency.</li>
                    <li>Materials that may provoke conflict, unrest, or terror.</li>
                    <li>Copyrighted materials used without the owner&apos;s permission.</li>
                    <li>Ponzi schemes, pyramid schemes, fraud, and phishing.</li>
                    <li>Online sale of drugs without valid authorization or contrary to FDA/BPOM regulations.</li>
                    <li>Any other materials that violate Indonesian or International laws.</li>
                    <li>Materials prohibited by ISPs or Datacenters.</li>
                  </ul>
                </div>

                <div className="space-y-1.5 pt-1">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">Email Facilities Usage</h3>
                  <p>Customers are prohibited from using email facilities on our servers/VPS to:</p>
                  <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
                    <li>Send SPAM and/or Unsolicited Mail, or intentionally receive such emails.</li>
                    <li>Send mass emails for any reason and/or conduct mail bombing.</li>
                    <li>Send materials prohibited under the &quot;Content &amp; Websites&quot; section.</li>
                  </ul>
                </div>

                <div className="space-y-1.5 pt-1">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">Resource Usage (CPU/RAM/Storage)</h3>
                  <p>
                    Resource usage on VPS/K3s services must not be extremely excessive to the point of disrupting node stability (except for Dedicated packages). If usage exceeds reasonable limits and continuously disrupts other customers, the system reserves the right to throttle network speeds or temporarily shut down the instance.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 9 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  9. Sanctions for Violations
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>Masdika reserves the right to <strong className="text-[var(--text-primary)] font-bold">permanently suspend and/or terminate the customer&apos;s service</strong> for any AUP violations, with or without prior notice.</li>
                  <li>Masdika reserves the right to terminate services with no guarantee of a refund (No Refund).</li>
                  <li>If the violation is considered minor, Masdika may opt to send a warning via email first.</li>
                  <li>Masdika reserves the right to impose fines or report to the authorities any customer who intentionally commits criminal or illegal acts.</li>
                </ul>
              </div>
            </div>

            {/* Section 10 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  10. Abuse Handling &amp; Reporting
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">Phishing / Scam / Malware / Fraud</h3>
                  <p>
                    Upon receiving a valid report regarding such content, Masdika will investigate and reserves the right to immediately suspend/terminate all related services without the client&apos;s consent to protect network integrity.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">DMCA / Copyright</h3>
                  <p>
                    Masdika acknowledges DMCA and reserves the right to respond to copyright infringement claims. Valid reports may result in access suspension to the respective services until the client addresses the complaint.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">Abuse Contact</h3>
                  <p>
                    To report any form of abuse, you can contact our team via the Support Ticket system in the dashboard or reach out to our official email at <strong><a href="mailto:abuse@masdika.id" className="text-cyan-600 dark:text-cyan-400 underline underline-offset-4 hover:text-cyan-500 transition-colors">abuse@masdika.id</a></strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 11 */}
            <div className="bg-[var(--surface)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-sm hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  11. Disclaimer
                </h2>
              </div>
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>Masdika reserves the right to change its policies at any time without prior notice. Users are expected to review this page periodically.</li>
                  <li>Masdika is not responsible for any emails or content uploaded or hosted on the Customer&apos;s services.</li>
                  <li>Masdika can and will provide user information to authorities or law enforcement when required, in accordance with applicable laws. The services provided by Masdika may only be used for lawful purposes.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}




