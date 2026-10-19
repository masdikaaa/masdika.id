import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedData } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const fetchSeries = () =>
  prisma.series.findMany({
    where: { published: true },
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
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

export async function GET() {
  try {
    const series = await getCachedData('series:list', 300, fetchSeries);
    return NextResponse.json(series, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
