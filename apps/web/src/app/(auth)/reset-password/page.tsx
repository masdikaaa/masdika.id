"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Suspense } from "react";

import { ServerBackground } from "@/components/ui/ServerBackground";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link. Please request a new one.");
      router.push("/forgot-password");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = e.target as HTMLFormElement;
      const password = (form.elements.namedItem("password") as HTMLInputElement).value;
      const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

      if (password.length < 8) {
        toast.error("Password must be at least 8 characters long");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Password reset successful! Please log in with your new password.");
        router.push("/login");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className={cn("min-h-screen w-full flex overflow-hidden items-center justify-center p-4 relative", isDark ? "text-white" : "text-slate-900")}>
      <ServerBackground />
      <div className="w-full max-w-md relative z-10">
        
        {/* Logo */}
        <Link href="/" className="flex items-center group w-fit mb-6">
          <img
            src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
            alt="Masdika Logo"
            className="h-8 w-auto"
          />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={cn("w-full backdrop-blur-sm border rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden", isDark ? "bg-[#020d18]/50 border-white/5" : "bg-white/70 border-slate-200")}
        >
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <h1 className={cn("text-3xl font-bold drop-shadow-sm mb-3 text-center", isDark ? "text-white" : "text-[#0F3B4A]")}>
            Reset Password
          </h1>
          <p className={cn("mb-10 text-sm text-center", isDark ? "text-zinc-400" : "text-slate-500")}>
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <label className={cn("text-[11px] font-bold uppercase tracking-widest pl-1", isDark ? "text-cyan-500/80" : "text-cyan-700")}>
                New Password
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className={cn("relative flex items-center border rounded-xl overflow-hidden transition-all duration-300 focus-within:ring-1", isDark ? "bg-[#0a1624] border-white/5 focus-within:border-cyan-500/30 focus-within:bg-[#0c1b2b] focus-within:ring-cyan-500/30 shadow-inner" : "bg-white border-slate-200 focus-within:border-cyan-500 focus-within:ring-cyan-500 shadow-sm")}>
                  <div className="pl-4 pr-3 flex items-center justify-center">
                    <Lock className={cn("w-5 h-5 transition-colors", isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600")} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Min. 8 characters"
                    className={cn("w-full py-3.5 pr-12 bg-transparent focus:outline-none font-medium", isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400")}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn("absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center transition-colors", isDark ? "text-zinc-500 hover:text-cyan-400 bg-gradient-to-l from-[#0a1624] via-[#0a1624] to-transparent group-focus-within:from-[#0c1b2b] group-focus-within:via-[#0c1b2b]" : "text-slate-400 hover:text-cyan-600 bg-gradient-to-l from-white via-white to-transparent")}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className={cn("text-[11px] font-bold uppercase tracking-widest pl-1", isDark ? "text-cyan-500/80" : "text-cyan-700")}>
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className={cn("relative flex items-center border rounded-xl overflow-hidden transition-all duration-300 focus-within:ring-1", isDark ? "bg-[#0a1624] border-white/5 focus-within:border-cyan-500/30 focus-within:bg-[#0c1b2b] focus-within:ring-cyan-500/30 shadow-inner" : "bg-white border-slate-200 focus-within:border-cyan-500 focus-within:ring-cyan-500 shadow-sm")}>
                  <div className="pl-4 pr-3 flex items-center justify-center">
                    <Lock className={cn("w-5 h-5 transition-colors", isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600")} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Repeat your password"
                    className={cn("w-full py-3.5 pr-12 bg-transparent focus:outline-none font-medium", isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400")}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={cn("absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center transition-colors", isDark ? "text-zinc-500 hover:text-cyan-400 bg-gradient-to-l from-[#0a1624] via-[#0a1624] to-transparent group-focus-within:from-[#0c1b2b] group-focus-within:via-[#0c1b2b]" : "text-slate-400 hover:text-cyan-600 bg-gradient-to-l from-white via-white to-transparent")}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-6 py-4 font-bold tracking-wide transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-8 shadow-sm hover:shadow-[0_0_20px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className={cn("inline-flex items-center gap-2 text-sm transition-colors group", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to log in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex bg-background text-white items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
