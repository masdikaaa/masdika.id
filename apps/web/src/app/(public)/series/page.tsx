import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import SeriesClient from "./SeriesClient";

export const metadata: Metadata = {
  title: 'Learning Series',
  description: 'Structured learning series covering networking, cloud, DevOps, and more.',
};

export default async function SeriesPage() {
  const seriesList = await prisma.series.findMany({
    where: { published: true },
    include: { episodes: true },
    orderBy: { createdAt: 'desc' }
  });

  return <SeriesClient initialSeries={seriesList} />;
}
