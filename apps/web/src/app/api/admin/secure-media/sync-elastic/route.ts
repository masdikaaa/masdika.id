import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { syncAllMediaToElastic } from '@/lib/sync-elasticsearch';

export async function POST() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const result = await syncAllMediaToElastic();
    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${result.count} media items to Elasticsearch`,
      count: result.count
    });
  } catch (error) {
    console.error('Error syncing media to Elasticsearch:', error);
    return NextResponse.json({ error: 'Failed to sync media to Elasticsearch' }, { status: 500 });
  }
}

