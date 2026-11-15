"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, MapPin, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import VpsCheckoutFlow from "@/components/VpsCheckoutFlow";
import { EnterpriseInfraBanner } from "@/components/EnterpriseInfraBadges";

function NewVpsContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceParam = (searchParams.get("service") || "VPS").toUpperCase();
  const initialServiceType = serviceParam === "APP_CATALOG" ? "APP_CATALOG" : "VPS";

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Back Navigation */}
      <div>
        <Link
          href="/dashboard/vps"
          className={cn(
            "inline-flex items-center gap-2 text-xs sm:text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit",
            isDark
              ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Cloud VPS
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={cn("text-lg sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Deploy Cloud VPS
            </h1>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border shrink-0",
                isDark
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : "bg-cyan-50 text-cyan-700 border-cyan-200"
              )}
            >
              Pay-As-You-Go
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
            Configure dedicated-core Cloud VPS or 1-Click App Catalog deployments on Masdika Cloud.
          </p>
        </div>

        {/* Datacenter Region Status Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 self-start sm:self-center transition-all",
            isDark
              ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300"
              : "bg-white border-slate-200/90 text-slate-700 shadow-2xs"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Region: <strong className={isDark ? "text-white" : "text-slate-900"}>Sidoarjo (ID-SDA)</strong>
          </span>
        </div>
      </div>

      <EnterpriseInfraBanner />

      <VpsCheckoutFlow
        serviceType={initialServiceType}
        onServiceChange={(newService) => {
          const next = newService === "APP_CATALOG" ? "app_catalog" : "vps";
          router.replace(`/dashboard/vps/new?service=${next}`, { scroll: false });
        }}
      />
    </div>
  );
}

export default function NewVpsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs font-medium text-zinc-400">Loading Cloud VPS configurator...</p>
        </div>
      }
    >
      <NewVpsContent />
    </Suspense>
  );
}
