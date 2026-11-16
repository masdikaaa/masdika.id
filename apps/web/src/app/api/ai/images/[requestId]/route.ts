import { NextRequest, NextResponse } from 'next/server';
import { getAiGatewayConfig } from '@/lib/ai-gateway';
import {
  AI_MGMT_CORS_HEADERS,
  aiMgmtError,
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  const { requestId } = await context.params;
  if (!requestId) {
    return aiMgmtError('NOT_FOUND', 'Image generation request not found.', 404);
  }

  const config = await getAiGatewayConfig();
  if (!config.enabled || !config.upstreamKey) {
    return aiMgmtError('SERVICE_UNAVAILABLE', 'Image generation is temporarily unavailable.', 503);
  }

  try {
    const res = await fetch(`${config.upstreamUrl}/v1/images/generations/${encodeURIComponent(requestId)}`, {
      headers: {
        authorization: `Bearer ${config.upstreamKey}`,
        'x-api-key': config.upstreamKey,
      },
      cache: 'no-store',
    });

    if (res.status === 404) {
      return aiMgmtError('NOT_FOUND', `Image request '${requestId}' not found.`, 404);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      return aiMgmtError('UPSTREAM_ERROR', data?.error?.message || 'Upstream image fetch failed.', 502);
    }

    return aiMgmtSuccess(data);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_ERROR', message: 'Upstream image service unreachable.' } },
      { status: 502, headers: AI_MGMT_CORS_HEADERS },
    );
  }
}
