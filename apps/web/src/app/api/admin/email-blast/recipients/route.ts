import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        email: true,
        name: true,
        isSuspended: true,
        _count: {
          select: {
            vpsServices: true,
            subscriptions: true,
            invoices: true
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    const decryptedUsers = users.map(u => ({
      id: u.id,
      email: decryptDeterministic(u.email),
      name: decryptDeterministic(u.name),
      isSuspended: u.isSuspended,
      vpsCount: u._count.vpsServices,
      activeServices: u._count.vpsServices + u._count.subscriptions
    }));

    const totalCustomers = decryptedUsers.length;
    const vpsCustomers = decryptedUsers.filter(u => u.vpsCount > 0).length;

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers,
        vpsCustomers,
        customers: decryptedUsers
      }
    });
  } catch (error) {
    console.error('Get Email Blast Recipients Error:', error);
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
  }
}
