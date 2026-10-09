import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    
    const logs = await prisma.loginLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching login logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids, ipAddress } = body;

    if (ipAddress) {
      // Unban IP if requested
      await prisma.blockedUser.deleteMany({
        where: { type: 'IP', value: ipAddress }
      });
      // Optionally update the logs to reflect it's no longer banned?
      // Since it's a historical log, we can just leave it or update it.
      await prisma.loginLog.updateMany({
        where: { ipAddress: ipAddress, isBanned: true },
        data: { isBanned: false }
      });
      return NextResponse.json({ success: true, message: `IP ${ipAddress} unbanned` });
    }

    if (ids && Array.isArray(ids)) {
      await prisma.loginLog.deleteMany({
        where: { id: { in: ids } }
      });
      return NextResponse.json({ success: true, message: 'Logs deleted' });
    }

    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error managing login logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
