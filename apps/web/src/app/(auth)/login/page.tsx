"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Sun, Moon, Zap, Server } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const formLoadTimeRef = useRef(0);

  useEffect(() => {
    formLoadTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    const pending = sessionStorage.getItem("pending2FA");
    if (pending) {
      try {
        const data = JSON.parse(pending);
        setEmail(data.email);
        setPassword(data.password);
        setRememberMe(data.rememberMe);
        setShow2FA(true);
      } catch (e) {}
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
          twoFactorCode: show2FA ? twoFactorCode : undefined,
          turnstileToken,
          _hp: "",
          _ts: formLoadTimeRef.current,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requires2FA) {
          sessionStorage.setItem("pending2FA", JSON.stringify({ email, password, rememberMe }));
          setShow2FA(true);
          setLoading(false);
          toast.info("Please enter your 2FA code");
          return;
        }
        sessionStorage.removeItem("pending2FA");
        toast.success("Login successful! Redirecting...");
        if (data.user?.role === "ADMIN") router.push("/admin");
        else router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.error || "Invalid email or password!");
        setLoading(false);
      }
    } catch (err) {
      toast.error("Something went wrong!");
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
      {/* Lightweight, elegant ambient background inspired by Reference Image 1 (zero CPU overhead) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className={cn(
            "absolute inset-0 transition-colors duration-500",
            isDark
              ? "bg-[#030712] bg-gradient-to-br from-[#020b17] via-[#051326] to-[#01060e]"
              : "bg-[#f0faf9] bg-gradient-to-br from-[#d4f8f4]/60 via-[#e2f3fc]/70 to-[#dff3f9]/50"
          )}
        />
        <div
          className={cn(
            "absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-[140px] pointer-events-none",
            isDark ? "bg-cyan-500/10" : "bg-cyan-300/35"
          )}
        />
        <div
          className={cn(
            "absolute -bottom-32 -right-32 w-[580px] h-[580px] rounded-full blur-[150px] pointer-events-none",
            isDark ? "bg-blue-600/10" : "bg-blue-300/30"
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none",
            isDark ? "bg-cyan-600/5" : "bg-teal-200/25"
          )}
        />
        <div
          className={cn(
            "absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none",
            isDark
              ? "bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:48px_48px]"
              : "bg-[linear-gradient(rgba(6,182,212,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.06)_1px,transparent_1px)] bg-[size:48px_48px]"
          )}
        />
      </div>

      {/* Main Unified Dual-Panel Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "relative z-10 w-full max-w-5xl rounded-[2.5rem] border backdrop-blur-xl shadow-2xl overflow-hidden grid lg:grid-cols-12 transition-all duration-300",
          isDark
            ? "bg-[#020d18]/85 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)]"
            : "bg-white/95 border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
        )}
      >
        {/* LEFT COLUMN: Form */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-12 xl:p-14 flex flex-col justify-between relative z-10">
          <div>
            {/* Top Brand Header & Theme Toggle */}
            <div className="flex items-center justify-between mb-8">
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
                {show2FA ? "Two-Factor Auth" : "Log in."}
              </h1>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                {show2FA
                  ? "Enter the 6-digit authentication code from your authenticator app."
                  : "Log in with your data that you entered during your registration."}
              </p>
            </div>

            {/* Mobile Character Avatar (Only on small screens where right panel is hidden) */}
            <div className="lg:hidden flex items-center gap-3 p-3 mb-6 rounded-2xl border bg-cyan-500/5 border-cyan-500/20">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-cyan-500/10 flex-shrink-0 flex items-center justify-center">
                <Image
                  src="/images/auth/login.png"
                  alt="Masdika Assistant"
                  width={48}
                  height={48}
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div>
                <p className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-800")}>Welcome back!</p>
                <p className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-slate-500")}>Masdika Cloud Platform is ready.</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className={show2FA ? "hidden" : "space-y-4"}>
                {/* Email */}
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
                        required={!show2FA}
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Enter your password</label>
                    <Link
                      href="/forgot-password"
                      className={cn(
                        "text-xs font-semibold transition-colors",
                        isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-700 hover:text-cyan-600"
                      )}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-3 flex items-center justify-center">
                        <Lock className={cn("w-4 h-4", iconClass)} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="atleast 8 characters"
                        className={cn(inputClass, "pr-12")}
                        required={!show2FA}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn(
                          "absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center transition-colors",
                          isDark
                            ? "text-zinc-500 hover:text-cyan-400 bg-gradient-to-l from-[#0a1624] via-[#0a1624] to-transparent group-focus-within:from-[#0c1b2b] group-focus-within:via-[#0c1b2b]"
                            : "text-slate-400 hover:text-cyan-600 bg-gradient-to-l from-white via-white to-transparent"
                        )}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group relative">
                    <div
                      className={cn(
                        "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                        isDark
                          ? "border-zinc-700 bg-black/20 group-hover:border-cyan-500"
                          : "border-slate-300 bg-slate-50 group-hover:border-cyan-500"
                      )}
                    >
                      <input
                        type="checkbox"
                        name="remember_me"
                        className="peer opacity-0 absolute inset-0 cursor-pointer"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <div className="w-2 h-2 rounded-sm bg-cyan-500 hidden peer-checked:block" />
                    </div>
                    <span className={cn("text-xs font-medium select-none", isDark ? "text-zinc-400" : "text-slate-600")}>
                      Remember me
                    </span>
                  </label>
                </div>
              </div>

              {/* 2FA Input Field */}
              {show2FA && (
                <div className="space-y-3 py-2">
                  <label className={labelClass}>Verification Code</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-3 flex items-center justify-center">
                        <Lock className={cn("w-4 h-4", iconClass)} />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className={cn(inputClass, "font-black tracking-[0.5em] text-center text-lg")}
                        autoFocus
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Turnstile */}
              <div className="pt-1 w-full flex justify-center">
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
                disabled={loading || (Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !turnstileToken && !show2FA)}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl py-3.5 px-6 font-bold tracking-wide transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm hover:shadow-[0_0_20px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : show2FA ? (
                  "Verify & Login"
                ) : (
                  "Log in"
                )}
              </button>

              {/* Divider & Google Sign-in */}
              {!show2FA && (
                <>
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
                    <span className="text-sm font-bold">Sign in with Google</span>
                  </a>
                </>
              )}

              {/* 2FA Back Button */}
              {show2FA && (
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false);
                    setTwoFactorCode("");
                    sessionStorage.removeItem("pending2FA");
                  }}
                  className={cn(
                    "w-full flex items-center justify-center py-2 text-sm transition-colors mt-2",
                    isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </button>
              )}
            </form>

            {/* Bottom Footer Link */}
            {!show2FA && (
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
            )}
          </div>

          {/* Legal info */}
          <p className={cn("mt-6 text-[11px] text-center", isDark ? "text-zinc-600" : "text-slate-400")}>
            Copyright &copy; {new Date().getFullYear()} PT Masdika Teknologi Indonesia. All rights reserved.
          </p>
        </div>

        {/* RIGHT COLUMN: Hero Character Showcase (Reference Image 1) */}
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
              Nice to see you again
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={cn("text-3xl xl:text-4xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}
            >
              Welcome back
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={cn("text-xs sm:text-sm mt-1.5 max-w-sm mx-auto font-medium", isDark ? "text-zinc-400" : "text-slate-600")}
            >
              Your high-speed Cloud VPS, Kubernetes clusters, and APIs are ready.
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
                "absolute -top-1 right-2 xl:right-6 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border backdrop-blur-md shadow-lg",
                isDark
                  ? "bg-[#0b1b2d]/90 border-cyan-500/30 text-white shadow-cyan-950/40"
                  : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/70"
              )}
            >
              <div className="relative flex items-center justify-center w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </div>
              <div className="text-left">
                <p className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-400")}>
                  System Status
                </p>
                <p className="text-xs font-black">98.99% Cloud Uptime</p>
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
                "absolute -bottom-2 left-2 xl:left-6 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border backdrop-blur-md shadow-lg",
                isDark
                  ? "bg-[#0b1b2d]/90 border-blue-500/30 text-white shadow-blue-950/40"
                  : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/70"
              )}
            >
              <div className={cn("p-1.5 rounded-xl", isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700")}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-400")}>
                  Protection
                </p>
                <p className="text-xs font-black">2FA & K3s Isolated</p>
              </div>
            </motion.div>

            {/* 3D Character (login.png) */}
            <motion.div
              animate={{ y: [-7, 7, -7] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              <Image
                src="/images/auth/login.png"
                alt="Masdika Assistant"
                width={380}
                height={470}
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
