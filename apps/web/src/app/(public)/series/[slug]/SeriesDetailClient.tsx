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

interface EpisodeCardProps {
  ep: any;
  index: number;
  totalEpisodes: number;
  seriesSlug: string;
  seriesImage?: string | null;
}

function EpisodeCard({ ep, index, totalEpisodes, seriesSlug, seriesImage }: EpisodeCardProps) {
  const [useFallbackImg, setUseFallbackImg] = useState(false);
  const [noImg, setNoImg] = useState(false);

  // Preferred image: episode image -> series image -> list-episodes illustration
  const imageSrc = !noImg
    ? useFallbackImg
      ? (seriesImage || "/list-episodes.webp")
      : (ep.image || seriesImage || "/list-episodes.webp")
    : null;

  const handleImageError = () => {
    if (!useFallbackImg) {
      setUseFallbackImg(true);
    } else {
      setNoImg(true);
    }
  };

  const showImage = !noImg && !!imageSrc;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
      className="rounded-xl lg:rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-300 overflow-hidden group flex flex-col h-full hover:shadow-xl hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <Link
        href={`/series/${seriesSlug}/${ep.slug}`}
        className="aspect-[16/10] relative overflow-hidden bg-[var(--surface-secondary)] block"
      >
        {showImage ? (
          <>
            <Image
              src={imageSrc}
              alt={ep.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-95 group-hover:brightness-100"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
              onError={handleImageError}
            />
            {/* Gradient overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 opacity-70 group-hover:opacity-60 transition-opacity" />
          </>
        ) : (
          /* Solid, opaque placeholder matching site card style */
          <div className="w-full h-full relative flex flex-col items-center justify-center bg-[var(--surface-secondary)] select-none">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.04] to-transparent pointer-events-none" />

            <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 bg-white dark:bg-white/[0.06] border border-black/5 dark:border-white/10 text-cyan-500 dark:text-cyan-400 shadow-sm group-hover:bg-cyan-500 group-hover:text-black group-hover:border-cyan-400">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>

            <span className="relative z-10 text-[10px] font-mono font-bold tracking-widest uppercase mt-2.5 text-[var(--text-muted)]">
              Episode {index + 1}
            </span>
          </div>
        )}

        {/* Floating Episode Badge — Top Left */}
        <div className="absolute top-3.5 left-3.5 z-10">
          <Badge variant="brand" size="sm" className="font-mono uppercase shadow-md">
            EP {String(index + 1).padStart(2, "0")}
          </Badge>
        </div>

        {/* Floating Lesson Label — Bottom Right (only displayed over real images, never on placeholder) */}
        {showImage && (
          <div className="absolute bottom-3 right-3 z-10">
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/95 text-slate-800 border border-slate-200/80 dark:bg-slate-950/80 dark:text-white dark:border-white/10 backdrop-blur-md shadow-xs">
              Episode {index + 1}
            </span>
          </div>
        )}

        {/* Hover Play Button (when image is present) */}
        {showImage && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <div className="w-14 h-14 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-2xl shadow-cyan-500/50 scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </div>
          </div>
        )}
      </Link>

      {/* Card body */}
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* Meta row */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium mb-3">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            {new Date(ep.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 line-clamp-2 leading-snug mb-3 transition-colors">
          {ep.title}
        </h3>

        {/* Excerpt */}
        {ep.excerpt && (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-6 flex-1">
            {ep.excerpt}
          </p>
        )}
        {!ep.excerpt && <div className="flex-1" />}

        {/* Footer */}
        <div className="pt-4 border-t border-[var(--border-primary)] flex items-center justify-between mt-auto">
          <span className="text-xs text-[var(--text-muted)] font-medium">
            Module {index + 1} of {totalEpisodes}
          </span>
          <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
            Watch
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {series.episodes && series.episodes.length > 0 ? (
                series.episodes.map((ep: any, index: number) => (
                  <EpisodeCard
                    key={ep.id}
                    ep={ep}
                    index={index}
                    totalEpisodes={series.episodes.length}
                    seriesSlug={slug}
                    seriesImage={series.image}
                  />
                ))
              ) : (
                <div className="col-span-full p-12 text-center rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-muted)]">
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

