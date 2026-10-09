"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, CalendarDays, Briefcase, Video, Inbox, ArrowRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Opportunity } from "@prisma/client";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface OpportunityGridProps {
  opportunities: Opportunity[];
  emptyType?: 'EVENT' | 'JOBS' | 'ALL';
}

export function OpportunityGrid({ opportunities, emptyType = 'ALL' }: OpportunityGridProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [visibleCount, setVisibleCount] = useState(6);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOpportunities = useMemo(() => {
    if (!searchQuery.trim()) return opportunities;
    const q = searchQuery.toLowerCase();
    return opportunities.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.type.toLowerCase().includes(q)
    );
  }, [opportunities, searchQuery]);

  // Reset visible count when search changes
  useEffect(() => {
    const t = setTimeout(() => {
      setVisibleCount(6);
    }, 0);
    return () => clearTimeout(t);
  }, [searchQuery]);

  if (opportunities.length === 0) {
    const EmptyIcon = emptyType === 'JOBS' ? Briefcase : emptyType === 'EVENT' ? CalendarDays : Inbox;
    return (
      <div className={cn("text-center py-16 px-6 sm:px-8 rounded-3xl border backdrop-blur-sm", isDark ? "bg-cyan-950/30 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
        <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border relative", isDark ? "bg-gradient-to-br from-cyan-500/10 via-cyan-500/10 to-cyan-500/10 border-cyan-500/20" : "bg-cyan-100 border-cyan-300")}>
          <svg width="0" height="0" className="absolute">
            <linearGradient id="icon-gradient-opps" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" offset="0%" />
              <stop stopColor="#06b6d4" offset="50%" />
              <stop stopColor="#0891b2" offset="100%" />
            </linearGradient>
          </svg>
          <EmptyIcon className="w-10 h-10" style={{ stroke: isDark ? "url(#icon-gradient-opps)" : "#0284c7" }} />
        </div>
        <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No items found</h3>
        <p className={cn("max-w-sm mx-auto", isDark ? "text-white/50" : "text-slate-500")}>There are currently no items published in this category.</p>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EVENT':   return <Calendar className="w-4 h-4" />;
      case 'WEBINAR': return <Video className="w-4 h-4" />;
      case 'JOBS':   return <Briefcase className="w-4 h-4" />;
      default:        return <Calendar className="w-4 h-4" />;
    }
  };

  const getHref = (item: Opportunity) => {
    if (item.type === 'JOBS')  return `/vacancies/${item.slug || item.id}`;
    if (item.type === 'EVENT')  return `/events/${item.slug || item.id}`;
    return `/opportunities/${item.slug || item.id}`;
  };

  return (
    <div className="mb-24">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-cyan-400 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search events, webinars, or jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full border rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 transition-all backdrop-blur-sm",
              isDark 
                ? "bg-[#011627]/40 border-white/[0.08] focus:border-cyan-500/30 text-white placeholder:text-zinc-500 focus:ring-cyan-500/10" 
                : "bg-white border-black/10 focus:border-cyan-500 text-slate-900 placeholder:text-slate-400 focus:ring-cyan-500/20 shadow-sm"
            )}
          />
        </div>
      </div>

      {filteredOpportunities.length === 0 && searchQuery.trim() !== "" ? (
        <div className={cn("text-center py-16 px-6 rounded-3xl border backdrop-blur-sm", isDark ? "bg-[#011627]/40 border-white/[0.08]" : "bg-white border-black/10 shadow-sm")}>
          <Search className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-zinc-500" : "text-slate-300")} />
          <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No results found</h3>
          <p className={cn("max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>We couldn't find anything matching "{searchQuery}". Try adjusting your search.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredOpportunities.slice(0, visibleCount).map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: (idx % 6) * 0.1, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
              >
                {/* Entire card is a link */}
            <Link href={getHref(item)} className="group relative rounded-tl-2xl rounded-tr-[3rem] rounded-br-2xl rounded-bl-[3rem] overflow-hidden flex flex-col hover:-translate-y-2 transition-all transform-gpu duration-500 h-full shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              {/* Glass base */}
              <div className={cn("absolute inset-0 backdrop-blur-xl transition-colors", isDark ? "bg-gradient-to-br from-[#0b1120]/95 to-[#070b14]/95 group-hover:from-[#0f1926]/95 group-hover:to-[#070b14]/95" : "bg-white group-hover:bg-slate-50")} />
              {/* Blobs on hover */}
              <div className={cn("absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", isDark ? "bg-cyan-500/10" : "bg-cyan-500/5")} />
              <div className={cn("absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", isDark ? "bg-cyan-500/10" : "bg-cyan-500/5")} />
              {/* Shine */}
              <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none", isDark ? "from-white/[0.05]" : "from-black/[0.02]")} />
              {/* Border */}
              <div className={cn("absolute inset-0 rounded-tl-2xl rounded-tr-[3rem] rounded-br-2xl rounded-bl-[3rem] border border-l-4 transition-all duration-500 pointer-events-none", isDark ? "border-white/5 border-l-cyan-500/30 group-hover:border-l-cyan-400 group-hover:border-cyan-500/30" : "border-black/5 border-l-cyan-500/40 group-hover:border-l-cyan-500 group-hover:border-cyan-500/20")} />

              {/* Image */}
              <div className="relative z-10 h-48 w-full shrink-0 overflow-hidden">
                {item.image ? (
                  <img referrerPolicy="no-referrer" src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy" decoding="async" />
                ) : (
                  <div className={cn("w-full h-full flex items-center justify-center", isDark ? "bg-white/[0.02]" : "bg-slate-50")}>
                    <svg width="0" height="0" className="absolute">
                      <linearGradient id={`icon-grad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#22d3ee" offset="0%" />
                        <stop stopColor="#06b6d4" offset="50%" />
                        <stop stopColor="#0891b2" offset="100%" />
                      </linearGradient>
                    </svg>
                    <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center border", isDark ? "bg-gradient-to-br from-cyan-500/10 via-cyan-500/10 to-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                      {(() => {
                        const Icon = item.type === 'JOBS' ? Briefcase : item.type === 'WEBINAR' ? Video : Calendar;
                        return <Icon className="w-10 h-10" style={{ stroke: isDark ? `url(#icon-grad-${item.id})` : "#0284c7" }} />;
                      })()}
                    </div>
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md", 
                    isDark ? "text-cyan-400 bg-black/70" : "text-cyan-600 bg-white/90 border border-cyan-100 shadow-sm"
                  )}>
                    {getTypeIcon(item.type)}
                    {item.type}
                  </span>
                  
                  {item.isNew && (
                    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md", isDark ? "text-cyan-400 bg-black/70" : "text-cyan-600 bg-white/90 border border-cyan-100 shadow-sm")}>
                      NEW
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10 p-6 flex flex-col flex-grow overflow-hidden">
                <h3 className={cn("text-xl font-bold mb-3 transition-colors line-clamp-2", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>
                  {item.title}
                </h3>

                {item.description && (
                  <p className={cn("text-sm mb-6 line-clamp-3", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {item.description}
                  </p>
                )}

                <div className="flex-grow" />

                {/* Footer */}
                <div className={cn("flex items-center justify-between mt-auto pt-4 border-t", isDark ? "border-white/[0.06]" : "border-black/5")}>
                  <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                    {new Date(item.createdAt).toLocaleDateString('en-GB')}
                  </div>

                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-bold transition-all duration-200",
                    isDark 
                      ? "bg-cyan-500/10 group-hover:bg-cyan-500 border-cyan-500/20 group-hover:border-cyan-500 text-cyan-400 group-hover:text-[#011627]" 
                      : "bg-cyan-50 group-hover:bg-cyan-600 border-cyan-200 group-hover:border-cyan-600 text-cyan-600 group-hover:text-white shadow-sm"
                  )}>
                    Read More
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
              </Link>
              </motion.div>
            ))}
          </div>

          {visibleCount < filteredOpportunities.length && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => setVisibleCount(prev => prev + 6)}
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all gap-2 w-fit shrink-0"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
