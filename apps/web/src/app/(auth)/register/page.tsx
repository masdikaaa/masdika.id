"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowLeft,
  Timer,
  Phone,
  MapPin,
  Building2,
  Sun,
  Moon,
  Rocket,
  Cpu,
  Server,
  Zap,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
  const formLoadTimeRef = useRef(0);

  useEffect(() => {
    formLoadTimeRef.current = Date.now();
  }, []);

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
      case 0:
      case 1:
        text = "Weak";
        break;
      case 2:
        text = "Fair";
        break;
      case 3:
        text = "Good";
        break;
      case 4:
        text = "Strong";
        break;
    }
    setPasswordStrength({ score, text });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    let digits = val.replace(/\D/g, "");
    if (digits.length === 0) {
      setPhone("");
      return;
    }
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          ref: refCode,
          turnstileToken,
          _hp: "",
          _ts: formLoadTimeRef.current,
          companyName,
          phone,
          address1,
          address2,
          city,
          state,
          postalCode,
          country,
        }),
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
      const res = await fetch("/api/auth/verify-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
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
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResendOtp = async () => {
    setIsResendingOtp(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          ref: refCode,
          turnstileToken,
          _hp: "",
          _ts: formLoadTimeRef.current,
          companyName,
          phone,
          address1,
          address2,
          city,
          state,
          postalCode,
          country,
        }),
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

  // Shared style helpers adhering strictly to design.md
  const labelClass = cn(
    "text-[11px] font-bold uppercase tracking-widest pl-1",
    isDark ? "text-cyan-400" : "text-cyan-600"
  );

  const inputWrapperBase = cn(
    "relative flex items-center rounded-xl overflow-hidden transition-all duration-300 shadow-inner",
    isDark
      ? "bg-[#121216] border border-white/10 focus-within:border-cyan-500/50 focus-within:bg-[#18181d] focus-within:ring-1 focus-within:ring-cyan-500/30"
      : "bg-slate-50 border border-slate-200 focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-cyan-400/40 shadow-sm"
  );

  const inputClass = cn(
    "w-full py-3.5 pr-4 bg-transparent focus:outline-none font-medium text-sm",
    isDark ? "text-white placeholder:text-zinc-500" : "text-slate-900 placeholder:text-slate-400"
  );

  const iconClass = cn(
    "transition-colors",
    isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600"
  );

  return (
    <div
      className={cn(
        "min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-x-hidden font-sans selection:bg-cyan-500/30",
        isDark ? "text-white" : "text-slate-900"
      )}
    >
      {/* Clean atmospheric cyan background matching frontend */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 transition-colors duration-500"
        style={{ backgroundColor: isDark ? "#000000" : "#f8fafb" }}
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.05) 45%, transparent 75%), radial-gradient(ellipse 55% 45% at 20% 85%, rgba(6,182,212,0.10) 0%, transparent 65%)"
              : "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.03) 45%, transparent 75%), radial-gradient(ellipse 55% 45% at 20% 85%, rgba(6,182,212,0.06) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* Main Unified Dual-Panel Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "relative z-10 w-full max-w-5xl xl:max-w-6xl rounded-2xl sm:rounded-[2.5rem] border backdrop-blur-xl shadow-2xl overflow-hidden grid lg:grid-cols-12 transition-all duration-300",
          isDark
            ? "bg-[#0c0c0e]/95 border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
            : "bg-white/95 border-slate-200/80 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
        )}
      >
        {/* LEFT COLUMN: Form */}
        <div className="lg:col-span-7 w-full min-w-0 max-w-full p-6 pt-8 sm:p-10 lg:p-10 xl:p-12 flex flex-col justify-between relative z-10 overflow-hidden">
          <div className="w-full min-w-0">
            {/* Top Brand Header & Theme Toggle */}
            <div className="flex items-center justify-between mb-6 pt-1">
              <Link href="/" className="flex items-center group transition-transform hover:scale-105">
                <img
                  src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                  alt="Masdika Logo"
                  className="h-8 w-auto"
                />
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
                  isDark
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
                    : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-5">
              <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-1.5 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {step === "form" ? "Create Account" : "Verify Email"}
              </h1>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                {step === "form"
                  ? "Fill in your details below to get started with Masdika Cloud."
                  : "We've sent a 6-digit verification code to your email."}
              </p>
            </div>

            {/* Mobile Character Avatar (Only on small screens where right panel is hidden) */}
            <div className="lg:hidden flex items-center gap-3 p-2.5 sm:p-3 mb-5 rounded-2xl border bg-cyan-500/5 border-cyan-500/20 w-full min-w-0 overflow-hidden">
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-cyan-500/10 flex-shrink-0 flex items-center justify-center p-0.5">
                <Image
                  src="/images/auth/register.webp"
                  alt="Masdika Registration Assistant"
                  width={48}
                  height={48}
                  unoptimized
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-slate-800")}>Welcome to Masdika!</p>
                <p className={cn("text-[11px] leading-tight truncate sm:whitespace-normal", isDark ? "text-zinc-400" : "text-slate-500")}>Fast setup for Cloud VPS & API Hub.</p>
              </div>
            </div>

            {/* Scrollable Form Body Container with generous spacing from scrollbar */}
            <div className="max-h-[66vh] overflow-y-auto overflow-x-hidden pr-2 sm:pr-4 auth-scrollbar w-full min-w-0">
              {step === "form" ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Row 1: Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Full Name</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <div className="pl-4 pr-3 flex items-center justify-center">
                            <User className={cn("w-4 h-4", iconClass)} />
                          </div>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full name"
                            className={inputClass}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>Email Address</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <div className="pl-4 pr-3 flex items-center justify-center">
                            <Mail className={cn("w-4 h-4", iconClass)} />
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            autoComplete="email"
                            className={inputClass}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Password + Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Password</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <div className="pl-4 pr-3 flex items-center justify-center">
                            <Lock className={cn("w-4 h-4", iconClass)} />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              checkPasswordStrength(e.target.value);
                            }}
                            placeholder="Create a password"
                            className={cn(inputClass, "pr-10")}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={cn(
                              "absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center transition-colors",
                              isDark ? "text-zinc-500 hover:text-cyan-400" : "text-slate-400 hover:text-cyan-600"
                            )}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>Confirm Password</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <div className="pl-4 pr-3 flex items-center justify-center">
                            <Lock className={cn("w-4 h-4", iconClass)} />
                          </div>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            className={cn(inputClass, "pr-10")}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={cn(
                              "absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center transition-colors",
                              isDark ? "text-zinc-500 hover:text-cyan-400" : "text-slate-400 hover:text-cyan-600"
                            )}
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Strength</span>
                        <span
                          className={
                            passwordStrength.score < 2
                              ? "text-red-500"
                              : passwordStrength.score < 4
                              ? isDark ? "text-amber-400" : "text-amber-600"
                              : isDark ? "text-cyan-400" : "text-cyan-700"
                          }
                        >
                          {passwordStrength.text}
                        </span>
                      </div>
                      <div className="flex gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((stepVal) => (
                          <div
                            key={stepVal}
                            className={cn(
                              "h-full flex-1 rounded-full transition-all duration-300",
                              passwordStrength.score >= stepVal
                                ? passwordStrength.score < 2
                                  ? "bg-red-500"
                                  : passwordStrength.score < 4
                                  ? "bg-amber-500"
                                  : "bg-cyan-500"
                                : isDark
                                ? "bg-white/10"
                                : "bg-slate-200"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Billing Information Divider */}
                  <div className="relative flex items-center py-2">
                    <div className={cn("flex-grow border-t", isDark ? "border-white/10" : "border-slate-200")} />
                    <span className={cn("flex-shrink-0 mx-3 text-[10px] font-black uppercase tracking-widest", isDark ? "text-cyan-500/70" : "text-cyan-700")}>
                      Billing Information
                    </span>
                    <div className={cn("flex-grow border-t", isDark ? "border-white/10" : "border-slate-200")} />
                  </div>

                  {/* Row 3: Phone + Company */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Phone Number</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <div className="pl-4 pr-3 flex items-center justify-center">
                            <Phone className={cn("w-4 h-4", iconClass)} />
                          </div>
                          <input
                            type="tel"
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="+62 812 3456 7890"
                            className={inputClass}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>Company Name (Optional)</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <div className="pl-4 pr-3 flex items-center justify-center">
                            <Building2 className={cn("w-4 h-4", iconClass)} />
                          </div>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Company name"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Street Address */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>Street Address</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                      <div className={inputWrapperBase}>
                        <div className="pl-4 pr-3 flex items-center justify-center">
                          <MapPin className={cn("w-4 h-4", iconClass)} />
                        </div>
                        <input
                          type="text"
                          value={address1}
                          onChange={(e) => setAddress1(e.target.value)}
                          placeholder="Jl. Jendral Sudirman No. 123"
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Address 2 (Optional) */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>Address Line 2 (Optional)</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                      <div className={inputWrapperBase}>
                        <div className="pl-4 pr-3 flex items-center justify-center">
                          <MapPin className={cn("w-4 h-4", isDark ? "text-zinc-600" : "text-slate-300")} />
                        </div>
                        <input
                          type="text"
                          value={address2}
                          onChange={(e) => setAddress2(e.target.value)}
                          placeholder="Apt, suite, floor, unit"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 6: City + State */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={labelClass}>City</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Jakarta"
                            className={cn(inputClass, "px-4")}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>State / Province</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="DKI Jakarta"
                            className={cn(inputClass, "px-4")}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 7: Postal + Country */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Postal Code</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="10110"
                            className={cn(inputClass, "px-4")}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>Country</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className={inputWrapperBase}>
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className={cn(
                              "w-full py-3.5 px-4 focus:outline-none font-medium appearance-none cursor-pointer text-sm",
                              isDark ? "bg-[#0a1624] text-white focus:bg-[#0c1b2b]" : "bg-white text-slate-900"
                            )}
                            required
                          >
                            <option value="" disabled className={isDark ? "text-zinc-600" : "text-slate-400"}>
                              Select country
                            </option>
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

                  {/* Turnstile */}
                  <div className="flex justify-center pt-1 w-full min-w-0 px-px">
                    {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                      <Turnstile
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                        onSuccess={(token) => setTurnstileToken(token)}
                        options={{ theme: isDark ? "dark" : "light", size: "flexible" }}
                        className="w-full"
                        style={{ width: "100%" }}
                      />
                    )}
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 rounded-lg py-3 px-6 font-semibold tracking-wide transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </button>

                  {/* Divider & Google */}
                  <div className="relative flex items-center py-2">
                    <div className={cn("flex-grow border-t", isDark ? "border-white/10" : "border-slate-200")} />
                    <span className={cn("flex-shrink-0 mx-4 text-[10px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                      Or
                    </span>
                    <div className={cn("flex-grow border-t", isDark ? "border-white/10" : "border-slate-200")} />
                  </div>

                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a
                    href="/api/auth/google/login"
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.99]",
                      isDark
                        ? "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                    )}
                  >
                    <FcGoogle className="w-5 h-5" />
                    <span className="text-sm font-bold">Sign up with Google</span>
                  </a>

                  {/* Sign In Link */}
                  <div className="text-center pt-2">
                    <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Already have an account?{" "}
                      <Link
                        href="/login"
                        className={cn(
                          "font-bold transition-colors underline decoration-cyan-500/40 underline-offset-4 hover:decoration-cyan-500",
                          isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-700 hover:text-cyan-800"
                        )}
                      >
                        Sign In
                      </Link>
                    </p>
                  </div>
                </form>
              ) : (
                /* Step 2: OTP Verification */
                <motion.form
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-5 py-4"
                >
                  <div className="space-y-2">
                    <label className={labelClass}>One-Time Password</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                      <div className={inputWrapperBase}>
                        <div className="pl-4 pr-3 flex items-center justify-center">
                          <Lock className={cn("w-4 h-4", iconClass)} />
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="••••••"
                          className={cn(
                            inputClass,
                            "w-full py-4 bg-transparent focus:outline-none font-black tracking-[0.6em] text-center text-2xl"
                          )}
                          required
                          autoFocus
                          maxLength={6}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Countdown Box */}
                  <div
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium",
                      otpCountdown > 60
                        ? isDark
                          ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-400"
                          : "bg-cyan-50 border-cyan-200 text-cyan-700"
                        : otpCountdown > 0
                        ? isDark
                          ? "bg-amber-500/5 border-amber-500/20 text-amber-400"
                          : "bg-amber-50 border-amber-200 text-amber-600"
                        : isDark
                        ? "bg-red-500/5 border-red-500/20 text-red-400"
                        : "bg-red-50 border-red-200 text-red-600"
                    )}
                  >
                    <Timer className="w-4 h-4" />
                    {otpCountdown > 0 ? (
                      <span>
                        Code expires in <span className="font-bold tabular-nums">{formatCountdown(otpCountdown)}</span>
                      </span>
                    ) : (
                      <span>Code has expired</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 rounded-lg py-3 px-6 font-semibold tracking-wide transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      "Verify & Complete"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className={cn(
                      "w-full flex items-center justify-center py-2 text-sm transition-colors mt-2",
                      isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600"
                    )}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Change Email Address
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResendingOtp || resendCountdown > 0}
                    className={cn(
                      "w-full flex items-center justify-center py-2 text-sm transition-colors mt-1 disabled:opacity-50",
                      isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-700 hover:text-cyan-800 font-semibold"
                    )}
                  >
                    {isResendingOtp
                      ? "Sending..."
                      : resendCountdown > 0
                      ? `Resend Code in ${resendCountdown}s`
                      : "Resend Verification Code"}
                  </button>
                </motion.form>
              )}
            </div>
          </div>

          {/* Legal footer */}
          <p className={cn("mt-4 text-[11px] text-center", isDark ? "text-zinc-600" : "text-slate-400")}>
            Copyright &copy; {new Date().getFullYear()} PT Masdika Teknologi Indonesia. All rights reserved.
          </p>
        </div>

        {/* RIGHT COLUMN: Hero Character Showcase (Register Character: register.png) */}
        <div
          className={cn(
            "hidden lg:flex lg:col-span-5 flex-col justify-between p-8 xl:p-12 relative overflow-hidden select-none",
            isDark
              ? "bg-gradient-to-br from-[#0c0c0e]/95 via-[#121216]/90 to-[#0c0c0e]/95 border-l border-white/10"
              : "bg-gradient-to-br from-cyan-50/70 via-sky-50/40 to-slate-50/80 border-l border-slate-200/80"
          )}
        >
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Floating Decorative Circles */}
          <motion.div
            animate={{ y: [0, -12, 0], x: [0, 4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "absolute top-10 left-8 w-9 h-9 rounded-full pointer-events-none",
              isDark ? "bg-cyan-500/10 border border-cyan-400/20" : "bg-cyan-200/50"
            )}
          />
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -6, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className={cn(
              "absolute top-1/3 right-8 w-14 h-14 rounded-full pointer-events-none",
              isDark ? "bg-cyan-500/10 border border-cyan-400/20" : "bg-cyan-200/40"
            )}
          />
          <motion.div
            animate={{ y: [0, -8, 0], x: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className={cn(
              "absolute bottom-20 left-10 w-6 h-6 rounded-full pointer-events-none",
              isDark ? "bg-cyan-400/15" : "bg-cyan-300/45"
            )}
          />

          {/* Top Showcase Header */}
          <div className="relative z-10 text-center pt-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-bold tracking-widest uppercase mb-3 shadow-sm"
              style={{
                borderColor: isDark ? "rgba(34,211,238,0.3)" : "rgba(6,182,212,0.3)",
                backgroundColor: isDark ? "rgba(34,211,238,0.08)" : "rgba(236,254,255,0.8)",
                color: isDark ? "#22d3ee" : "#0e7490",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              Start Your Cloud Journey
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={cn("text-3xl xl:text-4xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}
            >
              Join Masdika Cloud
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={cn("text-xs sm:text-sm mt-1.5 max-w-sm mx-auto font-medium", isDark ? "text-zinc-400" : "text-slate-600")}
            >
              Deploy high-performance Cloud VPS and integrate developer APIs in seconds.
            </motion.p>
          </div>

          {/* Character Illustration Area with Floating Badges */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center py-4">
            {/* Floating Badge 1: Top Right */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
              transition={{
                opacity: { duration: 0.5, delay: 0.3 },
                scale: { duration: 0.5, delay: 0.3 },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
              }}
              className={cn(
                "absolute -top-1 right-1 xl:right-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border backdrop-blur-md shadow-lg",
                isDark
                  ? "bg-[#121216]/95 border-cyan-500/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                  : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/70"
              )}
            >
              <div className="relative flex items-center justify-center w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </div>
              <div className="text-left">
                <p className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-400")}>
                  Provisioning
                </p>
                <p className="text-xs font-black">Instant VPS &lt; 60s</p>
              </div>
            </motion.div>

            {/* Floating Badge 2: Bottom Left */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, 6, 0] }}
              transition={{
                opacity: { duration: 0.5, delay: 0.4 },
                scale: { duration: 0.5, delay: 0.4 },
                y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 },
              }}
              className={cn(
                "absolute -bottom-2 left-1 xl:left-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border backdrop-blur-md shadow-lg",
                isDark
                  ? "bg-[#121216]/95 border-cyan-500/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                  : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/70"
              )}
            >
              <div className={cn("p-1.5 rounded-xl", isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700")}>
                <Rocket className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-400")}>
                  Performance
                </p>
                <p className="text-xs font-black">Fast SSD &amp; High Speed</p>
              </div>
            </motion.div>

            {/* 3D Character (register.png) */}
            <motion.div
              animate={{ y: [-7, 7, -7] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              <Image
                src="/images/auth/register.webp"
                alt="Masdika Assistant"
                width={380}
                height={500}
                priority
                unoptimized
                className="max-h-[320px] xl:max-h-[380px] w-auto object-contain drop-shadow-2xl select-none pointer-events-none"
              />

              {/* Dynamic Pedestal Grounding Shadow */}
              <motion.div
                animate={{ scale: [1, 0.86, 1], opacity: [0.55, 0.28, 0.55] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "w-44 xl:w-52 h-4 rounded-[100%] blur-md -mt-2 transition-colors pointer-events-none",
                  isDark ? "bg-cyan-500/30" : "bg-slate-900/15"
                )}
              />
            </motion.div>
          </div>

          {/* Bottom Showcase Trust Badges */}
          <div className="relative z-10 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <div className="flex items-center justify-around text-center">
              <div className="flex items-center gap-1.5">
                <Zap className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                <span className={cn("text-[11px] font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>KVM Virtualized</span>
              </div>
              <span className={cn("w-1 h-1 rounded-full", isDark ? "bg-white/20" : "bg-slate-300")} />
              <div className="flex items-center gap-1.5">
                <Server className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                <span className={cn("text-[11px] font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>HA Kubernetes</span>
              </div>
              <span className={cn("w-1 h-1 rounded-full", isDark ? "bg-white/20" : "bg-slate-300")} />
              <div className="flex items-center gap-1.5">
                <Cpu className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                <span className={cn("text-[11px] font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>Public API Hub</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
