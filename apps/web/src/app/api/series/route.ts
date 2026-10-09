import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedSeries = unstable_cache(
  async () => {
    return prisma.series.findMany({
      where: { published: true },
      // Only select fields needed for the listing card — skip large TEXT fields
      select: {
        id:          true,
        slug:        true,
        title:       true,
        description: true,
        image:       true,
        level:       true,
        tags:        true,
        createdAt:   true,
        episodes: {
          where:  { published: true },
          select: { id: true },        // count only
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  ['series-list'],
  { revalidate: 60, tags: ['series'] }
);

export async function GET() {
  try {
    const series = await getCachedSeries();
    return NextResponse.json(series);
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
