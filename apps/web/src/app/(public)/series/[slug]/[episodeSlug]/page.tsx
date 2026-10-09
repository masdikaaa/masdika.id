"use client";

import { useState, useEffect, use } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

function MarkdownContent({ content, isDark }: { content: string, isDark: boolean }) {
  const parts = content.split(/```/);
  return (
    <div className={cn("w-full max-w-none font-sans break-words prose", isDark ? "prose-invert text-zinc-300" : "text-slate-700")}>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const match = part.match(/^([^\n]*)\n([\s\S]*)$/);
          const langOrTitle = match ? match[1].trim() : '';
          const code = match ? match[2] : part;
          const lower = langOrTitle.toLowerCase();
          let language = 'bash';
          if (lower.includes('php')) language = 'php';
          else if (lower.includes('js') || lower.includes('jsx')) language = 'javascript';
          else if (lower.includes('ts') || lower.includes('tsx')) language = 'typescript';
          else if (lower.includes('yaml') || lower.includes('yml')) language = 'yaml';
          else if (lower.includes('html')) language = 'html';
          else if (lower.includes('css')) language = 'css';
          else if (lower.includes('json')) language = 'json';
          else if (lower.includes('sh') || lower.includes('bash')) language = 'bash';
          else if (langOrTitle) language = lower;
          return (
            <div key={index} className="not-prose my-8">
              <CodeBlock code={code.trim()} language={language} title={langOrTitle || language} />
            </div>
          );
        }
        return <div key={index} dangerouslySetInnerHTML={{ __html: renderMarkdown(part) }} />;
      })}
    </div>
  );
}

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1, 12);
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.has('v')) {
        return u.searchParams.get('v')?.slice(0, 11) || null;
      }
      if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/v/')) {
        return u.pathname.split('/')[2]?.slice(0, 11) || null;
      }
    }
  } catch {}
  
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function EpisodePage({ params }: { params: Promise<{ slug: string; episodeSlug: string }> }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { slug, episodeSlug } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);

  useEffect(() => {
    fetch(`/api/series/${slug}/episodes/${episodeSlug}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setData(d);
          const headings: { id: string; text: string; level: number }[] = [];
          const regex = /^(#{2,3})\s+(.*)$/gm;
          let m;
          while ((m = regex.exec(d.episode.content)) !== null) {
            const level = m[1].length;
            const text = m[2].trim().replace(/[*`_~]/g, '');
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            headings.push({ id, text, level });
          }
          setToc(headings);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, episodeSlug]);

  if (loading) return (
    <div className="pt-32 flex justify-center min-h-screen">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="pt-32 text-center min-h-screen">
      <h1 className={cn("text-2xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>Episode not found</h1>
      <Link href={`/series/${slug}`} className={cn("hover:underline", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-500")}>← Back to Series</Link>
    </div>
  );

  const { episode, series, prev, next, totalEpisodes, adminName, adminImage } = data;
  const ytId = episode.videoUrl ? getYouTubeId(episode.videoUrl) : null;

  // JSON-LD structured data for SEO (LearningResource + VideoObject if YouTube)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const jsonLd: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      "name": episode.title,
      "description": episode.excerpt || `Episode ${episode.order + 1} of ${series.title}`,
      "educationalLevel": "beginner",
      "learningResourceType": "lesson",
      "isPartOf": {
        "@type": "Course",
        "name": series.title,
        "url": `${appUrl}/series/${slug}`,
      },
      "position": episode.order + 1,
      "url": `${appUrl}/series/${slug}/${episode.slug}`,
      "datePublished": episode.createdAt,
    },
  ];

  if (ytId) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "name": episode.title,
      "description": episode.excerpt || episode.title,
      "embedUrl": `https://www.youtube.com/embed/${ytId}`,
      "thumbnailUrl": episode.image || `${appUrl}/og-image.webp`,
      "uploadDate": episode.createdAt,
    });
  }

  return (
    <>
      {jsonLd.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
      <div className="w-full max-w-full overflow-x-hidden min-w-0">
      <div className="pt-28 md:pt-32 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-10">
        <Link href={`/series/${slug}`} className={cn("inline-flex items-center text-sm font-medium mb-10 transition-colors gap-1", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
          <ChevronLeft className="w-4 h-4" /> Back to {series.title}
        </Link>

        {/* Episode Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
            <span className={cn("px-3 py-1.5 rounded-full border text-xs font-bold", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
              Episode {episode.order + 1} / {totalEpisodes}
            </span>
            <span className={cn("w-1 h-1 rounded-full mx-1 hidden sm:block", isDark ? "bg-white/20" : "bg-black/10")} />
            <div className={cn("flex items-center gap-2", isDark ? "text-zinc-300" : "text-slate-700")}>
              {adminImage ? (
                <img referrerPolicy="no-referrer" src={adminImage} alt={adminName} className={cn("w-6 h-6 rounded-full object-cover border", isDark ? "border-cyan-500/30" : "border-cyan-200")} loading="lazy" decoding="async" />
              ) : (
                <div className={cn("w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-xs border", isDark ? "bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-500/30" : "bg-cyan-600 border-cyan-200")}>
                  {(adminName || "A")[0]}
                </div>
              )}
              <span className={cn("font-medium", isDark ? "text-cyan-500/80" : "text-cyan-600/80")}>{adminName}</span>
            </div>
            <span className={cn("w-1 h-1 rounded-full mx-1 hidden sm:block", isDark ? "bg-white/20" : "bg-black/10")} />
            <span className={cn("flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>
              <Calendar className="w-4 h-4" />
              {new Date(episode.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className={cn("text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-extrabold mb-4 sm:mb-6 leading-snug sm:leading-tight drop-shadow-sm break-words", isDark ? "text-white" : "text-slate-900")} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {episode.title}
          </h1>
          {episode.excerpt && (
            <p className={cn("text-base leading-7", isDark ? "text-zinc-400" : "text-slate-600")}>{episode.excerpt}</p>
          )}
        </header>

        {/* YouTube Embed */}
        {ytId && (
          <div className={cn("relative w-full rounded-2xl overflow-hidden border mb-10 aspect-video", isDark ? "border-white/10 bg-black" : "border-black/5 bg-slate-100")}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}`}
              title={episode.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Thumbnail if no video */}
        {/* NOTE: Recommended image size is 1730x909 pixels to prevent cropping */}
        {!ytId && episode.image && (
          <div className={cn("w-full aspect-[1730/909] rounded-2xl overflow-hidden border mb-10", isDark ? "border-white/10 bg-black/50" : "border-black/5 bg-slate-100")}>
            <img referrerPolicy="no-referrer" src={episode.image} alt={episode.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          </div>
        )}

        {/* Table of Contents */}
        {toc.length > 0 && (
          <details className={cn("backdrop-blur-sm border p-5 rounded-2xl mb-10 group", isDark ? "bg-[#011627]/40 border-white/[0.08]" : "bg-white border-black/5 shadow-sm")}>
            <summary className={cn("text-base font-bold flex items-center gap-2 cursor-pointer list-none select-none outline-none", isDark ? "text-white" : "text-slate-900")}>
              <span className="w-1.5 h-5 bg-cyan-500 rounded-full" />
              Table of Contents
              <span className={cn("ml-auto w-7 h-7 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform", isDark ? "bg-white/5 text-zinc-400" : "bg-slate-100 text-slate-500")}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </span>
            </summary>
            <ul className={cn("mt-4 pt-4 border-t space-y-2", isDark ? "border-white/5" : "border-black/5")}>
              {toc.map((h, i) => (
                <li key={i} className={h.level === 3 ? "ml-4" : ""}>
                  <a href={`#${h.id}`} className={cn("text-sm transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}>{h.text}</a>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Content */}
        <article className="w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          <MarkdownContent content={episode.content} isDark={isDark} />
        </article>

        {/* Prev / Next Navigation */}
        <div className={cn("mt-16 pt-10 border-t grid grid-cols-1 sm:grid-cols-2 gap-4", isDark ? "border-white/[0.06]" : "border-black/5")}>
          {prev ? (
            <Link href={`/series/${slug}/${prev.slug}`}
              className={cn("group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5", isDark ? "bg-white/[0.06] hover:bg-white/[0.10] border-white/20 hover:border-cyan-500/40" : "bg-white hover:bg-slate-50 border-black/10 hover:border-cyan-500/40 shadow-sm hover:shadow-md")}>
              <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/15 border-cyan-500/30" : "bg-cyan-50 border-cyan-200")}>
                <ChevronLeft className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xs mb-0.5 font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Previous episode</p>
                <p className={cn("text-sm font-bold transition-colors line-clamp-1", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{prev.title}</p>
              </div>
            </Link>
          ) : <div />}
          {next && (
            <Link href={`/series/${slug}/${next.slug}`}
              className={cn("group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 sm:flex-row-reverse sm:text-right", isDark ? "bg-white/[0.06] hover:bg-white/[0.10] border-white/20 hover:border-cyan-500/40" : "bg-white hover:bg-slate-50 border-black/10 hover:border-cyan-500/40 shadow-sm hover:shadow-md")}>
              <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/15 border-cyan-500/30" : "bg-cyan-50 border-cyan-200")}>
                <ChevronRight className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs mb-0.5 font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Next episode</p>
                <p className={cn("text-sm font-bold transition-colors line-clamp-1", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{next.title}</p>
              </div>
            </Link>
          )}
        </div>

      </div>
        </div>
    </div>
    </>
  );
}
