import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Lightweight health check endpoint for Docker container health monitoring.
 * This simply confirms the Next.js server is alive and responding.
 * No database or external service checks — those should be separate readiness probes.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}
