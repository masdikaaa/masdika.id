"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, Timer, Phone, MapPin, Briefcase } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";
import { Turnstile } from '@marsidev/react-turnstile';
import { ServerBackground } from "@/components/ui/ServerBackground";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const InputField = ({ icon: Icon, value, onChange, type = "text", placeholder, required = false, autoComplete }: any) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const inputWrapperBase = cn(
    "relative flex items-center rounded-xl overflow-hidden transition-all duration-300 shadow-inner",
    isDark
      ? "bg-[#0a1624] border border-white/5 focus-within:border-cyan-500/30 focus-within:bg-[#0c1b2b]"
      : "bg-white border border-slate-200 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-300/40"
  );

  const inputClass = cn(
    "w-full py-3.5 pr-4 bg-transparent focus:outline-none font-medium",
    isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400"
  );

  const iconClass = cn(
    "w-5 h-5 transition-colors",
    isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600"
  );

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
      <div className={inputWrapperBase}>
        {Icon && (
          <div className="pl-4 pr-3 flex items-center justify-center">
            <Icon className={iconClass} />
          </div>
        )}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} className={inputClass} required={required} />
      </div>
    </div>
  );
};

export default function RegisterPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: "" });
  const [otpCode, setOtpCode] = useState("");
  const [refCode, setRefCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const formLoadTimeRef = useRef(Date.now());

  // Billing Info
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) setRefCode(ref);
    }
  }, []);

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 7) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    let text = "";
    switch (score) {
      case 0: case 1: text = "Weak"; break;
      case 2: text = "Fair"; break;
      case 3: text = "Good"; break;
      case 4: text = "Strong"; break;
    }
    setPasswordStrength({ score, text });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    let digits = val.replace(/\D/g, "");
    if (digits.length === 0) { setPhone(""); return; }
    let formatted = "+";
    if (digits.startsWith("62")) {
      formatted += "62";
      if (digits.length > 2) formatted += " " + digits.substring(2, 5);
      if (digits.length > 5) formatted += " " + digits.substring(5, 9);
      if (digits.length > 9) formatted += " " + digits.substring(9, 14);
    } else if (digits.startsWith("1")) {
      formatted += "1";
      if (digits.length > 1) formatted += " " + digits.substring(1, 4);
      if (digits.length > 4) formatted += " " + digits.substring(4, 7);
      if (digits.length > 7) formatted += " " + digits.substring(7, 11);
    } else {
      formatted += digits.substring(0, 2);
      if (digits.length > 2) formatted += " " + digits.substring(2, 5);
      if (digits.length > 5) formatted += " " + digits.substring(5, 9);
      if (digits.length > 9) formatted += " " + digits.substring(9, 15);
    }
    if (val.endsWith(" ") && formatted.length < 15 && !formatted.endsWith(" ")) formatted += " ";
    setPhone(formatted);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (name.trim().length < 3) return toast.error("Full Name must be at least 3 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    if (passwordStrength.score < 3) return toast.error("Please use a stronger password!");
    if (phone.replace(/\D/g, "").length < 8) return toast.error("Please enter a valid phone number");
    if (address1.trim().length < 5) return toast.error("Please enter a complete address");
    if (city.trim().length < 2) return toast.error("Please enter a valid city");
    if (state.trim().length < 2) return toast.error("Please enter a valid state/province");
    if (postalCode.trim().length < 3) return toast.error("Please enter a valid postal code");
    if (!country) return toast.error("Please select a country");
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, ref: refCode, turnstileToken, _hp: "", _ts: formLoadTimeRef.current, companyName, phone, address1, address2, city, state, postalCode, country })
      });
      const data = await res.json();
      if (res.ok && data.requiresOtp) {
        toast.success("Verification code sent to your email.");
        setStep("otp");
        setOtpCountdown(600);
        setResendCountdown(60);
      } else {
        toast.error(data.error || "Registration failed!");
      }
    } catch (err) {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Registration successful! You can now log in.");
        router.push("/login");
      } else {
        toast.error(data.error || "Invalid verification code!");
      }
    } catch (err) {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpCountdown((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendOtp = async () => {
    setIsResendingOtp(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, ref: refCode, turnstileToken, _hp: "", _ts: formLoadTimeRef.current, companyName, phone, address1, address2, city, state, postalCode, country })
      });
      const data = await res.json();
      if (res.ok && data.requiresOtp) {
        toast.success("New verification code sent to your email.");
        setOtpCountdown(600);
        setResendCountdown(60);
        setOtpCode("");
      } else {
        toast.error(data.error || "Failed to resend code.");
      }
    } catch (err) {
      toast.error("Something went wrong!");
    } finally {
      setIsResendingOtp(false);
    }
  };

  // ── Shared style helpers ──────────────────────────────────────────────────
  const labelClass = "text-[11px] font-bold uppercase tracking-widest pl-1 " + (isDark ? "text-cyan-500/80" : "text-cyan-700");

  const inputWrapperBase = cn(
    "relative flex items-center rounded-xl overflow-hidden transition-all duration-300 shadow-inner",
    isDark
      ? "bg-[#0a1624] border border-white/5 focus-within:border-cyan-500/30 focus-within:bg-[#0c1b2b]"
      : "bg-white border border-slate-200 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-300/40"
  );

  const inputClass = cn(
    "w-full py-3.5 pr-4 bg-transparent focus:outline-none font-medium",
    isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400"
  );

  const iconClass = cn(
    "w-5 h-5 transition-colors",
    isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600"
  );

  const dividerClass = cn("flex-grow border-t", isDark ? "border-white/10" : "border-slate-200");
  const dividerTextClass = cn("flex-shrink-0 mx-4 text-xs font-bold uppercase", isDark ? "text-zinc-500" : "text-slate-400");

  const eyeBtnClass = cn(
    "absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center transition-colors",
    isDark
      ? "text-zinc-500 hover:text-cyan-400 bg-gradient-to-l from-[#0a1624] via-[#0a1624] to-transparent"
      : "text-slate-400 hover:text-cyan-600 bg-gradient-to-l from-white via-white to-transparent"
  );

  return (
    <div className={cn("h-screen w-full flex overflow-hidden relative font-sans selection:bg-cyan-500/30", isDark ? "text-white" : "text-slate-900")}>
      <ServerBackground />

      {/* LEFT PANEL: Info — sticky */}
      <div className="hidden lg:flex lg:w-[55%] items-center justify-center p-8 relative z-10 sticky top-0 h-screen flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-2xl"
        >
          <div className={cn(
            "relative w-full rounded-[2.5rem] border backdrop-blur-sm p-12 shadow-[0_0_50px_rgba(0,0,0,0.2)] overflow-hidden group",
            isDark ? "border-white/5 bg-white/[0.02]" : "border-slate-200 bg-white/60"
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />

            <div className="relative z-10 space-y-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
                className={cn("inline-flex items-center gap-3 rounded-full border px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.3em]", isDark ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.15)]" : "border-cyan-200 bg-cyan-50 text-cyan-700")}
              >
                <motion.span
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={cn("w-2.5 h-2.5 rounded-full", isDark ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" : "bg-cyan-500")}
                />
                Cloud Provider & API Hub
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
                <h2 className={cn("text-4xl lg:text-5xl font-black leading-[1.1] mb-6 drop-shadow-sm", isDark ? "text-white" : "text-[#0F3B4A]")}>
                  Deploy your Cloud, build with our APIs.
                </h2>
                <p className={cn("text-base leading-relaxed max-w-xl font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Create an account to deploy high-performance Cloud VPS, manage Kubernetes clusters, generate API keys, and join our developer community.
                </p>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Cloud VPS", desc: "KVM Isolation", color: "cyan" },
                  { label: "K3s Clusters", desc: "HA Kubernetes", color: "blue" },
                  { label: "API Hub", desc: "Public APIs", color: "cyan" },
                  { label: "Community", desc: "Developer Network", color: "blue" },
                ].map((item) => (
                  <div key={item.label} className={cn(
                    "rounded-2xl border p-4 transition-all",
                    isDark ? "border-white/5 bg-white/[0.02] hover:border-cyan-500/20" : "border-slate-200 bg-white hover:border-cyan-200 shadow-sm"
                  )}>
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", item.color === "cyan" ? (isDark ? "text-cyan-400" : "text-cyan-600") : (isDark ? "text-blue-400" : "text-blue-600"))}>{item.desc}</p>
                    <p className={cn("font-black text-lg", isDark ? "text-white" : "text-slate-900")}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL: Form — scrollable */}
      <div className={cn(
        "w-full lg:w-[45%] overflow-y-auto h-screen hide-scrollbar flex flex-col relative z-10 lg:border-l",
        isDark ? "bg-[#020d18]/50 backdrop-blur-sm border-white/5" : "bg-white/70 backdrop-blur-md border-slate-200"
      )}>
        {/* Sticky Logo */}
        <div className={cn(
          "sticky top-0 z-20 px-8 sm:px-12 lg:px-12 xl:px-16 pt-6 pb-4 backdrop-blur-md border-b w-full",
          isDark ? "bg-[#020d18]/80 border-white/5" : "bg-white/90 border-slate-200"
        )}>
          <Link href="/" className="flex items-center group w-fit">
              <img
                src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                alt="Masdika Logo"
                className="h-8 w-auto"
              />
            </Link>
        </div>

        <div className="flex-1 flex flex-col lg:justify-center px-6 sm:px-12 lg:px-12 xl:px-16 py-10">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-xl mx-auto"
          >
            <h1 className={cn("text-3xl font-bold drop-shadow-sm mb-2", isDark ? "text-white" : "text-[#0F3B4A]")}>
              {step === "form" ? "Create Account" : "Verify Email"}
            </h1>
            <p className={cn("mb-8 text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
              {step === "form" ? "Fill in your details below to get started." : "We've sent a 6-digit code to your email."}
            </p>

            {step === "form" ? (
              <form onSubmit={handleRegister} className="space-y-5">

                {/* Row 1: Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <label className={labelClass}>Full Name</label>
                    <InputField icon={User} value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Full name" required />
                  </div>
                  <div className="space-y-2.5">
                    <label className={labelClass}>Email Address</label>
                    <InputField icon={Mail} value={email} onChange={(e: any) => setEmail(e.target.value)} type="email" placeholder="Email address" autoComplete="email" required />
                  </div>
                </div>

                {/* Row 2: Password + Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <label className={labelClass}>Password</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                      <div className={inputWrapperBase}>
                        <div className="pl-4 pr-3 flex items-center justify-center"><Lock className={iconClass} /></div>
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); checkPasswordStrength(e.target.value); }} placeholder="Create a password" className={cn(inputClass, "pr-12")} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className={eyeBtnClass} tabIndex={-1}>
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {password && (
                      <div className="flex gap-1 h-1.5 mt-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div key={level} className={`flex-1 rounded-full transition-colors ${passwordStrength.score >= level ? passwordStrength.score < 2 ? 'bg-red-500' : passwordStrength.score < 3 ? 'bg-yellow-500' : passwordStrength.score < 4 ? 'bg-cyan-500' : 'bg-emerald-500' : isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <label className={labelClass}>Confirm Password</label>
                    <div className="relative group">
                      <div className={`absolute inset-0 bg-gradient-to-r rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 ${confirmPassword && confirmPassword !== password ? 'from-red-500/20 to-orange-500/20' : 'from-cyan-500/20 to-blue-500/20'}`} />
                      <div className={cn(
                        "relative flex items-center rounded-xl overflow-hidden transition-all duration-300 shadow-inner",
                        confirmPassword && confirmPassword !== password
                          ? isDark ? "bg-[#0a1624] border border-red-500/30 focus-within:border-red-500/50 focus-within:bg-[#0c1b2b]" : "bg-white border border-red-300 focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-200"
                          : inputWrapperBase
                      )}>
                        <div className="pl-4 pr-3 flex items-center justify-center">
                          <Lock className={cn("w-5 h-5 transition-colors", confirmPassword && confirmPassword !== password ? "text-red-500/70" : iconClass)} />
                        </div>
                        <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className={cn(inputClass, "pr-12")} required />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={eyeBtnClass} tabIndex={-1}>
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>

                {/* Billing Divider */}
                <div className="relative flex items-center pt-2 pb-1">
                  <div className={dividerClass} />
                  <span className={dividerTextClass}>Billing Information</span>
                  <div className={dividerClass} />
                </div>

                {/* Company + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <label className={labelClass}>Company Name <span className={cn("normal-case font-normal", isDark ? "text-zinc-600" : "text-slate-400")}>(optional)</span></label>
                    <InputField icon={Briefcase} value={companyName} onChange={(e: any) => setCompanyName(e.target.value)} placeholder="Company (optional)" />
                  </div>
                  <div className="space-y-2.5">
                    <label className={labelClass}>Phone Number</label>
                    <InputField icon={Phone} value={phone} onChange={handlePhoneChange} type="tel" placeholder="+62 812 3456 7890" required />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2.5">
                  <label className={labelClass}>Address</label>
                  <InputField icon={MapPin} value={address1} onChange={(e: any) => setAddress1(e.target.value)} placeholder="Street address" required />
                  <div className="relative group mt-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className={inputWrapperBase}>
                      <div className="pl-4 pr-3 flex items-center justify-center">
                        <MapPin className={cn("w-5 h-5", isDark ? "text-zinc-500/40" : "text-slate-300")} />
                      </div>
                      <input type="text" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apt, suite, floor (optional)" className={inputClass} />
                    </div>
                  </div>
                </div>

                {/* City + State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2.5">
                    <label className={labelClass}>City</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                      <div className={inputWrapperBase}>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jakarta" className={cn(inputClass, "px-4")} required />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className={labelClass}>State / Province</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                      <div className={inputWrapperBase}>
                        <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="DKI Jakarta" className={cn(inputClass, "px-4")} required />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Postal + Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2.5">
                    <label className={labelClass}>Postal Code</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                      <div className={inputWrapperBase}>
                        <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="10110" className={cn(inputClass, "px-4")} required />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className={labelClass}>Country</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                      <div className={inputWrapperBase}>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className={cn(
                            "w-full py-3.5 px-4 focus:outline-none font-medium appearance-none cursor-pointer",
                            isDark ? "bg-[#0a1624] text-white focus:bg-[#0c1b2b]" : "bg-white text-slate-900"
                          )}
                          required
                        >
                          <option value="" disabled className={isDark ? "text-zinc-600" : "text-slate-400"}>Select country</option>
                          <option value="ID">Indonesia</option>
                          <option value="SG">Singapore</option>
                          <option value="MY">Malaysia</option>
                          <option value="TH">Thailand</option>
                          <option value="PH">Philippines</option>
                          <option value="VN">Vietnam</option>
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="AU">Australia</option>
                          <option value="JP">Japan</option>
                          <option value="KR">South Korea</option>
                          <option value="CN">China</option>
                          <option value="IN">India</option>
                          <option value="DE">Germany</option>
                          <option value="NL">Netherlands</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Or continue with */}
                <div className="relative flex items-center py-4">
                  <div className={dividerClass} /><span className={dividerTextClass}>Or continue with</span><div className={dividerClass} />
                </div>

                <a
                  href="/api/auth/google/login"
                  className={cn("w-full flex items-center justify-center gap-3 py-3.5 mb-4 rounded-xl border transition-colors", isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-slate-200 bg-white hover:bg-slate-50 shadow-sm")}
                >
                  <FcGoogle className="w-5 h-5" />
                  <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-700")}>Sign up with Google</span>
                </a>

                <div className="flex justify-center my-4 w-full">
                  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setTurnstileToken(token)}
                      options={{ theme: isDark ? 'dark' : 'light', size: 'flexible' }}
                      className="w-full"
                      style={{ width: '100%' }}
                    />
                  )}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-6 py-4 font-bold tracking-wide transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6 shadow-sm hover:shadow-[0_0_20px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2">
                    {loading ? (<><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Processing...</span></>) : "Sign Up"}
                </button>

                <div className="text-center mt-6">
                  <Link href="/login" className={cn("text-sm transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}>
                    Already have an account? Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2.5">
                  <label className={labelClass}>One-Time Password</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className={cn(
                      "relative flex items-center rounded-xl overflow-hidden transition-all duration-300",
                      isDark
                        ? "bg-[#0a1624] border border-cyan-500/30 focus-within:border-cyan-400 focus-within:bg-[#0c1b2b] shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                        : "bg-white border border-cyan-300 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-200 shadow-sm"
                    )}>
                      <div className="absolute left-5 flex items-center justify-center pointer-events-none">
                        <Lock className={cn("w-5 h-5", isDark ? "text-cyan-500" : "text-cyan-600")} />
                      </div>
                      <input
                        type="text" inputMode="numeric" pattern="\d*"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className={cn(
                          "w-full py-4 px-12 bg-transparent focus:outline-none font-black tracking-[0.75em] text-center text-2xl transition-all duration-300",
                          isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-300"
                        )}
                        required autoFocus maxLength={6}
                      />
                    </div>
                  </div>
                </div>

                {/* Countdown */}
                <div className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium",
                  otpCountdown > 60
                    ? isDark ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                    : otpCountdown > 0
                      ? isDark ? "bg-amber-500/5 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-600"
                      : isDark ? "bg-red-500/5 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"
                )}>
                  <Timer className="w-4 h-4" />
                  {otpCountdown > 0
                    ? <span>Code expires in <span className="font-bold tabular-nums">{formatCountdown(otpCountdown)}</span></span>
                    : <span>Code has expired</span>
                  }
                </div>

                <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-6 py-4 font-bold tracking-wide transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-8 shadow-sm hover:shadow-[0_0_20px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2">
                    {loading ? (<><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Verifying...</span></>) : "Verify & Complete"}
                </button>

                <button type="button" onClick={() => setStep("form")} className={cn("w-full flex items-center justify-center py-2 text-sm transition-colors mt-4", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-400 hover:text-cyan-600")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change Email Address
                </button>

                <button type="button" onClick={handleResendOtp} disabled={isResendingOtp || resendCountdown > 0} className={cn("w-full flex items-center justify-center py-2 text-sm transition-colors mt-2 disabled:opacity-50", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-500")}>
                  {isResendingOtp ? "Sending..." : resendCountdown > 0 ? `Resend Code in ${resendCountdown}s` : "Resend Verification Code"}
                </button>
              </motion.form>
            )}

            <p className={cn("mt-8 text-xs text-center", isDark ? "text-zinc-600" : "text-slate-400")}>
              Copyright &copy; {new Date().getFullYear()} PT Masdika Teknologi Indonesia. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
