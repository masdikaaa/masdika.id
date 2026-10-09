import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { decryptDeterministic } from '@/lib/encryption';
import path from 'path';
import { unlink } from 'fs/promises';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      include: {
        apiKeys: true,
        shortLinks: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedData = users.map(user => {
      const totalUsage = user.apiKeys.reduce((acc: number, key: any) => acc + key.usageCount, 0);
      const lastUsedKey = [...user.apiKeys].sort((a: any, b: any) => {
        if (!a.lastUsed) return 1;
        if (!b.lastUsed) return -1;
        return b.lastUsed.getTime() - a.lastUsed.getTime();
      })[0];

      return {
        id: user.id,
        name: user.name ? decryptDeterministic(user.name) : "Unknown",
        email: user.email ? decryptDeterministic(user.email) : "",
        totalUsage,
        lastUsed: lastUsedKey ? lastUsedKey.lastUsed : null,
        keyCount: user.apiKeys.length,
        shortLinkCount: user.shortLinks.length,
        apiKeys: user.apiKeys.map((k: any) => ({
          name: k.name || "Default Key",
          key: k.key
        }))
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching admin api hub data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify user is a customer, NOT an admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot delete an ADMIN account' }, { status: 403 });
    }

    // Delete all API keys associated with the user
    await prisma.apiKey.deleteMany({
      where: { userId }
    });

    // Delete all Short Links associated with the user
    await prisma.shortLink.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ success: true, message: 'Customer API keys and short links deleted successfully' });
  } catch (error) {
    console.error('Error deleting api hub user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
