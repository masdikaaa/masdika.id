import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { getAiGatewayConfig, syncAiModelsFromUpstream } from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

async function runSync(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getAiGatewayConfig();
    if (!config.enabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'AI Gateway is disabled.',
      });
    }

    if (!config.upstreamKey && !config.managementKey) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Master Upstream AI Key or Management API Key is not configured yet.',
      });
    }

    const result = await syncAiModelsFromUpstream();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Sync failed' },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return runSync(req);
}

export async function POST(req: Request) {
  return runSync(req);
}
