import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        balance: true,
        isSuspended: true,
        suspendReason: true,
        createdAt: true,
        lastActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const decryptedUsers = users.map(u => ({
      ...u,
      email: decryptDeterministic(u.email),
      name: u.name ? decryptDeterministic(u.name) : u.name
    }));

    return NextResponse.json({ success: true, data: decryptedUsers });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
