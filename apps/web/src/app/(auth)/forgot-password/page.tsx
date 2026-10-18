"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, ShieldCheck, Sun, Moon, Zap, Server, CheckCircle2, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const formLoadTimeRef = useRef(0);

  useEffect(() => {
    formLoadTimeRef.current = Date.now();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email,
          turnstileToken,
          _hp: "",
          _ts: formLoadTimeRef.current,
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
        toast.success("Password reset link sent! Check your email.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send reset link");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputWrapper = cn(
    "relative flex items-center rounded-xl overflow-hidden transition-all duration-300 shadow-inner",
    isDark
      ? "bg-[#0a1624] border border-white/5 focus-within:border-cyan-500/30 focus-within:bg-[#0c1b2b] focus-within:ring-1 focus-within:ring-cyan-500/30"
      : "bg-white border border-slate-200 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-400/40 shadow-sm"
  );
  const inputClass = cn(
    "w-full py-3.5 pr-4 bg-transparent focus:outline-none font-medium text-sm",
    isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400"
  );
  const iconClass = cn(
    "transition-colors",
    isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600"
  );
  const labelClass = cn(
    "text-[11px] font-bold uppercase tracking-widest pl-1",
    isDark ? "text-cyan-500/80" : "text-cyan-700"
  );

  return (
    <div
      className={cn(
        "min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-x-hidden font-sans selection:bg-cyan-500/30",
        isDark ? "text-white" : "text-slate-900"
      )}
    >
      {/* Clean ambient background with subtle grid lines */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 transition-colors duration-500"
        style={{ backgroundColor: isDark ? "#050B14" : "#f8fafb" }}
      >
        <div 
          className="absolute inset-0 transition-opacity duration-500" 
          style={{
            opacity: isDark ? 0.07 : 0.05,
            backgroundImage: `
              linear-gradient(to right, ${isDark ? "#ffffff" : "#000000"} 1px, transparent 1px),
              linear-gradient(to bottom, ${isDark ? "#ffffff" : "#000000"} 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Main Unified Dual-Panel Card (Reference Image 1) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "relative z-10 w-full max-w-5xl rounded-2xl sm:rounded-[2.5rem] border backdrop-blur-xl shadow-2xl overflow-hidden grid lg:grid-cols-12 transition-all duration-300",
          isDark
            ? "bg-[#020d18]/85 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)]"
            : "bg-white/95 border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
        )}
      >
        {/* LEFT COLUMN: Form */}
        <div className="lg:col-span-6 w-full min-w-0 max-w-full p-6 pt-8 sm:p-12 lg:p-12 xl:p-14 flex flex-col justify-between relative z-10 overflow-hidden">
          <div className="w-full min-w-0">
            {/* Top Brand Header & Theme Toggle */}
            <div className="flex items-center justify-between mb-6 sm:mb-8 pt-1">
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
            <div className="mb-6">
              <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {isSubmitted ? "Check your email." : "Forgot password."}
              </h1>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                {isSubmitted
                  ? `We've sent recovery instructions to ${email || "your email"}.`
                  : "Enter your email address and we'll send you recovery instructions."}
              </p>
            </div>

            {/* Mobile Character Avatar (Only on small screens where right panel is hidden) */}
            <div className="lg:hidden flex items-center gap-3 p-2.5 sm:p-3 mb-6 rounded-2xl border bg-cyan-500/5 border-cyan-500/20 w-full min-w-0 overflow-hidden">
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-cyan-500/10 flex-shrink-0 flex items-center justify-center p-0.5">
                <Image
                  src="/forgot-password.webp"
                  alt="Masdika Assistant"
                  width={48}
                  height={48}
                  unoptimized
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-slate-800")}>Need help recovering?</p>
                <p className={cn("text-[11px] leading-tight truncate sm:whitespace-normal", isDark ? "text-zinc-400" : "text-slate-500")}>Masdika Cloud security is ready.</p>
              </div>
            </div>

            {/* Form or Success State */}
            {isSubmitted ? (
              <div className="space-y-5 py-4">
                <div className={cn(
                  "p-5 rounded-2xl border flex items-start gap-3.5",
                  isDark ? "bg-cyan-950/20 border-cyan-500/30 text-cyan-300" : "bg-cyan-50/80 border-cyan-200 text-cyan-900"
                )}>
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold mb-1">Reset link dispatched</p>
                    <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                      If an account exists for this email, you will receive password reset instructions within a few minutes. Check your spam folder if it doesn't arrive.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail("");
                    }}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl font-semibold text-xs transition-colors border",
                      isDark
                        ? "border-white/10 hover:bg-white/5 text-zinc-300"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    Send to another email
                  </button>

                  <Link
                    href="/login"
                    className="w-full bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 rounded-lg py-3 px-6 font-semibold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className={labelClass}>Enter your email address</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-3 flex items-center justify-center">
                        <Mail className={cn("w-4 h-4", iconClass)} />
                      </div>
                      <input
                        type="email"
                        name="email"
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

                {/* Turnstile */}
                <div className="pt-1 w-full min-w-0 flex justify-center px-px">
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
                  disabled={loading || (Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !turnstileToken)}
                  className="w-full bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 rounded-lg py-3 px-6 font-semibold tracking-wide transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending instructions...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Reset Password</span>
                    </>
                  )}
                </button>

                {/* Back to login link */}
                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className={cn(
                      "inline-flex items-center gap-2 text-xs font-semibold transition-colors group",
                      isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700"
                    )}
                  >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    Back to log in
                  </Link>
                </div>
              </form>
            )}

            {/* Bottom Footer Link */}
            <div className="text-center mt-5">
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className={cn(
                    "font-bold transition-colors underline decoration-cyan-500/40 underline-offset-4 hover:decoration-cyan-500",
                    isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-700 hover:text-cyan-800"
                  )}
                >
                  Register
                </Link>
              </p>
            </div>
          </div>

          {/* Legal info */}
          <p className={cn("mt-6 text-[11px] text-center", isDark ? "text-zinc-600" : "text-slate-400")}>
            Copyright &copy; {new Date().getFullYear()} PT Masdika Teknologi Indonesia. All rights reserved.
          </p>
        </div>

        {/* RIGHT COLUMN: Hero Character Showcase (Reference Image 1 with forgot-password.png) */}
        <div
          className={cn(
            "hidden lg:flex lg:col-span-6 flex-col justify-between p-8 xl:p-12 relative overflow-hidden select-none",
            isDark
              ? "bg-gradient-to-br from-[#061220]/95 via-[#09182a]/85 to-[#020b14]/95 border-l border-white/10"
              : "bg-gradient-to-br from-cyan-50/70 via-sky-50/40 to-slate-50/80 border-l border-slate-200/80"
          )}
        >
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Floating Decorative Circles (As seen in Reference Image 1) */}
          <motion.div
            animate={{ y: [0, -12, 0], x: [0, 4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "absolute top-12 left-10 w-9 h-9 rounded-full pointer-events-none",
              isDark ? "bg-cyan-500/10 border border-cyan-400/20" : "bg-cyan-200/50"
            )}
          />
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -6, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className={cn(
              "absolute top-1/3 right-10 w-14 h-14 rounded-full pointer-events-none",
              isDark ? "bg-blue-500/10 border border-blue-400/20" : "bg-blue-200/40"
            )}
          />
          <motion.div
            animate={{ y: [0, -8, 0], x: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className={cn(
              "absolute bottom-24 left-12 w-6 h-6 rounded-full pointer-events-none",
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
              Account Security First
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={cn("text-3xl xl:text-4xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}
            >
              Recover your access
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={cn("text-xs sm:text-sm mt-1.5 max-w-sm mx-auto font-medium", isDark ? "text-zinc-400" : "text-slate-600")}
            >
              Your high-speed Cloud VPS, Kubernetes clusters, and APIs are waiting.
            </motion.p>
          </div>

          {/* Character Illustration Area with Floating Badges */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center py-6 px-1 w-full">
            {/* Floating Badge 1: Top Right (Positioned cleanly beside shoulder/ear, clear of hair and subtitle) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
              transition={{
                opacity: { duration: 0.5, delay: 0.3 },
                scale: { duration: 0.5, delay: 0.3 },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
              }}
              className={cn(
                "absolute top-8 sm:top-10 -right-3 sm:-right-1 xl:right-1 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-md select-none",
                isDark
                  ? "bg-[#0b1b2d]/95 border-cyan-500/30 text-white shadow-cyan-950/40"
                  : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/70"
              )}
            >
              <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </div>
              <div className="text-left">
                <p className={cn("text-[8px] font-bold uppercase tracking-wider leading-none", isDark ? "text-zinc-400" : "text-slate-400")}>
                  System Status
                </p>
                <p className="text-[11px] font-black leading-tight mt-0.5">98.99% Cloud Uptime</p>
              </div>
            </motion.div>

            {/* Floating Badge 2: Bottom Left (Positioned well outward to clear the character's hoodie) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, 6, 0] }}
              transition={{
                opacity: { duration: 0.5, delay: 0.4 },
                scale: { duration: 0.5, delay: 0.4 },
                y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 },
              }}
              className={cn(
                "absolute bottom-8 sm:bottom-10 -left-3 sm:-left-1 xl:left-1 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-md select-none",
                isDark
                  ? "bg-[#0b1b2d]/95 border-blue-500/30 text-white shadow-blue-950/40"
                  : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/70"
              )}
            >
              <div className={cn("p-1 rounded-lg shrink-0", isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700")}>
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className={cn("text-[8px] font-bold uppercase tracking-wider leading-none", isDark ? "text-zinc-400" : "text-slate-400")}>
                  Protection
                </p>
                <p className="text-[11px] font-black leading-tight mt-0.5">2FA & K3s Isolated</p>
              </div>
            </motion.div>

            {/* 3D Character (forgot-password.png) */}
            <motion.div
              animate={{ y: [-7, 7, -7] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              <Image
                src="/forgot-password.webp"
                alt="Masdika Assistant"
                width={380}
                height={470}
                priority
                unoptimized
                className="max-h-[250px] sm:max-h-[270px] xl:max-h-[300px] w-auto object-contain drop-shadow-2xl select-none pointer-events-none"
              />

              {/* Dynamic Pedestal Grounding Shadow */}
              <motion.div
                animate={{ scale: [1, 0.86, 1], opacity: [0.55, 0.28, 0.55] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "w-40 xl:w-48 h-3.5 rounded-[100%] blur-md -mt-2 transition-colors pointer-events-none",
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
                <span className={cn("text-[11px] font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>Instant Access</span>
              </div>
              <span className={cn("w-1 h-1 rounded-full", isDark ? "bg-white/20" : "bg-slate-300")} />
              <div className="flex items-center gap-1.5">
                <Server className={cn("w-3.5 h-3.5", isDark ? "text-blue-400" : "text-blue-700")} />
                <span className={cn("text-[11px] font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>Cloud VPS & K3s</span>
              </div>
              <span className={cn("w-1 h-1 rounded-full", isDark ? "bg-white/20" : "bg-slate-300")} />
              <div className="flex items-center gap-1.5">
                <ShieldCheck className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                <span className={cn("text-[11px] font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>Enterprise Safe</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
