import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { syncAllTicketsToElastic } from '@/lib/sync-elasticsearch';

export async function POST() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const result = await syncAllTicketsToElastic();
    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${result.count} tickets to Elasticsearch`,
      count: result.count
    });
  } catch (error) {
    console.error('Error syncing tickets to Elasticsearch:', error);
    return NextResponse.json({ error: 'Failed to sync tickets to Elasticsearch' }, { status: 500 });
  }
}

