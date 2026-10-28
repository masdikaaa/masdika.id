import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { getCachedData } from "@/lib/cache";
import { SeriesDetailClient } from "./SeriesDetailClient";

export const dynamic = "force-dynamic";

const fetchSeriesDetails = async (slug: string) => {
  const series = await prisma.series.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      image: true,
      level: true,
      tags: true,
      published: true,
      createdAt: true,
      episodes: {
        where: { published: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          image: true,
          videoUrl: true,
          order: true,
          published: true,
          createdAt: true,
        },
      },
    },
  });

  if (!series || !series.published) {
    return null;
  }

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
    ...series,
    createdAt: series.createdAt.toISOString(),
    episodes: series.episodes.map((ep) => ({
      ...ep,
      createdAt: ep.createdAt.toISOString(),
    })),
    adminName,
    adminImage: profileImageSetting?.value || null,
  };
};

async function getSeriesDetails(slug: string) {
  return getCachedData(`series:${slug}`, 300, () => fetchSeriesDetails(slug));
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getSeriesDetails(slug);

  if (!series) notFound();

  return <SeriesDetailClient initialSeries={series} slug={slug} />;
}
