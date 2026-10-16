"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Scale, Info, CheckCircle, AlertTriangle, ChevronLeft } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function TermsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className={cn("min-h-screen pt-24 md:pt-32 pb-20 overflow-hidden relative bg-transparent", isDark ? "text-white" : "text-slate-900")}>
      {/* Cinematic background effects */}



      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header - Centered like Managed DB */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pt-10 pb-16 text-center"
        >
          <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]" : "text-cyan-700 bg-cyan-50 border border-cyan-200 shadow-sm")}>
            LEGAL INFO
          </span>
          
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
            Terms & <br className="hidden sm:block" /><span className={cn("bg-gradient-to-r bg-clip-text text-transparent drop-shadow-sm", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Conditions</span>
          </h1>
          
          <p className={cn("text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
            Please read these terms carefully before using our services. By using our services, you agree to be bound by these terms and conditions.
          </p>
          
          <div className={cn("inline-flex items-center justify-center gap-3 text-sm font-bold px-6 py-3 rounded-full border transition-colors shadow-sm", isDark ? "bg-cyan-950/50 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            Last Updated: June 12, 2026
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
                    <ShieldCheck className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>1. Acceptance of Terms</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using this website's particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />

              {/* Section 2 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <Scale className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>2. Use License</h2>
                </div>
                <div className={cn("prose max-w-none ml-13 space-y-4", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    Permission is granted to temporarily download one copy of the materials (information or software) on Masdika's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                  </p>
                  <ul className={cn("list-disc pl-5 space-y-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <li>Modify or copy the materials;</li>
                    <li>Use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                    <li>Attempt to decompile or reverse engineer any software contained on the website;</li>
                    <li>Remove any copyright or other proprietary notations from the materials;</li>
                    <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
                  </ul>
                  <p className="leading-relaxed">
                    This license shall automatically terminate if you violate any of these restrictions and may be terminated by Masdika at any time.
                  </p>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />

              {/* Section 3 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <CheckCircle className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>3. User Responsibilities</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    As a user of our services, you agree to use our platform responsibly. You must not use our website in any way that causes, or may cause, damage to the website or impairment of the availability or accessibility of the website. You must not use our website to copy, store, host, transmit, send, use, publish or distribute any material which consists of (or is linked to) any spyware, computer virus, Trojan horse, worm, keystroke logger, rootkit or other malicious computer software.
                  </p>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />

              {/* Section 4 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <AlertTriangle className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>4. Limitations</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    In no event shall Masdika or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Masdika's website, even if Masdika or a Masdika authorized representative has been notified orally or in writing of the possibility of such damage.
                  </p>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />

              {/* Section 5 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <Info className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>5. Disclaimer</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    The materials on Masdika's website are provided on an 'as is' basis. Masdika makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                  </p>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />
              
              {/* Section 6 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <AlertTriangle className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>6. Refund Policy (All Payments are Final)</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    <strong>All sales and payments are strictly final (No Refunds).</strong> We do not offer refunds, partial or in full, under any circumstances for any of our services (including but not limited to VPS, Managed K3s, File CDN, and API Hub). Please ensure you have read the rules carefully and reviewed your order before making a payment.
                  </p>
                </div>
              </div>

              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />
              
              {/* Section 7 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <AlertTriangle className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>7. Prohibited Activities</h2>
                </div>
                <div className={cn("prose max-w-none ml-13 space-y-4", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <p className="leading-relaxed">
                    Users are strictly prohibited from using our VPS or server services for the following activities. Violation of these rules will result in <strong>unilateral service termination (suspend/terminate) without any refund</strong>:
                  </p>
                  <ul className={cn("list-disc pl-5 space-y-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <li><strong className="text-white">VPN / Proxy / Tunnels:</strong> Installing VPNs, Proxies, or Mikrotik CHR on regular VPS is prohibited. We provide specialized packages for such requirements.</li>
                    <li><strong className="text-white">Crypto Mining:</strong> Cryptocurrency mining of any kind that causes abnormal CPU load is strictly prohibited.</li>
                    <li><strong className="text-white">Malware & Phishing:</strong> Distributing malware, viruses, trojans, or creating phishing and scam sites is strictly forbidden.</li>
                    <li><strong className="text-white">DDoS & Hacking:</strong> Using our servers to launch DDoS attacks, port scanning, bruteforcing, or any hacking activities is prohibited.</li>
                    <li><strong className="text-white">Spamming:</strong> Sending spam emails or illegal mass mailing is strictly forbidden.</li>
                  </ul>
                  <p className={cn("leading-relaxed font-bold mt-4", isDark ? "text-red-400" : "text-red-600")}>
                    Please read these rules carefully. By using our services, you fully agree to this policy.
                  </p>
                </div>
              </div>
              
              {/* Section 8 */}
              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />
              <div>
                <div className="flex items-center gap-3 mb-4 mt-8">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <ShieldCheck className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>8. Acceptable Use Policy (AUP)</h2>
                </div>
                <div className="prose prose-invert prose-cyan max-w-none text-zinc-300 ml-13 space-y-6">
                  <p className="leading-relaxed">
                    This policy governs the usage rules for Masdika facilities included in the services used by our customers.
                  </p>
                  
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Content & Websites</h3>
                    <p className="mb-2">Customers are prohibited from hosting content or websites that are related to or feature:</p>
                    <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                      <li>Pornography, gambling, racism, insults, and violations of public decency.</li>
                      <li>Materials that may provoke conflict, unrest, or terror.</li>
                      <li>Copyrighted materials used without the owner's permission.</li>
                      <li>Ponzi schemes, pyramid schemes, fraud, and phishing.</li>
                      <li>Online sale of drugs without valid authorization or contrary to FDA/BPOM regulations.</li>
                      <li>Any other materials that violate Indonesian or International laws.</li>
                      <li>Materials prohibited by ISPs or Datacenters.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Email Facilities Usage</h3>
                    <p className="mb-2">Customers are prohibited from using email facilities on our servers/VPS to:</p>
                    <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                      <li>Send SPAM and/or Unsolicited Mail, or intentionally receive such emails.</li>
                      <li>Send mass emails for any reason and/or conduct mail bombing.</li>
                      <li>Send materials prohibited under the "Content & Websites" section.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Resource Usage (CPU/RAM/Storage)</h3>
                    <p className="mb-2">
                      Resource usage on VPS/K3s services must not be extremely excessive to the point of disrupting node stability (except for Dedicated packages). If usage exceeds reasonable limits and continuously disrupts other customers, the system reserves the right to throttle network speeds or temporarily shut down the instance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 9 */}
              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />
              <div>
                <div className="flex items-center gap-3 mb-4 mt-8">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <Scale className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>9. Sanctions for Violations</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <ul className={cn("list-disc pl-5 space-y-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <li>Masdika reserves the right to <strong>permanently suspend and/or terminate the customer's service</strong> for any AUP violations, with or without prior notice.</li>
                    <li>Masdika reserves the right to terminate services with no guarantee of a refund (No Refund).</li>
                    <li>If the violation is considered minor, Masdika may opt to send a warning via email first.</li>
                    <li>Masdika reserves the right to impose fines or report to the authorities any customer who intentionally commits criminal or illegal acts.</li>
                  </ul>
                </div>
              </div>

              {/* Section 10 */}
              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />
              <div>
                <div className="flex items-center gap-3 mb-4 mt-8">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <CheckCircle className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>10. Abuse Handling & Reporting</h2>
                </div>
                <div className={cn("prose max-w-none ml-13 space-y-4", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Phishing / Scam / Malware / Fraud</h3>
                    <p className="mb-2">
                      Upon receiving a valid report regarding such content, Masdika will investigate and reserves the right to immediately suspend/terminate all related services without the client's consent to protect network integrity.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">DMCA / Copyright</h3>
                    <p className="mb-2">
                      Masdika acknowledges DMCA and reserves the right to respond to copyright infringement claims. Valid reports may result in access suspension to the respective services until the client addresses the complaint.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Abuse Contact</h3>
                    <p className="mb-2">
                      To report any form of abuse, you can contact our team via the Support Ticket system in the dashboard or reach out to our official email at <strong><a href="mailto:abuse@masdika.id" className={cn("underline underline-offset-4", isDark ? "text-cyan-400 hover:text-cyan-300 decoration-cyan-400/30" : "text-cyan-700 hover:text-cyan-800 decoration-cyan-700/30")}>abuse@masdika.id</a></strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 11 */}
              <div className={cn("w-full h-px", isDark ? "bg-cyan-950/30" : "bg-slate-200")} />
              <div>
                <div className="flex items-center gap-3 mb-4 mt-8">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <Info className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>11. Disclaimer</h2>
                </div>
                <div className={cn("prose max-w-none ml-13", isDark ? "prose-invert prose-cyan text-zinc-300" : "prose-cyan text-slate-700")}>
                  <ul className={cn("list-disc pl-5 space-y-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <li>Masdika reserves the right to change its policies at any time without prior notice. Users are expected to review this page periodically.</li>
                    <li>Masdika is not responsible for any emails or content uploaded or hosted on the Customer's services.</li>
                    <li>Masdika can and will provide user information to authorities or law enforcement when required, in accordance with applicable laws. The services provided by Masdika may only be used for lawful purposes.</li>
                  </ul>
                </div>
              </div>
              
            </div>
        </motion.div>
      </div>
    </div>
  );
}




