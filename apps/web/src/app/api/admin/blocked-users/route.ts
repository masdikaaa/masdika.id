import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {

    const blockedUsers = await prisma.blockedUser.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(blockedUsers);
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { type, value, reason } = await req.json();

    if (!type || !value) {
      return NextResponse.json({ error: 'Type and value are required' }, { status: 400 });
    }

    // Validate type is one of the allowed enum values
    if (type !== 'IP' && type !== 'EMAIL') {
      return NextResponse.json(
        { error: 'Type must be either "IP" or "EMAIL".' },
        { status: 400 }
      );
    }

    if (typeof value !== 'string' || value.trim().length === 0 || value.length > 254) {
      return NextResponse.json({ error: 'Invalid value.' }, { status: 400 });
    }

    // Check if already blocked
    const existing = await prisma.blockedUser.findUnique({
      where: { value }
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already blocked' }, { status: 400 });
    }

    const blockedUser = await prisma.blockedUser.create({
      data: {
        type,
        value: value.trim(),
        reason: typeof reason === 'string' ? reason.trim().substring(0, 500) : '',
      },
    });

    return NextResponse.json(blockedUser);
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const ipAddress = url.searchParams.get('ipAddress');

    if (!email && !ipAddress) {
      return NextResponse.json({ error: 'Email or IP is required' }, { status: 400 });
    }

    const valuesToDelete = [];
    if (email) valuesToDelete.push(email);
    if (ipAddress) valuesToDelete.push(ipAddress);

    await prisma.blockedUser.deleteMany({
      where: {
        value: {
          in: valuesToDelete
        }
      }
    });

    return NextResponse.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
