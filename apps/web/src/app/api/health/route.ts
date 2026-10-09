import { NextResponse } from 'next/server';

/**
 * Lightweight health check endpoint for Docker container health monitoring.
 * This simply confirms the Next.js server is alive and responding.
 * No database or external service checks — those should be separate readiness probes.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
