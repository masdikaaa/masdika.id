import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureResumeDataSyncedToDb } from '@/lib/resume-data-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureResumeDataSyncedToDb();
    const certs = await prisma.certification.findMany({
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(certs);
  } catch (error) {
    console.error('Error fetching certifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
