"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import {
  Rocket, Search, Server, ArrowRight, ShieldCheck,
  CheckCircle, Sparkles, Filter, ExternalLink, HardDrive, Cpu, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VPS_APPS, APP_CATEGORIES, AppCategory, VpsAppDefinition } from "@/lib/vps-apps";

export default function CatalogAppsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>("All Apps");

  const filteredApps = useMemo(() => {
    return VPS_APPS.filter((app) => {
      const matchesCategory =
        selectedCategory === "All Apps" ||
        app.category === selectedCategory ||
        app.secondaryCategories?.includes(selectedCategory);

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        app.defaultPort.toString().includes(q) ||
        app.secondaryCategories?.some((cat) => cat.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  const handleDeployApp = (app: VpsAppDefinition) => {
    router.push(`/dashboard/checkout?service=vps&app=${encodeURIComponent(app.id)}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Header */}
      <div className={cn(
        "relative rounded-3xl p-6 sm:p-8 md:p-10 border overflow-hidden shadow-xs transition-colors",
        isDark ? "bg-[#0b0c10] border-white/10" : "bg-gradient-to-br from-slate-50 to-white border-slate-200"
      )}>
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border bg-cyan-400/10 text-cyan-400 border-cyan-400/20">
            <Rocket className="w-3.5 h-3.5" />
            <span>1-Click Application Marketplace</span>
          </div>

          <h1 className={cn("text-2xl sm:text-3xl md:text-4xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Catalog App
          </h1>

          <p className={cn("text-xs sm:text-sm md:text-base leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
            Deploy production-ready web control panels, CMS portals, enterprise databases, and autonomous AI reasoning agents on high-speed NVMe Cloud VPS with automated Cloud-Init setup and dedicated Public IPv4.
          </p>

          {/* Quick Specs Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border",
              isDark ? "bg-white/[0.03] border-white/[0.08] text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700"
            )}>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {VPS_APPS.length} Pre-configured Applications
            </span>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border",
              isDark ? "bg-white/[0.03] border-white/[0.08] text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700"
            )}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Automated Cloud-Init Scripting
            </span>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border",
              isDark ? "bg-white/[0.03] border-white/[0.08] text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700"
            )}>
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              Ubuntu 26.04 Base OS
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications by name, category, or port..."
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all",
              isDark
                ? "bg-[#0b0c10] border-white/10 text-white placeholder-zinc-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-2xs"
            )}
          />
        </div>

        {/* Category Pills Header */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {APP_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = cat === "All Apps"
              ? VPS_APPS.length
              : VPS_APPS.filter(a => a.category === cat || a.secondaryCategories?.includes(cat)).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer",
                  isActive
                    ? "bg-cyan-400 border-cyan-400 text-slate-950 font-black shadow-xs ring-1 ring-cyan-300/50"
                    : isDark
                      ? "bg-[#0b0c10] border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-2xs"
                )}
              >
                <span>{cat}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold",
                  isActive
                    ? "bg-slate-950/20 text-slate-950"
                    : isDark ? "bg-white/10 text-zinc-400" : "bg-slate-100 text-slate-600"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications Grid */}
      {filteredApps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className={cn(
                "rounded-2xl p-5 sm:p-6 border transition-all flex flex-col justify-between group relative overflow-hidden",
                isDark
                  ? "bg-[#0b0c10] border-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]"
                  : "bg-white border-slate-200/90 hover:border-cyan-400 shadow-2xs hover:shadow-md"
              )}
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center p-2.5 shrink-0 border transition-transform duration-300 group-hover:scale-105",
                      isDark ? "bg-[#050507] border-white/10" : "bg-slate-50 border-slate-200 shadow-2xs"
                    )}>
                      <img
                        referrerPolicy="no-referrer"
                        src={app.icon}
                        alt={app.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className={cn("text-sm font-black uppercase tracking-wide truncate group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>
                        {app.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                          isDark ? "bg-white/[0.04] border-white/10 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-600"
                        )}>
                          {app.category}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 font-medium">
                          {app.appVersion}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={cn(
                    "text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0",
                    isDark ? "bg-cyan-950/30 border-cyan-800/40 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                  )}>
                    :{app.defaultPort}
                  </span>
                </div>

                {/* Description */}
                <p className={cn("text-xs leading-relaxed line-clamp-3 mb-5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  {app.description}
                </p>
              </div>

              {/* Card Bottom: Specs & CTA */}
              <div className="pt-4 border-t border-white/[0.06] space-y-3.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ubuntu 26.04 Base</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto Cloud-Init</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeployApp(app)}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer group/btn"
                >
                  <Rocket className="w-3.5 h-3.5 transition-transform group-hover/btn:-translate-y-0.5" />
                  <span>Deploy {app.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(
          "text-center py-16 px-4 rounded-3xl border",
          isDark ? "bg-[#0b0c10] border-white/10 text-zinc-400" : "bg-white border-slate-200 text-slate-500"
        )}>
          <Search className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
          <h3 className={cn("text-base font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
            No Applications Found
          </h3>
          <p className="text-xs max-w-sm mx-auto mb-4">
            No application matched your search criteria "{searchQuery}". Try searching for another keyword or select All Apps.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All Apps");
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}

