import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedOpportunities = unstable_cache(
  async (type: string | null) => {
    const whereClause: any = {
      status: 'PUBLISHED'
    };

    if (type) {
      whereClause.type = type;
    }

    return prisma.opportunity.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
  },
  ['opportunities-list'],
  { revalidate: 60, tags: ['opportunities'] }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const opportunities = await getCachedOpportunities(type);
    
    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
