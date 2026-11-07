import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { decryptDeterministic } from '@/lib/encryption';

const API_HUB_SERVICES = [
  'TIKTOK',
  'SPOTIFY',
  'YOUTUBE',
  'BLOG',
  'BMKG_WEATHER',
  'BMKG_EARTHQUAKE',
  'API_HUB'
];

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'USER',
        OR: [
          {
            subscriptions: {
              some: {
                plan: {
                  service: { in: API_HUB_SERVICES }
                }
              }
            }
          },
          {
            apiKeys: {
              some: {
                AND: [
                  { service: { in: API_HUB_SERVICES } },
                  { service: { not: 'RESELLER' } }
                ]
              }
            }
          }
        ]
      },
      include: {
        apiKeys: {
          where: {
            service: { not: 'RESELLER' }
          }
        },
        subscriptions: {
          where: {
            plan: {
              service: { in: API_HUB_SERVICES }
            }
          },
          include: {
            plan: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedData = users.map(user => {
      const totalUsage = user.apiKeys.reduce((acc: number, key: any) => acc + (key.usageCount || 0), 0);
      const lastUsedKey = [...user.apiKeys].sort((a: any, b: any) => {
        if (!a.lastUsed) return 1;
        if (!b.lastUsed) return -1;
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      })[0];

      return {
        id: user.id,
        name: user.name ? decryptDeterministic(user.name) : "Unknown",
        email: user.email ? decryptDeterministic(user.email) : "",
        totalUsage,
        lastUsed: lastUsedKey ? lastUsedKey.lastUsed : null,
        keyCount: user.apiKeys.length,
        apiKeys: user.apiKeys.map((k: any) => ({
          name: k.name || "Default Key",
          key: k.key,
          service: k.service
        })),
        subscriptions: user.subscriptions.map((s: any) => ({
          id: s.id,
          service: s.plan.service,
          planName: s.plan.name,
          status: s.status,
          cycle: s.cycle,
          expiresAt: s.expiresAt
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

    // Delete all API keys associated with the user for API Hub services (exclude RESELLER keys)
    await prisma.apiKey.deleteMany({
      where: {
        userId,
        service: { not: 'RESELLER' }
      }
    });

    return NextResponse.json({ success: true, message: 'Customer API keys deleted successfully' });
  } catch (error) {
    console.error('Error deleting api hub user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
