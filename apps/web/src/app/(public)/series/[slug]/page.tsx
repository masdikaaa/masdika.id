"use client";

import { useState, useEffect, use } from "react";
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
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { PremiumLoader } from "@/components/ui/PremiumLoader";

export default function SeriesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { slug } = use(params);
  const [series, setSeries] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const LEVEL_COLOR: Record<string, string> = {
    Beginner: isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200",
    Intermediate: isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200",
    Advanced: isDark ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-red-600 bg-red-50 border-red-200",
  };

  useEffect(() => {
    fetch(`/api/series/${slug}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setSeries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <PremiumLoader />;

  if (!series) return (
    <div className="pt-32 text-center min-h-screen">
      <h1 className={cn("text-2xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>Series not found</h1>
      <Link href="/series" className={cn("hover:underline", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-500")}>← Back to Series</Link>
    </div>
  );

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
    "numberOfItems": series.episodes.length,
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
                className="relative flex items-center justify-center mt-10 lg:mt-0"
              >
                <div className="relative w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] h-[380px] sm:h-[440px] lg:h-[480px] mx-auto flex items-end justify-center">
                  {/* Subtle ambient depth bloom behind avatar */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

                  {/* Floating Card 1: Top-Left (Curriculum) */}
                  <div className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none">
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                        Track Level
                      </div>
                      <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                        {series.level} Level
                      </div>
                    </div>
                  </div>

                  {/* Floating Card 2: Top-Right (Available Episodes) */}
                  <div className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none">
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                      <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-cyan-500 dark:fill-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                        Available Lessons
                      </div>
                      <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                        {series.episodes?.length || 0} Episodes
                      </div>
                    </div>
                  </div>

                  {/* Floating Card 3: Bottom-Left (Learning Format) */}
                  <div className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none">
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                      <Layers className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                        Hands-on Labs
                      </div>
                      <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                        Video + Docs
                      </div>
                    </div>
                  </div>

                  {/* Floating Card 4: Bottom-Right (Instructor) */}
                  <div className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#0a0a0a]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[170px] sm:max-w-none">
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none truncate">
                        Instructor
                      </div>
                      <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap truncate max-w-[115px] sm:max-w-none">
                        {series.adminName || "Masdika.ID"}
                      </div>
                    </div>
                  </div>

                  {/* Mascot list-episodes.webp */}
                  <div
                    className="w-full h-full relative z-10 flex items-end justify-center"
                    style={{
                      maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                      WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                    }}
                  >
                    <Image
                      src="/list-episodes.webp"
                      alt={`${series.title} – Episodes`}
                      width={1536}
                      height={1024}
                      priority={true}
                      unoptimized={true}
                      className="w-full h-full object-contain object-bottom"
                    />
                    <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent pointer-events-none" />
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ── 1. EPISODES CATALOG SECTION ── */}
          <div id="episodes-catalog" className="pt-10 border-t border-[var(--border-subtle)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  Curriculum Modules ({series.episodes?.length || 0})
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
                  Urutan pembelajaran berurutan dari episode 1 sampai selesai
                </p>
              </div>

              {/* Tag filters / Series level */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${LEVEL_COLOR[series.level] ?? LEVEL_COLOR.Beginner}`}>
                  {series.level}
                </span>
                {series.tags?.split(',').map((t: string) => (
                  <span key={t} className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", isDark ? "bg-white/5 text-zinc-400 border-white/10" : "bg-slate-100 text-slate-600 border-slate-200")}>
                    #{t.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Episode List Cards */}
            <div className="flex flex-col gap-4">
              {series.episodes.map((ep: any, i: number) => (
                <motion.div key={ep.id}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/series/${slug}/${ep.slug}`}
                    className={cn(
                      "group relative flex flex-col sm:flex-row items-stretch gap-5 rounded-2xl overflow-hidden p-4 sm:p-6 hover:-translate-y-0.5 transition-all duration-200 border",
                      isDark
                        ? "border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 shadow-lg shadow-black/30"
                        : "border-black/5 hover:border-cyan-500/40 bg-white shadow-sm hover:shadow-md"
                    )}
                  >
                    <div className={cn("absolute inset-0 transition-colors pointer-events-none", isDark ? "bg-white/[0.02] group-hover:bg-white/[0.05]" : "bg-slate-50/0 group-hover:bg-slate-50/50")} />

                    {/* Thumbnail */}
                    <div className={cn(
                      "relative z-10 w-full sm:w-60 md:w-72 aspect-[16/9] sm:aspect-auto sm:min-h-[140px] rounded-xl overflow-hidden shrink-0 border flex items-center justify-center",
                      isDark ? "border-[var(--border-primary)] bg-[var(--surface-secondary)]" : "border-black/5 bg-slate-100"
                    )}>
                      {ep.image ? (
                        <img referrerPolicy="no-referrer" src={ep.image} alt={ep.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-cyan-500/20">
                          <Play className={cn("w-8 h-8", isDark ? "text-cyan-400/70" : "text-cyan-600/70")} />
                        </div>
                      )}
                      {/* Episode number badge */}
                      <div className={cn("absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-bold backdrop-blur-md", isDark ? "bg-black/80 text-white" : "bg-white/95 text-slate-900 shadow-sm")}>
                        Episode {ep.order + 1}
                      </div>
                      {/* Play overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="relative z-10 flex-1 min-w-0 py-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-500">
                          Module {ep.order + 1}
                        </span>
                      </div>
                      <h3 className={cn(
                        "font-bold text-xl sm:text-2xl transition-colors leading-snug mb-2 sm:mb-3",
                        isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"
                      )}>
                        {ep.title}
                      </h3>
                      {ep.excerpt && (
                        <p className={cn("text-sm sm:text-base line-clamp-2 leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-600")}>
                          {ep.excerpt}
                        </p>
                      )}
                      <div className={cn("flex items-center gap-3 text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                        <div className="flex items-center gap-2">
                          {series.adminImage ? (
                            <img referrerPolicy="no-referrer" src={series.adminImage} alt={series.adminName} className={cn("w-5 h-5 rounded-full object-cover border", isDark ? "border-cyan-500/30" : "border-cyan-200")} loading="lazy" decoding="async" />
                          ) : (
                            <div className={cn("w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[10px] border", isDark ? "bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-500/30" : "bg-gradient-to-br from-cyan-600 to-cyan-700 border-cyan-200")}>
                              {(series.adminName || "M")[0]}
                            </div>
                          )}
                          <span className={cn("font-medium", isDark ? "text-cyan-500/80" : "text-cyan-600/80")}>{series.adminName}</span>
                        </div>
                        <span className={cn("w-1 h-1 rounded-full", isDark ? "bg-white/20" : "bg-black/10")} />
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(ep.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={cn(
                      "relative z-10 w-5 h-5 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block self-center ml-2",
                      isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                    )} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
