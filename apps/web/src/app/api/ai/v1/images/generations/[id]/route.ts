import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  AI_CORS_HEADERS,
  aiGatewayError,
  aiGatewayOptionsResponse,
  authenticateAiGatewayKey,
  getAiGatewayConfig,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiGatewayOptionsResponse();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const auth = await authenticateAiGatewayKey(req, requestId, 'openai');
  if ('error' in auth && auth.error) return auth.error;

  const config = await getAiGatewayConfig();
  if (!config.enabled || !config.upstreamKey) {
    return aiGatewayError('AI Gateway is currently unavailable.', 'upstream_unavailable', 503, requestId);
  }

  try {
    const res = await fetch(`${config.upstreamUrl}/v1/images/generations/${encodeURIComponent(id)}`, {
      headers: {
        authorization: `Bearer ${config.upstreamKey}`,
        'x-api-key': config.upstreamKey,
      },
      cache: 'no-store',
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        ...AI_CORS_HEADERS,
        'content-type': res.headers.get('content-type') || 'application/json',
        'x-request-id': requestId,
      },
    });
  } catch {
    return aiGatewayError('Upstream AI provider is unreachable.', 'upstream_unreachable', 502, requestId);
  }
}
