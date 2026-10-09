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
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const series = await prisma.series.findUnique({
      where: { slug },
      select: { title: true, description: true, image: true, level: true, tags: true },
    });

    if (!series) return { title: "Series Not Found" };

    const ogImage = await getOgImage(series.image);
    const description = series.description.length > 160
      ? series.description.substring(0, 160) + "..."
      : series.description;

    const tagsList = series.tags ? ` • ${series.tags}` : "";
    const fullTitle = `${series.title} - ${series.level} Series`;

    return {
      title: fullTitle,
      description: description || `${series.level} learning series${tagsList}.`,
      openGraph: {
        title: fullTitle,
        description: description,
        images: [{ url: ogImage }],
      },
      twitter: {
        card: "summary_large_image",
        title: fullTitle,
        description: description,
        images: [ogImage],
      },
    };
  } catch {
    return { title: "Series" };
  }
}

export default function SeriesDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
