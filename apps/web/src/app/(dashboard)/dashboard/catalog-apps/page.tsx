"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import {
  Rocket, Search, Server, ArrowRight, ShieldCheck,
  CheckCircle, Sparkles, X, Terminal, Cpu, HardDrive, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VPS_APPS, APP_CATEGORIES, AppCategory, VpsAppDefinition } from "@/lib/vps-apps";
import { Pagination } from "@/components/ui/Pagination";

const ITEMS_PER_PAGE = 8;

export default function CatalogAppsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>("All Apps");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 whenever category or search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const filteredApps = useMemo(() => {
    return VPS_APPS.filter((app) => {
      const matchesCategory =
        selectedCategory === "All Apps" ||
        app.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        app.defaultPort.toString().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredApps.length / ITEMS_PER_PAGE);

  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApps.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApps, currentPage]);

  const handleDeployApp = (app: VpsAppDefinition) => {
    router.push(`/dashboard/checkout?service=vps&app=${encodeURIComponent(app.id)}`);
  };

  return (
    <div className="w-full max-w-full space-y-5 pb-10">
      {/* Top Header Bar - Full Width, matching VPS & Services dashboards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              App Catalog
            </h1>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-semibold border font-mono",
              isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-800 border-cyan-200"
            )}>
              {filteredApps.length} Available
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Deploy 1-click applications, web control panels, developer stacks, and AI agents with automated Cloud-Init setup.
          </p>
        </div>

        {/* Search Bar in Header */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps by name, port..."
              className={cn(
                "w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border outline-hidden transition-all",
                isDark
                  ? "bg-[#111115] border-white/[0.08] text-white placeholder-zinc-500 focus:border-cyan-400"
                  : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 shadow-2xs"
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills - Razor-Sharp Standalone Pills (No outer blurry capsule) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {APP_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          const count = cat === "All Apps"
            ? VPS_APPS.length
            : VPS_APPS.filter(a => a.category === cat).length;

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
                    ? "bg-[#111115] border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/20"
                    : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-2xs"
              )}
            >
              <span>{cat}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold border",
                isActive
                  ? "bg-slate-950/20 text-slate-950 border-slate-950/30"
                  : isDark
                    ? "bg-[#08090d] text-zinc-300 border-white/10"
                    : "bg-slate-100 text-slate-700 border-slate-200"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Applications Grid - Full Space 4 Columns on XL / 3 on LG / 2 on MD / 1 on Mobile */}
      {filteredApps.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {paginatedApps.map((app) => (
              <div
                key={app.id}
                className={cn(
                  "rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between group relative overflow-hidden",
                  isDark
                    ? "bg-[#111115] border-white/[0.08] hover:border-cyan-500/40 hover:bg-[#14141a] hover:shadow-[0_0_25px_rgba(6,182,212,0.08)]"
                    : "bg-white border-slate-200/90 hover:border-cyan-400 shadow-2xs hover:shadow-md"
                )}
              >
                {/* Card Header & Content */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center p-2 shrink-0 border transition-transform duration-200 group-hover:scale-105",
                        isDark ? "bg-[#08090d] border-white/10" : "bg-slate-50 border-slate-200 shadow-2xs"
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
                        <h3 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wide truncate group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>
                          {app.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
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
                      "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0",
                      isDark ? "bg-cyan-950/40 border-cyan-800/50 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-800"
                    )}>
                      :{app.defaultPort}
                    </span>
                  </div>

                  {/* Description */}
                  <p className={cn("text-xs leading-relaxed line-clamp-2 mb-4", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {app.description}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                    <span className="flex items-center gap-1 font-mono text-cyan-400">
                      <Cpu className="w-3 h-3" />
                      <span>Min: {app.minSpecs.cpu}C / {app.minSpecs.ram}GB</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-zinc-400">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{app.estimatedTime}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeployApp(app)}
                    className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer group/btn"
                  >
                    <Rocket className="w-3.5 h-3.5 transition-transform group-hover/btn:-translate-y-0.5" />
                    <span>Deploy {app.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover/btn:translate-x-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={cn(
              "flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 pb-2 border-t",
              isDark ? "border-white/[0.08]" : "border-slate-200"
            )}>
              <span className={cn("text-xs font-mono font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                Showing <span className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{Math.min(currentPage * ITEMS_PER_PAGE, filteredApps.length)}</span> of <span className="font-bold">{filteredApps.length}</span> Applications
              </span>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          "text-center py-16 px-4 rounded-2xl border",
          isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400" : "bg-white border-slate-200 text-slate-500"
        )}>
          <Search className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
          <h3 className={cn("text-sm font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
            No Applications Found
          </h3>
          <p className="text-xs max-w-sm mx-auto mb-4">
            No application matched your search criteria "{searchQuery}".
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
