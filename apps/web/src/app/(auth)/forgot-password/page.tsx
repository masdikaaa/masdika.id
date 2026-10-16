"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = e.target as HTMLFormElement;
      const email = form.email.value;

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        toast.success("Password reset link sent! Check your email.");
        router.push("/login");
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

  return (
    <div className={cn("min-h-screen w-full flex overflow-hidden items-center justify-center p-4 relative", isDark ? "text-white" : "text-slate-900")}>
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

      <div className="w-full max-w-md relative z-10 flex flex-col justify-center">

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
          className={cn("w-full backdrop-blur-sm border rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden", isDark ? "bg-[#020d18]/50 border-white/5" : "bg-white/70 border-slate-200")}
        >
          {/* Decorative glow inside card */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4" />

          <h1 className={cn("text-3xl font-bold drop-shadow-sm mb-3 text-center", isDark ? "text-white" : "text-[#0F3B4A]")}>
            Forgot Password?
          </h1>
          <p className={cn("mb-10 text-sm text-center", isDark ? "text-zinc-400" : "text-slate-500")}>
            No worries, we'll send you reset instructions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <label className={cn("text-[11px] font-bold uppercase tracking-widest pl-1", isDark ? "text-cyan-500/80" : "text-cyan-700")}>Email Address</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className={cn("relative flex items-center border rounded-xl overflow-hidden transition-all duration-300 focus-within:ring-1", isDark ? "bg-[#0a1624] border-white/5 focus-within:border-cyan-500/30 focus-within:bg-[#0c1b2b] focus-within:ring-cyan-500/30 shadow-inner" : "bg-white border-slate-200 focus-within:border-cyan-500 focus-within:ring-cyan-500 shadow-sm")}>
                  <div className="pl-4 pr-3 flex items-center justify-center">
                    <Mail className={cn("w-5 h-5 transition-colors", isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600")} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email address"
                    className={cn("w-full py-3.5 pr-4 bg-transparent focus:outline-none font-medium", isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400")}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-6 py-4 font-bold tracking-wide transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-8 shadow-sm hover:shadow-[0_0_20px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2"
            >
                {loading ? "Sending..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/login" className={cn("inline-flex items-center gap-2 text-sm transition-colors group", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to log in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
