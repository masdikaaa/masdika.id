import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { ensureResumeDataSyncedToDb } from '@/lib/resume-data-sync';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await ensureResumeDataSyncedToDb();
    const educations = await prisma.education.findMany({
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(educations);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { year, degree, school, type, description, tags } = body;
    const count = await prisma.education.count();
    const newEdu = await prisma.education.create({
      data: {
        year,
        degree,
        school,
        type: type || null,
        description: description || null,
        tags: tags || null,
        order: count,
      },
    });
    return NextResponse.json(newEdu);
  } catch (error) {
    console.error('Error creating education:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
