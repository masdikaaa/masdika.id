import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { ensureResumeDataSyncedToDb } from '@/lib/resume-data-sync';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await ensureResumeDataSyncedToDb();
    const experiences = await prisma.experience.findMany({
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(experiences);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { year, role, company, type, description, tags } = body;
    const count = await prisma.experience.count();
    const newExp = await prisma.experience.create({
      data: {
        year,
        role,
        company,
        type: type || null,
        description: description || null,
        tags: tags || null,
        order: count,
      },
    });
    return NextResponse.json(newExp);
  } catch (error) {
    console.error('Error creating experience:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
