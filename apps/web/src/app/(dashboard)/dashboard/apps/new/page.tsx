"use client";

import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import AppCheckoutFlow from "@/components/AppCheckoutFlow";

export default function NewManagedAppPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            href="/dashboard/apps"
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0",
              isDark
                ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08]"
                : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
            )}
            title="Back to Managed Apps"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={cn("text-lg sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Deploy Managed Application
              </h1>
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border shrink-0", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                Dedicated Compute & Auto SSL
              </span>
            </div>
            <p className={cn("text-xs sm:text-sm font-medium mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
              Deploy AI agents, routing gateways, and workflow engines on Masdika Cloud Kubernetes cluster.
            </p>
          </div>
        </div>

        {/* Datacenter Region Status Badge */}
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 self-start sm:self-center transition-all",
          isDark
            ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300"
            : "bg-white border-slate-200/90 text-slate-700 shadow-2xs"
        )}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Region: <strong className={isDark ? "text-white" : "text-slate-900"}>Sidoarjo (ID-SDA)</strong></span>
        </div>
      </div>

      {/* Unified Architecture & Checkout Flow */}
      <AppCheckoutFlow />
    </div>
  );
}
