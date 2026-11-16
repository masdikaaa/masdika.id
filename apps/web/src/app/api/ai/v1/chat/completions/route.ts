import { NextRequest } from 'next/server';
import { handleAiProxyRequest } from '@/lib/ai-proxy-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return handleAiProxyRequest(req, 'openai');
}
