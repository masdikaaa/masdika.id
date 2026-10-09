import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import path from "path";

async function getOgImage(imageUrl: string | null | undefined): Promise<string> {
  if (!imageUrl) return "/og-image.webp";
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default || sharpModule;
    if (imageUrl.startsWith("/")) {
      const imgPath = path.join(process.cwd(), "public", imageUrl);
      const meta = await sharp(imgPath).metadata();
      const ratio = (meta.width || 1) / (meta.height || 1);
      return ratio > 1.7 ? imageUrl : "/og-image.webp";
    } else {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(3000) });
      const buffer = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buffer).metadata();
      const ratio = (meta.width || 1) / (meta.height || 1);
      return ratio > 1.7 ? imageUrl : "/og-image.webp";
    }
  } catch {
    return "/og-image.webp";
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; episodeSlug: string }> }
): Promise<Metadata> {
  const { slug, episodeSlug } = await params;

  try {
    const series = await prisma.series.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });

    if (!series) return { title: "Episode Not Found" };

    const episode = await prisma.episode.findFirst({
      where: { seriesId: series.id, slug: episodeSlug },
      select: { title: true, excerpt: true, image: true, order: true },
    });

    if (!episode) return { title: "Episode Not Found" };

    // Use episode image first, fallback to series image, fallback to og-image.webp
    const seriesFull = await prisma.series.findUnique({
      where: { slug },
      select: { image: true },
    });

    const rawImage = episode.image || seriesFull?.image || null;
    const ogImage = await getOgImage(rawImage);

    const epTitle = `${episode.title} - ${series.title}`;
    const description = episode.excerpt
      ? episode.excerpt.length > 160
        ? episode.excerpt.substring(0, 160) + "..."
        : episode.excerpt
      : `Episode ${episode.order + 1} of the ${series.title} series.`;

    return {
      title: epTitle,
      description,
      openGraph: {
        title: epTitle,
        description,
        images: [{ url: ogImage }],
      },
      twitter: {
        card: "summary_large_image",
        title: epTitle,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return { title: "Episode" };
  }
}

export default function EpisodeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
