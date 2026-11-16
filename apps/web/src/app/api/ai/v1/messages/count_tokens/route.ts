import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  aiGatewayError,
  authenticateAiGatewayKey,
  getAiGatewayConfig,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const auth = await authenticateAiGatewayKey(req, requestId);
  if ('error' in auth && auth.error) return auth.error;

  const config = await getAiGatewayConfig();
  if (!config.enabled || !config.upstreamKey) {
    return aiGatewayError('AI Gateway is currently unavailable.', 'upstream_unavailable', 503, requestId);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return aiGatewayError('Invalid JSON request body.', 'invalid_request_error', 400, requestId);
  }

  try {
    const res = await fetch(`${config.upstreamUrl}/v1/messages/count_tokens`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.upstreamKey}`,
        'x-api-key': config.upstreamKey,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
        'x-request-id': requestId,
      },
    });
  } catch {
    return aiGatewayError('Upstream AI provider is unreachable.', 'upstream_unavailable', 503, requestId);
  }
}
