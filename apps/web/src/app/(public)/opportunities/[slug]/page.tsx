import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import path from "path";
import { OpportunityDetailContent } from "./OpportunityDetailContent";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  let opportunity;
  const parsedId = parseInt(slug);
  if (!isNaN(parsedId)) {
    opportunity = await prisma.opportunity.findFirst({
      where: { OR: [{ id: parsedId }, { slug }] }
    });
  } else {
    opportunity = await prisma.opportunity.findUnique({
      where: { slug }
    });
  }

  if (!opportunity) return { title: "Not Found" };

  // Cek apakah gambar persegi, kalau iya pakai og-image.webp
  let ogImage = ['/og-image.webp'];
  if (opportunity.image) {
    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      // Untuk gambar lokal (dari /uploads/*)
      if (opportunity.image.startsWith('/')) {
        const imgPath = path.join(process.cwd(), 'public', opportunity.image);
        const meta = await sharp(imgPath).metadata();
        const ratio = (meta.width || 1) / (meta.height || 1);
        // Kalau landscape (ratio > 1.3), pakai gambar asli. Kalau persegi/portrait, pakai og-image.
        ogImage = ratio > 1.3 ? [opportunity.image] : ['/og-image.webp'];
      } else {
        // Untuk gambar external (URL), fetch lalu cek dimensi
        const res = await fetch(opportunity.image, { signal: AbortSignal.timeout(3000) });
        const buffer = Buffer.from(await res.arrayBuffer());
        const meta = await sharp(buffer).metadata();
        const ratio = (meta.width || 1) / (meta.height || 1);
        ogImage = ratio > 1.3 ? [opportunity.image] : ['/og-image.webp'];
      }
    } catch {
      // Kalau gagal cek dimensi, fallback ke og-image.webp
      ogImage = ['/og-image.webp'];
    }
  }

  const cleanDescription = opportunity.description?.replace(/\r?\n|\r/g, ' ').trim() || '';
  const metaDescription = cleanDescription.length > 160 ? cleanDescription.substring(0, 160) + "..." : cleanDescription;

  return {
    title: opportunity.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim(),
    description: metaDescription,
    openGraph: {
      title: opportunity.title,
      description: metaDescription,
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: opportunity.title,
      description: metaDescription,
      images: ogImage,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let opportunity;
  const parsedId = parseInt(slug);
  if (!isNaN(parsedId)) {
    opportunity = await prisma.opportunity.findFirst({
      where: { OR: [{ id: parsedId }, { slug }] }
    });
  } else {
    opportunity = await prisma.opportunity.findUnique({
      where: { slug }
    });
  }

  if (!opportunity) {
    notFound();
  }

  return <OpportunityDetailContent opportunity={opportunity} />;
}
