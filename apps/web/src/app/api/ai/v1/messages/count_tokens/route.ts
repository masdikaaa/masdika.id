import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  AI_CORS_HEADERS,
  aiGatewayError,
  aiGatewayOptionsResponse,
  authenticateAiGatewayKey,
  estimatePromptTokensFromBody,
  getAiGatewayConfig,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiGatewayOptionsResponse();
}

export async function POST(req: NextRequest) {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const auth = await authenticateAiGatewayKey(req, requestId, 'anthropic');
  if ('error' in auth && auth.error) return auth.error;

  const config = await getAiGatewayConfig();
  if (!config.enabled || !config.upstreamKey) {
    return aiGatewayError(
      'AI Gateway is currently unavailable.',
      'upstream_unavailable',
      503,
      requestId,
      'anthropic'
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return aiGatewayError(
      'Invalid JSON request body.',
      'invalid_request',
      400,
      requestId,
      'anthropic'
    );
  }

  try {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${config.upstreamKey}`,
      'x-api-key': config.upstreamKey,
      'anthropic-version': req.headers.get('anthropic-version') || '2023-06-01',
    };
    const anthropicBeta = req.headers.get('anthropic-beta');
    if (anthropicBeta) headers['anthropic-beta'] = anthropicBeta;

    const res = await fetch(`${config.upstreamUrl}/v1/messages/count_tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: {
          ...AI_CORS_HEADERS,
          'content-type': res.headers.get('content-type') || 'application/json',
          'x-request-id': requestId,
          'x-masdika-estimate': 'true',
        },
      });
    }

    // Fallback local estimate if upstream count_tokens fails
    return NextResponse.json(
      { input_tokens: estimatePromptTokensFromBody(body) },
      {
        status: 200,
        headers: {
          ...AI_CORS_HEADERS,
          'x-request-id': requestId,
          'x-masdika-estimate': 'true',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { input_tokens: estimatePromptTokensFromBody(body) },
      {
        status: 200,
        headers: {
          ...AI_CORS_HEADERS,
          'x-request-id': requestId,
          'x-masdika-estimate': 'true',
        },
      }
    );
  }
}
