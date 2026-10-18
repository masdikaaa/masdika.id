"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Mail, 
  MapPin, 
  Phone, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  ArrowDown
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TiltCard } from "@/components/animations/TiltCard";
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

  const contactEmail = settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'me@masdika.id';
  const contactPhone = settings?.contact_phone || "+62 823 3162 3374";
  const contactLocation = settings?.contact_location || "Sidoarjo, Jawa Timur, Indonesia";
  const whatsappNumber = contactPhone.replace(/[^0-9]/g, '');

  const inputClass = cn(
    "w-full rounded-xl px-4 sm:px-5 py-3.5 transition-all duration-200 text-sm focus:outline-none focus:ring-1",
    isDark
      ? "bg-[#050b14] border border-white/10 text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:ring-cyan-400/30"
      : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-300 shadow-sm"
  );

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden bg-[var(--background)] text-[var(--text-primary)] transition-colors">
      {/* ── 1. HERO SECTION (2-Kolom Sesuai design.md) ───────────────── */}
      <section className="relative pt-4 sm:pt-8 pb-12 lg:pb-20 flex items-center">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Headline & Action */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="mb-6 sm:mb-8 font-mono uppercase">
                AVAILABLE FOR INQUIRIES &amp; PROJECTS
              </Badge>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-6 text-[var(--text-primary)]">
                Have an idea? <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-400 to-cyan-200 bg-clip-text text-transparent">
                  Let&apos;s talk.
                </span>
              </h1>

              <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl mb-8">
                Whether you have a question, a custom cloud architecture inquiry, a project proposal, or just want to say hi, my inbox is always open.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mb-10">
                <Button
                  variant="primary"
                  size="lg"
                  href="#contact-form"
                  rightIcon={<ArrowDown className="w-5 h-5" />}
                >
                  Send Message
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  rightIcon={<MessageSquare className="w-5 h-5 text-emerald-400" />}
                >
                  Chat WhatsApp
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-[var(--text-secondary)] pt-2 border-t border-[var(--border-primary)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  Fast Response (&lt; 1h)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  100% Confidential
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  Sidoarjo Datacenter Hub
                </span>
              </div>
            </motion.div>

            {/* Right Column: Hero Avatar (contact.webp / contact.png) with 4 Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-6 lg:mt-0"
            >
              <div className="relative w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] h-[380px] sm:h-[440px] lg:h-[480px] mx-auto flex items-end justify-center">
                {/* Subtle ambient depth bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[300px] sm:w-[440px] sm:h-[360px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left (Direct Email) */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Mail className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Direct Email
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[90px] sm:max-w-none">
                      {contactEmail}
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right (WhatsApp & Phone) */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      WhatsApp &amp; Call
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      {contactPhone}
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left (Location) */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Location &amp; DC
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      {settings?.contact_location || "Sidoarjo, Jawa Timur"}
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right (Response Time) */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Response Time
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      Sub-1 Hour Guarantee
                    </div>
                  </div>
                </div>

                {/* Karakter contact.png utuh & proporsional sesuai design.md */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0.7) 90%, rgba(0,0,0,0) 99%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0.7) 90%, rgba(0,0,0,0) 99%)"
                  }}
                >
                  <Image
                    src="/contact.webp"
                    alt="Masdika Contact Mascot"
                    width={1536}
                    height={1024}
                    priority={true}
                    unoptimized={true}
                    className="w-full h-full object-contain object-bottom"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/30 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── 2. CONTACT SECTION (Interactive Form & Direct Channels) ─────── */}
      <section id="contact-form" className="py-12 sm:py-16 pb-20 sm:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className={cn(
            "w-full rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 lg:p-14 relative overflow-hidden border transition-all duration-300",
            isDark
              ? "bg-[#050b14] border-white/10 shadow-2xl shadow-black/80"
              : "bg-white border-slate-200/90 shadow-xl"
          )}>
            {/* Top ambient highlight line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              
              {/* Left Column: Direct Channels & Information (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                    GET IN TOUCH DIRECTLY
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                    Let&apos;s build <br />
                    <span className="bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent">
                      something great.
                    </span>
                  </h2>
                  <p className="text-base text-[var(--text-secondary)] leading-relaxed mb-8">
                    Have a technical inquiry, infrastructure proposal, or want to discuss managed cloud instances? Contact us through any of our direct channels below.
                  </p>

                  <div className="space-y-4">
                    {/* Email Card */}
                    <TiltCard intensity={4} className={cn(
                      "flex items-center gap-4 sm:gap-5 p-4 sm:p-4.5 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
                      isDark
                        ? "bg-[#011627] border-white/10 hover:border-cyan-500/40 hover:bg-[#031d33]"
                        : "bg-slate-50 border-slate-200/90 hover:border-cyan-300 hover:bg-cyan-50/40 shadow-sm"
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105",
                        isDark
                          ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                          : "bg-cyan-50 border-cyan-200 text-cyan-600 group-hover:bg-cyan-100"
                      )}>
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>
                          Official Email
                        </p>
                        <a 
                          href={`mailto:${contactEmail}`} 
                          className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-cyan-500 transition-colors truncate block"
                        >
                          {contactEmail}
                        </a>
                      </div>
                    </TiltCard>

                    {/* WhatsApp Card */}
                    <TiltCard intensity={4} className={cn(
                      "flex items-center gap-4 sm:gap-5 p-4 sm:p-4.5 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
                      isDark
                        ? "bg-[#011627] border-white/10 hover:border-cyan-500/40 hover:bg-[#031d33]"
                        : "bg-slate-50 border-slate-200/90 hover:border-cyan-300 hover:bg-cyan-50/40 shadow-sm"
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105",
                        isDark
                          ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                          : "bg-cyan-50 border-cyan-200 text-cyan-600 group-hover:bg-cyan-100"
                      )}>
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>
                          WhatsApp &amp; Support
                        </p>
                        <a 
                          href={`https://wa.me/${whatsappNumber}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-cyan-500 transition-colors truncate block"
                        >
                          {contactPhone}
                        </a>
                      </div>
                    </TiltCard>

                    {/* Location Card */}
                    <TiltCard intensity={4} className={cn(
                      "flex items-center gap-4 sm:gap-5 p-4 sm:p-4.5 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
                      isDark
                        ? "bg-[#011627] border-white/10 hover:border-cyan-500/40 hover:bg-[#031d33]"
                        : "bg-slate-50 border-slate-200/90 hover:border-cyan-300 hover:bg-cyan-50/40 shadow-sm"
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105",
                        isDark
                          ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                          : "bg-cyan-50 border-cyan-200 text-cyan-600 group-hover:bg-cyan-100"
                      )}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>
                          Location Hub
                        </p>
                        <p className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                          {contactLocation}
                        </p>
                      </div>
                    </TiltCard>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--border-primary)] flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Support availability: Mon - Sun (24/7 Monitoring)</span>
                </div>
              </div>

              {/* Right Column: Interactive Contact Form (7 Cols) */}
              <div className="lg:col-span-7">
                <div className={cn(
                  "rounded-3xl p-6 sm:p-8 relative overflow-hidden border transition-all duration-300",
                  isDark
                    ? "bg-[#011627] border-white/10 shadow-xl"
                    : "bg-slate-50/80 border-slate-200"
                )}>
                  <div className="mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
                      <Send className="w-5 h-5 text-cyan-400" />
                      <span>Send a Direct Message</span>
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Fill out the form below and we will get back to you via email or WhatsApp promptly.
                    </p>
                  </div>

                  {success ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className={cn(
                        "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border",
                        isDark
                          ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                          : "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-md"
                      )}>
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h4 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Message Dispatched!</h4>
                      <p className="text-[var(--text-secondary)] max-w-sm">
                        Thank you for reaching out. We have received your inquiry and will reply shortly.
                      </p>
                    </motion.div>
                  ) : requiresVerification ? (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border",
                          isDark
                            ? "bg-cyan-950/50 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                            : "bg-cyan-50 border-cyan-200 text-cyan-600"
                        )}>
                          <Mail className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">Verify Your Email</h4>
                        <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
                          We&apos;ve sent a 6-digit verification code to{" "}
                          <span className="font-bold text-[var(--text-primary)]">{formData.email}</span>. Please enter the code below to verify your message submission.
                        </p>
                        
                        <div className="w-full max-w-xs mx-auto">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            placeholder="••••••"
                            className={cn(inputClass, "text-center text-2xl font-mono tracking-[0.5em]")}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={loading}
                        disabled={loading || otp.length !== 6}
                        className="w-full"
                      >
                        Verify &amp; Dispatch Message
                      </Button>
                      
                      <div className="text-center mt-3">
                        <button
                          type="button" 
                          onClick={() => setRequiresVerification(false)} 
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline"
                        >
                          Cancel Verification
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Masdika Cloud"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                            Phone / WhatsApp *
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="e.g. +62 823 3162 3374"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="e.g. name@company.com"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                            Subject *
                          </label>
                          <input
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                            placeholder="e.g. VPS Infrastructure Inquiry"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                          Your Message *
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          placeholder="Tell us about your requirements, project scope, or questions..."
                          rows={4}
                          className={cn(inputClass, "resize-none")}
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        disabled={loading}
                        rightIcon={<Send className="w-4 h-4" />}
                        className="w-full mt-2"
                      >
                        Send Message
                      </Button>
                    </form>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}