import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import SeriesClient, { SeriesItem } from "./SeriesClient";
import { getCachedData } from "@/lib/cache";
import { PremiumLoader } from "@/components/ui/PremiumLoader";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Learning Series",
  description: "Structured learning series covering networking, cloud infrastructure, DevOps, and Linux systems.",
};

async function fetchSeries(): Promise<SeriesItem[]> {
  try {
    const seriesList = await prisma.series.findMany({
      where: { published: true },
      include: {
        episodes: {
          where: { published: true },
          select: { id: true, slug: true, title: true, order: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return seriesList.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching learning series:", error);
    return [];
  }
}

async function getSeries(): Promise<SeriesItem[]> {
  return getCachedData('series:series_page', 300, fetchSeries);
}

export default async function SeriesPage() {
  const series = await getSeries();

  return (
    <Suspense fallback={<PremiumLoader />}>
      <SeriesClient initialSeries={series} />
    </Suspense>
  );
}
