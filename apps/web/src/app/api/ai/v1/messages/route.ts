import { NextRequest } from 'next/server';
import { aiGatewayOptionsResponse } from '@/lib/ai-gateway';
import { handleAiProxyRequest } from '@/lib/ai-proxy-handler';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiGatewayOptionsResponse();
}

export async function POST(req: NextRequest) {
  return handleAiProxyRequest(req, 'anthropic');
}
