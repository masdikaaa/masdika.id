"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Calendar, 
  GraduationCap, 
  Layers, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  BookOpen 
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function SeriesDetailClient({ initialSeries, slug }: { initialSeries: any; slug: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [series] = useState<any>(initialSeries);

  const LEVEL_COLOR: Record<string, string> = {
    Beginner: isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200",
    Intermediate: isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200",
    Advanced: isDark ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-red-600 bg-red-50 border-red-200",
  };

  // JSON-LD structured data for SEO (Course schema)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": series.title,
    "description": series.description,
    "image": series.image || `${process.env.NEXT_PUBLIC_APP_URL}/og-image.webp`,
    "provider": {
      "@type": "Person",
      "name": "Masdika",
      "url": process.env.NEXT_PUBLIC_APP_URL,
    },
    "courseLevel": series.level,
    "numberOfItems": series.episodes?.length || 0,
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
    },
    "about": series.tags?.split(',').map((t: string) => ({ "@type": "Thing", "name": t.trim() })),
    "url": `${process.env.NEXT_PUBLIC_APP_URL}/series/${slug}`,
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col min-h-screen pt-28 md:pt-32 pb-20 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

          {/* Breadcrumb / Back Link */}
          <div className="mb-6 sm:mb-8">
            <Link
              href="/series"
              className={cn(
                "inline-flex items-center text-sm font-medium transition-colors gap-2 group",
                isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                isDark
                  ? "bg-white/5 border border-white/10 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30"
                  : "bg-white border border-black/10 group-hover:bg-cyan-50 group-hover:border-cyan-200"
              )}>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              Back to All Series
            </Link>
          </div>

          {/* ── 0. HERO SECTION (Konsisten dengan /series, /vacancies, /blog) ── */}
          <section className="relative pt-2 sm:pt-4 pb-12 lg:pb-16 flex items-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
              
              {/* Left – Text & Actions */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="max-w-2xl relative z-30"
              >
                {/* Status pill using shared Badge */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                    {series.level.toUpperCase()} TRACK
                  </Badge>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border",
                    isDark ? "bg-white/5 text-zinc-300 border-white/10" : "bg-slate-100 text-slate-600 border-slate-200"
                  )}>
                    {series.episodes?.length || 0} Modules / Episodes
                  </span>
                </div>

                {/* Headline H1 (Ukuran sama persis Series & Home Page) */}
                <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.08] mb-4 text-[var(--text-primary)]">
                  {series.title}
                </h1>

                {/* Subtitle / Lead */}
                <p className="text-lg md:text-xl mb-8 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                  {series.description}
                </p>

                {/* Author & Meta bar */}
                <div className="flex flex-wrap items-center gap-4 mb-8 text-sm">
                  <div className="flex items-center gap-2.5">
                    {series.adminImage ? (
                      <img referrerPolicy="no-referrer" src={series.adminImage} alt={series.adminName} className="w-7 h-7 rounded-full object-cover border border-cyan-500/30" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs bg-gradient-to-br from-cyan-500 to-cyan-600">
                        {(series.adminName || "M")[0]}
                      </div>
                    )}
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{series.adminName}</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
                  <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(series.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4">
                  {series.episodes && series.episodes.length > 0 ? (
                    <Button
                      variant="primary"
                      size="lg"
                      href={`/series/${slug}/${series.episodes[0].slug}`}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Start Episode 1
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="lg"
                    href="#episodes-catalog"
                    leftIcon={<Play className="w-4 h-4 text-cyan-600 dark:text-cyan-400 fill-cyan-600 dark:fill-cyan-400" />}
                  >
                    View Episodes ({series.episodes?.length || 0})
                  </Button>
                </div>
              </motion.div>

              {/* Right – Hero Avatar (list-episodes.webp) with 4 Floating Badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="relative flex items-center justify-center mt-6 lg:mt-0"
              >
                <HeroAvatarFrame
                  imageSrc="/list-episodes.webp"
                  imageAlt={series.title}
                  imageWidth={1536}
                  imageHeight={1024}
                  badges={[
                    { icon: GraduationCap, label: "Track Level", value: `${series.level} Level` },
                    { icon: Play, label: "Available Lessons", value: `${series.episodes?.length || 0} Episodes` },
                    { icon: Layers, label: "Hands-on Labs", value: "Video + Docs" },
                    { icon: ShieldCheck, label: "Instructor", value: series.adminName || "Masdika.ID" },
                  ]}
                />
              </motion.div>
            </div>
          </section>

          {/* ── 1. EPISODES CATALOG LIST ── */}
          <section id="episodes-catalog" className="pt-6 sm:pt-8 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[var(--border-primary)]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Syllabus Overview
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                  Course Modules & Lessons
                </h2>
              </div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                {series.episodes?.length || 0} Total Episodes Available
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {series.episodes && series.episodes.length > 0 ? (
                series.episodes.map((ep: any, index: number) => (
                  <Link
                    key={ep.id}
                    href={`/series/${slug}/${ep.slug}`}
                    className={cn(
                      "group p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                      isDark
                        ? "bg-[var(--surface)] hover:bg-[#121212] border-[var(--border-primary)] hover:border-cyan-500/50 shadow-md shadow-black/20"
                        : "bg-white hover:bg-slate-50 border-black/10 hover:border-cyan-500/40 shadow-xs hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border transition-all duration-200",
                        isDark
                          ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black group-hover:scale-105"
                          : "bg-cyan-50 border-cyan-200 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white group-hover:scale-105"
                      )}>
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                            isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500"
                          )}>
                            Episode {index + 1}
                          </span>
                          <span className={cn("text-xs flex items-center gap-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                            <Calendar className="w-3 h-3" />
                            {new Date(ep.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <h3 className={cn(
                          "text-base sm:text-lg font-bold transition-colors line-clamp-1",
                          isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"
                        )}>
                          {ep.title}
                        </h3>
                        {ep.excerpt && (
                          <p className={cn("text-xs sm:text-sm mt-0.5 line-clamp-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                            {ep.excerpt}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className={cn(
                        "text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors",
                        isDark 
                          ? "bg-white/5 border-white/10 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40"
                          : "bg-slate-100 border-slate-200 text-cyan-700 group-hover:bg-cyan-50 group-hover:border-cyan-300"
                      )}>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Watch Episode
                      </span>
                      <ChevronRight className={cn(
                        "w-5 h-5 transition-transform group-hover:translate-x-1",
                        isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-300 group-hover:text-cyan-600"
                      )} />
                    </div>
                  </Link>
                ))
              ) : (
                <div className={cn(
                  "p-12 text-center rounded-2xl border",
                  isDark ? "bg-[var(--surface)] border-[var(--border-primary)] text-zinc-500" : "bg-white border-black/5 text-slate-400"
                )}>
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-base font-semibold">No episodes published yet for this series.</p>
                  <p className="text-xs mt-1">Check back soon for new content!</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

