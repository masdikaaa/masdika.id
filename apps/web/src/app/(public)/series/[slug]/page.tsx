"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";


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

  if (loading) return (
    <div className="pt-32 flex justify-center min-h-screen">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

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

      <div className="min-h-screen pt-28 md:pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto pt-10">

          <Link href="/series" className={cn("inline-flex items-center text-sm font-medium mb-10 transition-colors gap-1", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
            <ChevronLeft className="w-4 h-4" /> Back to Series
          </Link>

          {/* Series Header */}
          <div className={cn("relative rounded-3xl overflow-hidden mb-10 border", isDark ? "shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-white/[0.08]" : "border-black/5 bg-white shadow-xl")}>
            <div className={cn("absolute inset-0 backdrop-blur-sm", isDark ? "bg-[var(--surface)]" : "bg-slate-50")} />
            <div className={cn("absolute -top-10 -left-10 w-56 h-56 rounded-full blur-3xl pointer-events-none", isDark ? "bg-cyan-500/15" : "bg-cyan-500/5")} />
            <div className={cn("absolute -bottom-10 -right-10 w-56 h-56 rounded-full blur-3xl pointer-events-none", isDark ? "bg-cyan-500/15" : "bg-cyan-500/5")} />
            <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none", isDark ? "from-white/[0.05]" : "from-black/[0.02]")} />

            <div className="relative z-10 flex flex-col md:flex-row gap-6 p-8">
              {/* NOTE: Recommended image size is 1730x909 pixels to prevent cropping */}
              {series.image && (
                <div className={cn("w-full md:w-64 aspect-[1730/909] rounded-2xl overflow-hidden shrink-0 border", isDark ? "border-[var(--border-primary)] bg-[var(--surface-secondary)]" : "border-black/5 bg-slate-100")}>
                  <img referrerPolicy="no-referrer" src={series.image} alt={series.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${LEVEL_COLOR[series.level] ?? LEVEL_COLOR.Beginner}`}>
                    {series.level}
                  </span>
                  {series.tags?.split(',').map((t: string) => (
                    <span key={t} className={cn("px-2 py-0.5 rounded-full text-xs border", isDark ? "bg-white/5 text-zinc-400 border-white/10" : "bg-slate-50 text-slate-500 border-black/10")}>
                      #{t.trim()}
                    </span>
                  ))}
                </div>
                <h1 className={cn("text-2xl sm:text-3xl font-bold mb-2 leading-snug break-words", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent" : "text-slate-900")} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {series.title}
                </h1>
                <p className={cn("leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-600")}>{series.description}</p>
                <div className={cn("flex items-center gap-4 text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <span className="flex items-center gap-1.5"><Play className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} /> {series.episodes.length} episodes</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(series.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Episode List */}
          <h2 className={cn("text-xl font-bold mb-5", isDark ? "text-white" : "text-slate-900")}>{series.episodes.length} Episodes</h2>
          <div className="flex flex-col gap-4">
            {series.episodes.map((ep: any, i: number) => (
              <motion.div key={ep.id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <Link href={`/series/${slug}/${ep.slug}`}
                  className={cn("group relative flex flex-col sm:flex-row items-stretch gap-5 rounded-2xl overflow-hidden p-4 sm:p-5 hover:-translate-y-0.5 transition-all duration-200 border", isDark ? "border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/30" : "border-black/5 hover:border-cyan-500/40 bg-white shadow-sm hover:shadow-md")}>
                  <div className={cn("absolute inset-0 transition-colors pointer-events-none", isDark ? "bg-white/[0.04] group-hover:bg-white/[0.07]" : "bg-slate-50/0 group-hover:bg-slate-50/50")} />

                  {/* Thumbnail */}
                  {/* NOTE: Recommended image size is 1730x909 pixels to prevent cropping */}
                  <div className={cn("relative z-10 w-full sm:w-56 md:w-64 lg:w-72 aspect-[1730/909] sm:aspect-auto sm:min-h-[140px] rounded-xl overflow-hidden shrink-0 border flex items-center justify-center", isDark ? "border-[var(--border-primary)] bg-[var(--surface-secondary)]" : "border-black/5 bg-slate-100")}>
                    {ep.image ? (
                      <img referrerPolicy="no-referrer" src={ep.image} alt={ep.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-cyan-500/10">
                        <Play className={cn("w-7 h-7", isDark ? "text-cyan-400/70" : "text-cyan-600/70")} />
                      </div>
                    )}
                    {/* Episode number badge */}
                    <div className={cn("absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm", isDark ? "bg-black/75 text-white" : "bg-white/90 text-slate-900 shadow-sm")}>
                      {ep.order + 1}
                    </div>
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="relative z-10 flex-1 min-w-0 py-1 flex flex-col justify-center">
                    <h3 className={cn("font-bold text-xl sm:text-2xl transition-colors leading-snug mb-2 sm:mb-3", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>
                      {ep.title}
                    </h3>
                    {ep.excerpt && (
                      <p className={cn("text-sm sm:text-base line-clamp-3 leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-600")}>
                        {ep.excerpt}
                      </p>
                    )}
                    <div className={cn("flex items-center gap-3 text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                      <div className="flex items-center gap-2">
                        {series.adminImage ? (
                          <img referrerPolicy="no-referrer" src={series.adminImage} alt={series.adminName} className={cn("w-5 h-5 rounded-full object-cover border", isDark ? "border-cyan-500/30" : "border-cyan-200")} loading="lazy" decoding="async" />
                        ) : (
                          <div className={cn("w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[10px] border", isDark ? "bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-500/30" : "bg-gradient-to-br from-cyan-600 to-cyan-700 border-cyan-200")}>
                            {(series.adminName || "A")[0]}
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

                  <ChevronRight className={cn("relative z-10 w-5 h-5 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block self-center ml-2", isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600")} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
