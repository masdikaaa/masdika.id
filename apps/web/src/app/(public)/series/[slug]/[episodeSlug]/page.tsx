import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, BookOpen, CheckCircle } from "lucide-react";
import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { prisma } from "@/lib/prisma";
import { getCachedData } from "@/lib/cache";
import { decryptDeterministic } from "@/lib/encryption";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

function MarkdownContent({ content }: { content: string }) {
  const parts = content.split(/```/);
  return (
    <div className="w-full max-w-none font-sans break-words prose dark:prose-invert text-[var(--text-secondary)]">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const match = part.match(/^([^\n]*)\n([\s\S]*)$/);
          const langOrTitle = match ? match[1].trim() : "";
          const code = match ? match[2] : part;
          const lower = langOrTitle.toLowerCase();
          let language = "bash";
          if (lower.includes("php")) language = "php";
          else if (lower.includes("js") || lower.includes("jsx")) language = "javascript";
          else if (lower.includes("ts") || lower.includes("tsx")) language = "typescript";
          else if (lower.includes("yaml") || lower.includes("yml")) language = "yaml";
          else if (lower.includes("html")) language = "html";
          else if (lower.includes("css")) language = "css";
          else if (lower.includes("json")) language = "json";
          else if (lower.includes("sh") || lower.includes("bash")) language = "bash";
          else if (langOrTitle) language = lower;
          return (
            <div key={index} className="not-prose my-6 sm:my-8">
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
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1, 12);
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.has("v")) {
        return u.searchParams.get("v")?.slice(0, 11) || null;
      }
      if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/v/")) {
        return u.pathname.split("/")[2]?.slice(0, 11) || null;
      }
    }
  } catch {}

  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function fetchEpisodeData(slug: string, episodeSlug: string) {
  const series = await prisma.series.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
      episodes: {
        where: { published: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          content: true,
          image: true,
          videoUrl: true,
          order: true,
          published: true,
          createdAt: true,
        },
      },
    },
  });

  if (!series || !series.published) return null;

  const episodeIdx = series.episodes.findIndex((e) => e.slug === episodeSlug);
  if (episodeIdx === -1) return null;

  const episode = series.episodes[episodeIdx];
  const prev =
    episodeIdx > 0
      ? {
          id: series.episodes[episodeIdx - 1].id,
          slug: series.episodes[episodeIdx - 1].slug,
          title: series.episodes[episodeIdx - 1].title,
          order: series.episodes[episodeIdx - 1].order,
        }
      : null;
  const next =
    episodeIdx < series.episodes.length - 1
      ? {
          id: series.episodes[episodeIdx + 1].id,
          slug: series.episodes[episodeIdx + 1].slug,
          title: series.episodes[episodeIdx + 1].title,
          order: series.episodes[episodeIdx + 1].order,
        }
      : null;

  const { episodes: _, ...seriesForClient } = series;

  const settings = await prisma.setting.findMany({
    where: { key: "profileImage" },
  });
  const profileImageSetting = settings.find((s) => s.key === "profileImage");

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { id: "asc" },
  });
  let adminName = "Masdika.ID";
  if (adminUser && adminUser.name) {
    try {
      adminName = decryptDeterministic(adminUser.name);
    } catch {
      adminName = adminUser.name;
    }
  }

  return {
    episode: {
      ...episode,
      createdAt: episode.createdAt.toISOString(),
    },
    series: seriesForClient,
    prev,
    next,
    totalEpisodes: series.episodes.length,
    adminName,
    adminImage: profileImageSetting?.value || null,
  };
}

async function getEpisodeData(slug: string, episodeSlug: string) {
  return getCachedData(`episode:${slug}:${episodeSlug}`, 300, () =>
    fetchEpisodeData(slug, episodeSlug)
  );
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string; episodeSlug: string }>;
}) {
  const { slug, episodeSlug } = await params;
  const data = await getEpisodeData(slug, episodeSlug);

  if (!data) notFound();

  const { episode, series, prev, next, totalEpisodes, adminName, adminImage } = data;
  const ytId = episode.videoUrl ? getYouTubeId(episode.videoUrl) : null;

  const headings: { id: string; text: string; level: number }[] = [];
  const regex = /^(#{2,3})\s+(.*)$/gm;
  let m;
  while ((m = regex.exec(episode.content)) !== null) {
    const level = m[1].length;
    const text = m[2].trim().replace(/[*`_~]/g, "");
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    headings.push({ id, text, level });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.masdika.id";
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
        <div className="pt-28 md:pt-32 pb-16 sm:pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={`/series/${slug}`}
            className="inline-flex items-center text-sm font-medium mb-6 sm:mb-8 transition-colors gap-2 group text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-[var(--surface)] border border-[var(--border-primary)] group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/10 group-hover:border-cyan-300 dark:group-hover:border-cyan-500/30">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            Back to {series.title}
          </Link>

          {/* Episode Header */}
          <header className="mb-8 sm:mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-5 text-sm">
              <Badge variant="brand" size="sm" className="font-mono uppercase font-bold">
                Episode {episode.order + 1} / {totalEpisodes}
              </Badge>
              <span className="w-1 h-1 rounded-full mx-1 hidden sm:block bg-[var(--border-primary)]" />
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                {adminImage ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={adminImage}
                    alt={adminName}
                    className="w-6 h-6 rounded-full object-cover border border-cyan-500/30"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-xs bg-gradient-to-br from-cyan-500 to-cyan-600">
                    {(adminName || "A")[0]}
                  </div>
                )}
                <span className="font-medium text-cyan-600 dark:text-cyan-400">{adminName}</span>
              </div>
              <span className="w-1 h-1 rounded-full mx-1 hidden sm:block bg-[var(--border-primary)]" />
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs sm:text-sm">
                <Calendar className="w-4 h-4" />
                {new Date(episode.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.12] mb-4 text-[var(--text-primary)]"
              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {episode.title}
            </h1>
            {episode.excerpt && (
              <p className="text-base sm:text-lg leading-relaxed text-[var(--text-secondary)] font-normal">
                {episode.excerpt}
              </p>
            )}
          </header>

          {/* YouTube Embed */}
          {ytId && (
            <div className="relative w-full rounded-2xl overflow-hidden border mb-8 sm:mb-10 aspect-video border-[var(--border-primary)] bg-slate-100 dark:bg-[var(--surface-secondary)] shadow-sm dark:shadow-2xl dark:shadow-black/60">
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
          {!ytId && episode.image && (
            <div className="w-full aspect-[1730/909] rounded-2xl overflow-hidden border mb-8 sm:mb-10 border-[var(--border-primary)] bg-slate-100 dark:bg-[var(--surface-secondary)] shadow-sm dark:shadow-2xl dark:shadow-black/60">
              <img
                referrerPolicy="no-referrer"
                src={episode.image}
                alt={episode.title}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          )}

          {/* Table of Contents */}
          {headings.length > 0 && (
            <details className="backdrop-blur-sm border p-5 sm:p-6 rounded-2xl mb-8 sm:mb-10 group shadow-sm bg-[var(--surface)] border-[var(--border-primary)]">
              <summary className="text-base font-bold flex items-center gap-2 cursor-pointer list-none select-none outline-none text-[var(--text-primary)]">
                <span className="w-1.5 h-5 bg-cyan-500 rounded-full" />
                Table of Contents
                <span className="ml-auto w-7 h-7 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <ul className="mt-4 pt-4 border-t space-y-2 border-[var(--border-primary)]">
                {headings.map((h, i) => (
                  <li key={i} className={h.level === 3 ? "ml-4" : ""}>
                    <a
                      href={`#${h.id}`}
                      className="text-sm transition-colors text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Content */}
          {episode.content && (
            <article className="w-full mb-10 sm:mb-12" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              <MarkdownContent content={episode.content} />
            </article>
          )}

          {/* Prev / Next Navigation */}
          {prev || next ? (
            <div className="pt-8 sm:pt-10 border-t border-[var(--border-primary)] grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prev ? (
                <Link
                  href={`/series/${slug}/${prev.slug}`}
                  className="group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border-[var(--border-primary)] hover:border-cyan-500/40 shadow-sm hover:shadow-md dark:shadow-xl dark:shadow-black/40"
                >
                  <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs mb-0.5 font-medium text-[var(--text-muted)] font-mono">Previous episode</p>
                    <p className="text-sm font-bold transition-colors line-clamp-1 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      {prev.title}
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/series/${slug}`}
                  className="group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border-[var(--border-primary)] hover:border-cyan-500/40 shadow-sm hover:shadow-md dark:shadow-xl dark:shadow-black/40"
                >
                  <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs mb-0.5 font-medium text-[var(--text-muted)] font-mono">Course Syllabus</p>
                    <p className="text-sm font-bold transition-colors line-clamp-1 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      Back to {series.title}
                    </p>
                  </div>
                </Link>
              )}
              {next ? (
                <Link
                  href={`/series/${slug}/${next.slug}`}
                  className="group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 sm:flex-row-reverse sm:text-right bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border-[var(--border-primary)] hover:border-cyan-500/40 shadow-sm hover:shadow-md dark:shadow-xl dark:shadow-black/40"
                >
                  <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs mb-0.5 font-medium text-[var(--text-muted)] font-mono">Next episode</p>
                    <p className="text-sm font-bold transition-colors line-clamp-1 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      {next.title}
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/series/${slug}`}
                  className="group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 sm:flex-row-reverse sm:text-right bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border-[var(--border-primary)] hover:border-cyan-500/40 shadow-sm hover:shadow-md dark:shadow-xl dark:shadow-black/40"
                >
                  <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs mb-0.5 font-medium text-[var(--text-muted)] font-mono">Series Syllabus</p>
                    <p className="text-sm font-bold transition-colors line-clamp-1 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      Course Completed
                    </p>
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="pt-8 sm:pt-10 border-t border-[var(--border-primary)]">
              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-cyan-500/40 transition-all duration-300">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      Course Overview
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                    {series.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
                    You are viewing Episode {episode.order + 1} of {totalEpisodes}. Browse other modules or return to the complete syllabus.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  href={`/series/${slug}`}
                  leftIcon={<ChevronLeft className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  View All Episodes
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
