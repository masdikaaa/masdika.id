import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const setting = await prisma.setting.findUnique({
      where: { key: 'ADMIN_CHAT_STATUS' }
    });

    return NextResponse.json({
      status: setting?.value || 'OFFLINE'
    });
  } catch (error) {
    console.error('Error fetching admin chat status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { status } = await req.json();
    if (status !== 'ONLINE' && status !== 'OFFLINE') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await prisma.setting.upsert({
      where: { key: 'ADMIN_CHAT_STATUS' },
      update: { value: status },
      create: { key: 'ADMIN_CHAT_STATUS', value: status },
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Error updating admin chat status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
