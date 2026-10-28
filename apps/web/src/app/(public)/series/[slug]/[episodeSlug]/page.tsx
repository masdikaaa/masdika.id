import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { prisma } from "@/lib/prisma";
import { getCachedData } from "@/lib/cache";
import { decryptDeterministic } from "@/lib/encryption";

export const dynamic = "force-dynamic";

function MarkdownContent({ content }: { content: string }) {
  const parts = content.split(/```/);
  return (
    <div className="w-full max-w-none font-sans break-words prose dark:prose-invert text-slate-700 dark:text-zinc-300">
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
        <div className="pt-28 md:pt-32 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={`/series/${slug}`}
            className="inline-flex items-center text-sm font-medium mb-8 transition-colors gap-2 group text-slate-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/10 group-hover:border-cyan-200 dark:group-hover:border-cyan-500/30">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            Back to {series.title}
          </Link>

          {/* Episode Header */}
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
              <span className="px-3 py-1.5 rounded-full border text-xs font-bold bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20">
                Episode {episode.order + 1} / {totalEpisodes}
              </span>
              <span className="w-1 h-1 rounded-full mx-1 hidden sm:block bg-black/10 dark:bg-white/20" />
              <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                {adminImage ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={adminImage}
                    alt={adminName}
                    className="w-6 h-6 rounded-full object-cover border border-cyan-200 dark:border-cyan-500/30"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-xs border bg-cyan-600 dark:bg-gradient-to-br dark:from-cyan-500 dark:to-cyan-600 border-cyan-200 dark:border-cyan-500/30">
                    {(adminName || "A")[0]}
                  </div>
                )}
                <span className="font-medium text-cyan-600/80 dark:text-cyan-500/80">{adminName}</span>
              </div>
              <span className="w-1 h-1 rounded-full mx-1 hidden sm:block bg-black/10 dark:bg-white/20" />
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                <Calendar className="w-4 h-4" />
                {new Date(episode.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold mb-4 sm:mb-6 leading-snug sm:leading-tight break-words text-slate-900 dark:text-white"
              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {episode.title}
            </h1>
            {episode.excerpt && (
              <p className="text-base leading-7 text-slate-600 dark:text-zinc-400">{episode.excerpt}</p>
            )}
          </header>

          {/* YouTube Embed */}
          {ytId && (
            <div className="relative w-full rounded-2xl overflow-hidden border mb-10 aspect-video border-black/5 dark:border-[var(--border-primary)] bg-slate-100 dark:bg-[var(--surface-secondary)]">
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
            <div className="w-full aspect-[1730/909] rounded-2xl overflow-hidden border mb-10 border-black/5 dark:border-[var(--border-primary)] bg-slate-100 dark:bg-[var(--surface-secondary)]">
              <img
                referrerPolicy="no-referrer"
                src={episode.image}
                alt={episode.title}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}

          {/* Table of Contents */}
          {headings.length > 0 && (
            <details className="backdrop-blur-sm border p-5 rounded-2xl mb-10 group shadow-sm dark:shadow-xl dark:shadow-black/40 bg-white dark:bg-[var(--surface)] border-black/5 dark:border-[var(--border-primary)]">
              <summary className="text-base font-bold flex items-center gap-2 cursor-pointer list-none select-none outline-none text-slate-900 dark:text-white">
                <span className="w-1.5 h-5 bg-cyan-500 rounded-full" />
                Table of Contents
                <span className="ml-auto w-7 h-7 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <ul className="mt-4 pt-4 border-t space-y-2 border-black/5 dark:border-slate-800">
                {headings.map((h, i) => (
                  <li key={i} className={h.level === 3 ? "ml-4" : ""}>
                    <a
                      href={`#${h.id}`}
                      className="text-sm transition-colors text-slate-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Content */}
          <article className="w-full" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
            <MarkdownContent content={episode.content} />
          </article>

          {/* Prev / Next Navigation */}
          <div className="mt-16 pt-10 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 border-black/5 dark:border-slate-800">
            {prev ? (
              <Link
                href={`/series/${slug}/${prev.slug}`}
                className="group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 bg-white dark:bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-[#121212] border-black/10 dark:border-[var(--border-primary)] hover:border-cyan-500/40 dark:hover:border-cyan-500/50 shadow-sm hover:shadow-md dark:shadow-xl dark:shadow-black/40"
              >
                <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-cyan-50 dark:bg-cyan-500/15 border-cyan-200 dark:border-cyan-500/30">
                  <ChevronLeft className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs mb-0.5 font-medium text-slate-500 dark:text-zinc-400">Previous episode</p>
                  <p className="text-sm font-bold transition-colors line-clamp-1 text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                    {prev.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next && (
              <Link
                href={`/series/${slug}/${next.slug}`}
                className="group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 sm:flex-row-reverse sm:text-right bg-white dark:bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-[#121212] border-black/10 dark:border-[var(--border-primary)] hover:border-cyan-500/40 dark:hover:border-cyan-500/50 shadow-sm hover:shadow-md dark:shadow-xl dark:shadow-black/40"
              >
                <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-cyan-50 dark:bg-cyan-500/15 border-cyan-200 dark:border-cyan-500/30">
                  <ChevronRight className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs mb-0.5 font-medium text-slate-500 dark:text-zinc-400">Next episode</p>
                  <p className="text-sm font-bold transition-colors line-clamp-1 text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                    {next.title}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
