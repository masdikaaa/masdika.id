import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

function generateOrderId() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { userId, name, description, price, billingCycle, expiresAt } = body;

    if (!userId || !name || price === undefined || !billingCycle || !expiresAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Validate billingCycle against allowed enum values only
    const ALLOWED_BILLING_CYCLES = ['MONTHLY', '1_MONTH', '3_MONTHS', '6_MONTHS', 'ANNUALLY', '1_YEAR'];
    if (!ALLOWED_BILLING_CYCLES.includes(billingCycle)) {
      return NextResponse.json({ error: `Invalid billing cycle. Allowed values: ${ALLOWED_BILLING_CYCLES.join(', ')}` }, { status: 400 });
    }

    const parsedPrice = parseInt(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Invalid price amount' }, { status: 400 });
    }

    // Validate user exists before creating service
    const targetUser = await prisma.user.findUnique({ where: { id: parsedUserId }, select: { id: true } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const parsedExpiresAt = new Date(expiresAt);

    const customService = await prisma.customService.create({
      data: {
        userId: parsedUserId,
        name,
        description,
        price: parsedPrice,
        billingCycle,
        expiresAt: parsedExpiresAt,
        status: 'PENDING',
      },
    });

    const merchantOrderId = generateOrderId();
    await prisma.invoice.create({
      data: {
        invoiceNumber: merchantOrderId,
        userId: parsedUserId,
        customServiceId: customService.id,
        amount: parsedPrice,
        status: 'PENDING',
        merchantOrderId: merchantOrderId,
        type: 'CUSTOM_SERVICE',
      }
    });

    return NextResponse.json({ success: true, customService });
  } catch (error: any) {
    console.error('Error creating custom service:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let whereClause = {};
    if (userId) {
      whereClause = { userId: parseInt(userId) };
    }

    const customServices = await prisma.customService.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });

    return NextResponse.json({ success: true, data: customServices });
  } catch (error: any) {
    console.error('Error fetching custom services:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
