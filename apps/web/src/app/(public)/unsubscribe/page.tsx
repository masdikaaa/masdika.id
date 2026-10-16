"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Unsubscribed Successfully</h2>
        <p className="text-zinc-400">You will no longer receive newsletter emails from us.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleUnsubscribe} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
        <input 
          type="email" 
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="w-full px-5 py-4 bg-[#080d1a] border border-slate-700/80 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
        />
      </div>
      <button 
        type="submit"
        disabled={status === "loading"}
        className="w-full py-4 bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-white border border-red-500/30 font-bold rounded-xl transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-black/20"
      >
        {status === "loading" ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          "Unsubscribe from Newsletter"
        )}
      </button>
      {status === "error" && (
        <p className="text-red-400 text-sm text-center mt-3">Failed to unsubscribe. Please try again or contact support.</p>
      )}
    </form>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="pt-24 md:pt-32 pb-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 min-h-[75vh]">
      <AnimatedSection className="text-center max-w-4xl mx-auto mb-16 pt-10">
        <span className="text-cyan-400 font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          Newsletter
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
          Unsubscribe <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent drop-shadow-sm">Newsletter</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium mb-12">
          We're sorry to see you go. Enter your email below to unsubscribe from our newsletter updates.
        </p>
        
        <div className="max-w-md mx-auto text-left bg-[#0d1629] border border-slate-700/80 ring-1 ring-white/5 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40">
          <Suspense fallback={<div className="text-center text-zinc-500 py-10">Loading...</div>}>
            <UnsubscribeForm />
          </Suspense>
        </div>
      </AnimatedSection>
    </div>
  );
}




