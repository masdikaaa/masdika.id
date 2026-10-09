"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Play, ChevronRight, Layers, Zap, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export default function SeriesClient({ initialSeries }: { initialSeries: any[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [seriesList] = useState<any[]>(initialSeries);

  const LEVEL_COLOR: Record<string, string> = {
    Beginner:     isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200",
    Intermediate: isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200",
    Advanced:     isDark ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-red-600 bg-red-50 border-red-200",
  };
  
  const LEVEL_ICON: Record<string, React.ReactNode> = {
    Beginner:     <GraduationCap className="w-3.5 h-3.5" />,
    Intermediate: <Zap className="w-3.5 h-3.5" />,
    Advanced:     <Layers className="w-3.5 h-3.5" />,
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-32 relative z-10 min-h-screen">
        {/* Header */}
        <div className="text-center mb-16 pt-10">
          <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full", isDark ? "shadow-[0_0_15px_rgba(34,211,238,0.15)] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
            Learning Path
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className={cn("text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
            Learning <br className="hidden sm:block" />
            <span className={cn("bg-clip-text text-transparent drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>Series</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className={cn("text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
            Structured learning series covering networking, cloud, DevOps, and more.
          </motion.p>
        </div>

        {/* Grid */}
        {seriesList.length === 0 ? (
          <div className={cn("text-center py-20 px-6 sm:px-10 mx-4 sm:mx-0 rounded-3xl border", isDark ? "bg-cyan-950/30 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
            <BookOpen className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-cyan-400/40" : "text-cyan-600/40")} />
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No series yet</h3>
            <p className={isDark ? "text-white/40" : "text-slate-500"}>Learning series will appear here once published.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {seriesList.map((s, i) => (
              <motion.div key={s.id}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }}>
                <Link href={`/series/${s.slug}`}
                  className={cn("group relative flex flex-col rounded-3xl overflow-hidden hover:-translate-y-1 transition-transform duration-300 h-full border", isDark ? "shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-white/5" : "shadow-md hover:shadow-xl border-black/5")}>
                  {/* Glass */}
                  <div className={cn("absolute inset-0 backdrop-blur-sm transition-colors duration-300", isDark ? "bg-[#011627]/40 group-hover:bg-[#011627]/60" : "bg-white group-hover:bg-slate-50")} />
                  <div className={cn("absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", isDark ? "bg-cyan-500/15" : "bg-cyan-500/5")} />
                  <div className={cn("absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", isDark ? "bg-cyan-500/15" : "bg-cyan-500/5")} />
                  <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none", isDark ? "from-white/[0.05]" : "from-black/[0.02]")} />
                  <div className={cn("absolute inset-0 rounded-3xl border transition-colors duration-300 pointer-events-none", isDark ? "border-white/[0.08] group-hover:border-cyan-500/20" : "border-transparent group-hover:border-cyan-500/30")} />

                  {/* Thumbnail */}
                  <div className={cn("relative z-10 w-full aspect-[1730/909] overflow-hidden shrink-0", isDark ? "bg-black/30" : "bg-slate-100")}>
                    {s.image ? (
                      <img referrerPolicy="no-referrer" src={s.image} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/10 to-cyan-500/10 flex items-center justify-center">
                        <BookOpen className={cn("w-12 h-12", isDark ? "text-cyan-400/40" : "text-cyan-600/40")} />
                      </div>
                    )}
                    <div className={cn("absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-bold border", isDark ? "bg-black/60 text-white border-white/10" : "bg-white/90 text-slate-900 border-black/10 shadow-sm")}>
                      <Play className={cn("w-3 h-3", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      {s.episodes?.length ?? 0} Episodes
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 p-6 flex flex-col flex-grow">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${LEVEL_COLOR[s.level] ?? LEVEL_COLOR.Beginner}`}>
                        {LEVEL_ICON[s.level] ?? LEVEL_ICON.Beginner}
                        {s.level}
                      </span>
                      {s.tags?.split(',').slice(0, 2).map((t: string) => (
                        <span key={t} className={cn("px-2 py-0.5 rounded-full text-[11px] border", isDark ? "bg-white/5 text-zinc-400 border-white/10" : "bg-slate-50 text-slate-500 border-black/10")}>
                          #{t.trim()}
                        </span>
                      ))}
                    </div>

                    <h3 className={cn("text-lg font-bold mb-2 transition-colors line-clamp-2", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>
                      {s.title}
                    </h3>
                    <p className={cn("text-sm line-clamp-2 mb-4 flex-grow", isDark ? "text-zinc-400" : "text-slate-600")}>
                      {s.description}
                    </p>

                    <div className={cn("mt-auto flex items-center justify-between pt-4 border-t", isDark ? "border-white/[0.06]" : "border-black/5")}>
                      <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                        {new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <span className={cn("inline-flex items-center gap-1 text-xs font-bold group-hover:gap-2 transition-all", isDark ? "text-cyan-400" : "text-cyan-600")}>
                        View Series <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
  );
}
