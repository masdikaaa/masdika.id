import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    message: 'Abuse monitor automated locking is deprecated and disabled in favor of Admin Resource Finding.',
    active: false,
  });
}

