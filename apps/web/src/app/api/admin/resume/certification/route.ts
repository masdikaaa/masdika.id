import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const certs = await prisma.certification.findMany({
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(certs);
  } catch (error) {
    console.error('Error fetching certifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { title, org, date, icon } = body;

    const count = await prisma.certification.count();

    const cert = await prisma.certification.create({
      data: {
        title,
        org,
        date,
        icon,
        order: count
      }
    });

    return NextResponse.json(cert);
  } catch (error) {
    console.error('Error creating certification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
