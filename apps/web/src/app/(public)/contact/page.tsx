"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TiltCard } from "@/components/animations/TiltCard";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [messageId, setMessageId] = useState<number | null>(null);
  const [otp, setOtp] = useState("");
  const [settings, setSettings] = useState<any>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        if (data?.requiresVerification) {
          setRequiresVerification(true);
          setMessageId(data.messageId);
          toast.success(data.message || "Please check your email for the verification code.");
        } else {
          setSuccess(true);
          setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
          setTimeout(() => setSuccess(false), 5000);
        }
      } else {
        toast.error(data?.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/contact/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, otp })
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setRequiresVerification(false);
        setSuccess(true);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
        setOtp("");
        setTimeout(() => setSuccess(false), 5000);
      } else {
        toast.error(data?.error || "Invalid verification code.");
      }
    } catch (err) {
      toast.error("Something went wrong verifying the code.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSettings(data);
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  // Input class helper — theme-aware
  const inputClass = cn(
    "w-full rounded-xl px-5 py-4 transition-all duration-300 focus:outline-none focus:ring-1",
    isDark
      ? "bg-black/20 border border-white/5 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-cyan-500/[0.02] focus:ring-cyan-500/50"
      : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-300 shadow-sm"
  );

  return (
    <div className="pt-28 md:pt-32 pb-12 lg:pb-16 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[85vh]">
      {/* Section Title */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 relative z-10 pt-10"
      >
        <div className={cn(
          "inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full border backdrop-blur-sm",
          isDark
            ? "border-cyan-500/30 bg-cyan-500/10"
            : "border-cyan-200 bg-cyan-50"
        )}>
          <span className={cn("font-bold tracking-[0.2em] text-xs uppercase", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Let's Connect
          </span>
        </div>
        <h1 className={cn("text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-[1.2] md:leading-tight", isDark ? "text-white" : "text-slate-900")}>
          Have an idea? <br className="hidden sm:block" />
          <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>
            Let's talk.
          </span>
        </h1>
        <p className={cn("text-base md:text-lg max-w-2xl mx-auto leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
          Whether you have a question, a project proposal, or just want to say hi, my inbox is always open. I'll try my best to get back to you!
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className={cn(
          "w-full max-w-6xl backdrop-blur-md rounded-[40px] p-6 sm:p-10 lg:p-16 relative overflow-hidden flex flex-col lg:flex-row gap-12 lg:gap-16 shadow-2xl",
          isDark
            ? "bg-zinc-900/30 border border-white/5"
            : "bg-white border border-slate-200 shadow-xl"
        )}
      >
        {/* Glow blobs - only in dark mode */}
        {isDark && (
          <>
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/4" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-600/20 blur-[100px] rounded-full pointer-events-none translate-x-1/4 translate-y-1/4" />
          </>
        )}
        {!isDark && (
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-cyan-100/40 blur-[100px] rounded-full pointer-events-none -translate-x-1/3 -translate-y-1/4" />
        )}

        {/* Left Content */}
        <div className="flex-1 relative z-10 flex flex-col justify-center lg:pr-10">
          <h2 className={cn("text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 sm:mb-8 leading-[1.1] tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Let's build<br />
            <span className={cn("bg-gradient-to-r bg-clip-text text-transparent drop-shadow-sm", isDark ? "from-cyan-400 via-cyan-400 to-cyan-600" : "from-cyan-600 to-cyan-400")}>
              something great.
            </span>
          </h2>
          <p className={cn("mb-10 sm:mb-12 max-w-md leading-relaxed text-base sm:text-lg", isDark ? "text-zinc-400" : "text-slate-600")}>
            I'm currently available for freelance work and open to new opportunities. Reach out if you'd like to collaborate or just say hi!
          </p>

          <div className="space-y-4">
            {/* Email */}
            <TiltCard intensity={5} className={cn(
              "flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl border transition-all duration-500 group relative overflow-hidden",
              isDark
                ? "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/5 hover:border-cyan-500/30"
                : "bg-white border-slate-200 hover:border-cyan-300 shadow-sm hover:shadow-md"
            )}>
              {isDark && <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
              <div className={cn(
                "relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110",
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "bg-cyan-50 border-cyan-200 group-hover:bg-cyan-100"
              )}>
                <Mail className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-colors", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600")} />
              </div>
              <div className="relative min-w-0 flex-1">
                <p className={cn("text-xs font-semibold mb-1 tracking-widest uppercase", isDark ? "text-zinc-500" : "text-slate-500")}>E-mail</p>
                <p className={cn("font-semibold text-[15px] sm:text-lg truncate transition-colors", isDark ? "text-white group-hover:text-cyan-100" : "text-slate-900 group-hover:text-cyan-700")}>
                  {settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'me@masdika.id'}
                </p>
              </div>
            </TiltCard>

            {/* Location */}
            <TiltCard intensity={5} className={cn(
              "flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl border transition-all duration-500 group relative overflow-hidden",
              isDark
                ? "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/5 hover:border-cyan-500/30"
                : "bg-white border-slate-200 hover:border-cyan-300 shadow-sm hover:shadow-md"
            )}>
              {isDark && <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
              <div className={cn(
                "relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110",
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  : "bg-cyan-50 border-cyan-200 group-hover:bg-cyan-100"
              )}>
                <MapPin className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-colors", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600")} />
              </div>
              <div className="relative min-w-0 flex-1">
                <p className={cn("text-xs font-semibold mb-1 tracking-widest uppercase", isDark ? "text-zinc-500" : "text-slate-500")}>Location</p>
                <p className={cn("font-semibold text-[15px] sm:text-lg truncate transition-colors", isDark ? "text-white group-hover:text-cyan-100" : "text-slate-900 group-hover:text-cyan-700")}>
                  {settings?.contact_location || "Surabaya, Indonesia"}
                </p>
              </div>
            </TiltCard>

            {/* Phone */}
            <TiltCard intensity={5} className={cn(
              "flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl border transition-all duration-500 group relative overflow-hidden",
              isDark
                ? "bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-white/5 hover:border-cyan-500/30"
                : "bg-white border-slate-200 hover:border-cyan-300 shadow-sm hover:shadow-md"
            )}>
              {isDark && <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
              <div className={cn(
                "relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110",
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  : "bg-cyan-50 border-cyan-200 group-hover:bg-cyan-100"
              )}>
                <Phone className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-colors", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600")} />
              </div>
              <div className="relative min-w-0 flex-1">
                <p className={cn("text-xs font-semibold mb-1 tracking-widest uppercase", isDark ? "text-zinc-500" : "text-slate-500")}>Phone</p>
                <p className={cn("font-semibold text-[15px] sm:text-lg truncate transition-colors", isDark ? "text-white group-hover:text-cyan-100" : "text-slate-900 group-hover:text-cyan-700")}>
                  {settings?.contact_phone || "+62 823 3162 3374"}
                </p>
              </div>
            </TiltCard>
          </div>
        </div>

        {/* Right Form */}
        <div className="flex-1 relative z-10 flex flex-col justify-center">
          <div className={cn(
            "rounded-[32px] p-6 sm:p-10 backdrop-blur-md shadow-2xl relative overflow-hidden border",
            isDark
              ? "bg-cyan-950/30 border-cyan-500/10"
              : "bg-slate-50 border-slate-200"
          )}>
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Send a Message</h3>
            <p className={cn("text-sm mb-8", isDark ? "text-zinc-400" : "text-slate-500")}>Fill out the form below and I'll reply as soon as possible.</p>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
                  isDark
                    ? "bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                    : "bg-cyan-50 border border-cyan-200 shadow-md"
                )}>
                  <CheckCircle2 className={cn("w-10 h-10", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <h4 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Message Sent!</h4>
                <p className={cn(isDark ? "text-zinc-400" : "text-slate-600")}>Thanks for reaching out. I'll get back to you soon.</p>
              </motion.div>
            ) : requiresVerification ? (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
                    isDark
                      ? "bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                      : "bg-cyan-50 border border-cyan-200"
                  )}>
                    <Mail className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h4 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Verify Your Email</h4>
                  <p className={cn("text-sm mb-8", isDark ? "text-zinc-400" : "text-slate-600")}>
                    We've sent a 6-digit verification code to{" "}
                    <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{formData.email}</span>. The code will expire in 10 minutes.
                  </p>
                  
                  <div className="w-full max-w-xs mx-auto">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      placeholder="••••••"
                      className={cn(inputClass, "text-center text-2xl tracking-[0.5em]")}
                    />
                  </div>
                </div>

                <MagneticButton intensity={20} className="w-full mt-4">
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full relative group overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl py-4 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <div className="relative flex items-center justify-center gap-2 text-white font-bold tracking-wide">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Verifying...
                        </span>
                      ) : (
                        "Verify & Send Message"
                      )}
                    </div>
                  </button>
                </MagneticButton>
                
                <div className="text-center mt-4">
                  <button type="button" onClick={() => setRequiresVerification(false)} className={cn("text-sm transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                    Cancel Verification
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative group">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your Name"
                      className={inputClass}
                    />
                  </div>
                  <div className="relative group">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="Phone Number"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative group">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Your Email"
                      className={inputClass}
                    />
                  </div>
                  <div className="relative group">
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="Subject"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="relative group">
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    placeholder="Your Message..."
                    rows={4}
                    className={cn(inputClass, "resize-none")}
                  />
                </div>

                <MagneticButton intensity={20} className="w-full">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </MagneticButton>
              </form>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}