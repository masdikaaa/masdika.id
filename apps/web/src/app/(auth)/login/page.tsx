"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";
import { Turnstile } from '@marsidev/react-turnstile';
import { ServerBackground } from "@/components/ui/ServerBackground";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>("");
  const formLoadTimeRef = useRef(0);
  
  useEffect(() => { 
    formLoadTimeRef.current = Date.now(); 
    fetch('/api/config/turnstile').then(r => r.json()).then(data => setTurnstileSiteKey(data.siteKey || ""));
  }, []);

  useEffect(() => {
    const pending = sessionStorage.getItem('pending2FA');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        setEmail(data.email);
        setPassword(data.password);
        setRememberMe(data.rememberMe);
        setShow2FA(true);
      } catch (e) { }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, rememberMe,
          twoFactorCode: show2FA ? twoFactorCode : undefined,
          turnstileToken,
          _hp: "",
          _ts: formLoadTimeRef.current,
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requires2FA) {
          sessionStorage.setItem('pending2FA', JSON.stringify({ email, password, rememberMe }));
          setShow2FA(true);
          setLoading(false);
          toast.info("Please enter your 2FA code");
          return;
        }
        sessionStorage.removeItem('pending2FA');
        toast.success("Login successful! Redirecting...");
        if (data.user?.role === 'ADMIN') router.push("/admin");
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

  // Shared input field wrapper styles
  const inputWrapper = cn(
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
    "transition-colors",
    isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600"
  );
  const labelClass = "text-[11px] font-bold uppercase tracking-widest pl-1 " + (isDark ? "text-cyan-500/80" : "text-cyan-700");

  return (
    <div className={cn("min-h-screen w-full flex relative overflow-hidden font-sans selection:bg-cyan-500/30", isDark ? "text-white" : "text-slate-900")}>
      <ServerBackground />

      {/* LEFT PANEL: Form */}
      <div className={cn(
        "w-full lg:w-[45%] flex flex-col relative z-10 overflow-y-auto h-screen hide-scrollbar lg:border-r",
        isDark ? "bg-[#020d18]/50 backdrop-blur-sm border-white/5" : "bg-white/70 backdrop-blur-md border-slate-200"
      )}>

        {/* Sticky Header */}
        <div className={cn(
          "sticky top-0 z-50 px-8 sm:px-16 lg:px-24 xl:px-32 pt-8 pb-6 backdrop-blur-md border-b w-full",
          isDark ? "bg-[#020d18]/90 border-white/5" : "bg-white/90 border-slate-200"
        )}>
          <Link href="/" className="flex items-center group w-fit">
              <img
                src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                alt="Masdika Logo"
                className="h-8 w-auto"
              />
            </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-sm mx-auto"
          >
            <h1 className={cn("text-3xl font-bold drop-shadow-sm mb-2", isDark ? "text-white" : "text-[#0F3B4A]")}>
              Welcome Back
            </h1>
            <p className={cn("mb-10 text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
              Sign in to streamline your portfolio and management.
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className={show2FA ? "hidden" : "space-y-6"}>
                {/* Email */}
                <div className="space-y-2.5">
                  <label className={labelClass}>Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-3 flex items-center justify-center">
                        <Mail className={cn("w-5 h-5", iconClass)} />
                      </div>
                      <input
                        type="email" name="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        autoComplete="email"
                        className={inputClass}
                        required={!show2FA}
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2.5">
                  <label className={labelClass}>Password</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-3 flex items-center justify-center">
                        <Lock className={cn("w-5 h-5", iconClass)} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"} name="password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={cn(inputClass, "pr-12")}
                        required={!show2FA}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn(
                          "absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center transition-colors",
                          isDark ? "text-zinc-500 hover:text-cyan-400 bg-gradient-to-l from-[#0a1624] via-[#0a1624] to-transparent group-focus-within:from-[#0c1b2b] group-focus-within:via-[#0c1b2b]" : "text-slate-400 hover:text-cyan-600 bg-gradient-to-l from-white via-white to-transparent"
                        )}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group relative">
                    <div className={cn("w-4 h-4 rounded flex items-center justify-center border transition-colors", isDark ? "border-zinc-700 group-hover:border-cyan-500" : "border-slate-300 group-hover:border-cyan-500")}>
                      <input type="checkbox" name="remember_me" className="peer opacity-0 absolute inset-0 cursor-pointer" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                      <div className="w-2 h-2 rounded-sm bg-cyan-500 hidden peer-checked:block" />
                    </div>
                    <span className={cn("text-xs select-none", isDark ? "text-zinc-400" : "text-slate-500")}>Remember me</span>
                  </label>
                  <Link href="/forgot-password" className={cn("text-xs transition-colors", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-500")}>Forgot password?</Link>
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex items-center py-4">
                <div className={cn("flex-grow border-t", isDark ? "border-white/10" : "border-slate-200")} />
                <span className={cn("flex-shrink-0 mx-4 text-xs font-bold uppercase", isDark ? "text-zinc-500" : "text-slate-400")}>Or continue with</span>
                <div className={cn("flex-grow border-t", isDark ? "border-white/10" : "border-slate-200")} />
              </div>

              {/* Google */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/api/auth/google/login"
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-3.5 mb-4 rounded-xl border transition-colors",
                  isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                )}
              >
                <FcGoogle className="w-5 h-5" />
                <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-700")}>Sign in with Google</span>
              </a>

              {/* Turnstile */}
              <div className="pt-2 w-full flex justify-center">
                {turnstileSiteKey ? (
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => setTurnstileToken(token)}
                    options={{ theme: isDark ? 'dark' : 'light', size: 'flexible' }}
                    className="w-full"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <div className="w-full h-[65px] bg-white/5 animate-pulse rounded-lg" />
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (!turnstileToken && !show2FA)}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-6 py-4 font-bold tracking-wide transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6 shadow-sm hover:shadow-[0_0_20px_rgba(8,145,178,0.3)]"
              >
                  {loading ? "Processing..." : (show2FA ? "Verify & Login" : "Sign In")}
              </button>

              {!show2FA && (
                <div className="text-center mt-6">
                  <Link href="/register" className={cn("text-sm transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}>
                    Don't have an account? Sign Up
                  </Link>
                </div>
              )}

              {show2FA && (
                <button
                  type="button"
                  onClick={() => { setShow2FA(false); setTwoFactorCode(''); sessionStorage.removeItem('pending2FA'); }}
                  className={cn("w-full flex items-center justify-center py-2 text-sm transition-colors mt-2", isDark ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </button>
              )}
            </form>

            <p className={cn("mt-8 text-xs text-center", isDark ? "text-zinc-600" : "text-slate-400")}>
              Copyright &copy; {new Date().getFullYear()} PT Masdika Teknologi Indonesia. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>

      {/* RIGHT PANEL: Info */}
      <div className="hidden lg:block lg:w-[55%] relative z-10">
        <div className="h-full flex items-center justify-center p-8 sticky top-0">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className={cn("inline-flex items-center gap-3 rounded-full border px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.3em]", isDark ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.15)]" : "border-cyan-200 bg-cyan-50 text-cyan-700")}
                >
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={cn("w-2.5 h-2.5 rounded-full", isDark ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" : "bg-cyan-500")}
                  />
                  Cloud Platform & API Hub
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
                  <h2 className={cn("text-4xl lg:text-5xl font-black leading-[1.1] mb-6 drop-shadow-sm", isDark ? "text-white" : "text-[#0F3B4A]")}>
                    Welcome back, manage your servers & APIs with confidence.
                  </h2>
                  <p className={cn("text-base leading-relaxed max-w-xl font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Deploy Cloud VPS, manage Kubernetes clusters, access the admin dashboard, and explore our public API Hub. Login once and control your entire digital infrastructure.
                  </p>
                </motion.div>

                <div className="grid grid-cols-2 gap-5 pt-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}
                    className={cn("relative rounded-3xl border backdrop-blur-sm p-6 overflow-hidden group/card transition-all duration-500", isDark ? "border-white/5 bg-white/[0.02] hover:border-cyan-500/30 hover:bg-white/[0.04]" : "border-slate-200 bg-white hover:border-cyan-300 hover:shadow-md")}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.3em] mb-4", isDark ? "text-cyan-400" : "text-cyan-600")}>Fast setup</p>
                    <p className={cn("text-2xl font-black transition-colors relative z-10", isDark ? "text-white group-hover/card:text-cyan-100" : "text-slate-900 group-hover/card:text-cyan-700")}>Instant access</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }}
                    className={cn("relative rounded-3xl border backdrop-blur-sm p-6 overflow-hidden group/card transition-all duration-500", isDark ? "border-white/5 bg-white/[0.02] hover:border-blue-500/30 hover:bg-white/[0.04]" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md")}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.3em] mb-4", isDark ? "text-blue-400" : "text-blue-600")}>Secure</p>
                    <p className={cn("text-2xl font-black transition-colors relative z-10", isDark ? "text-white group-hover/card:text-blue-100" : "text-slate-900 group-hover/card:text-blue-700")}>Two-factor ready</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
