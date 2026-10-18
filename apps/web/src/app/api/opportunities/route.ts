import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedData } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const fetchOpportunities = (type: string | null) => {
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
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const cacheKey = `opportunities:list:${type || 'all'}`;

    const opportunities = await getCachedData(cacheKey, 300, () => fetchOpportunities(type));
    
    return NextResponse.json(opportunities, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
