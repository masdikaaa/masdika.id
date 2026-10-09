import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const params = await props.params;
    const userId = parseInt(params.id);
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          include: {
            plan: true
          }
        },

        secureFiles: true,
        shortLinks: true,
        apiKeys: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const services = {
      subscriptions: user.subscriptions,

      secureFiles: user.secureFiles,
      apiKeys: user.apiKeys
    };

    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    console.error("Fetch User Services Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
