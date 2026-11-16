import { NextResponse } from 'next/server';
import { AI_CORS_HEADERS, aiGatewayOptionsResponse } from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiGatewayOptionsResponse();
}

export async function GET() {
  return NextResponse.json(
    { status: 'ok', service: 'masdika-ai-gateway' },
    { status: 200, headers: AI_CORS_HEADERS }
  );
}
