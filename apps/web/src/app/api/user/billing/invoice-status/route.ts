import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require authentication so random users can't probe invoice statuses
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const invoiceNumber = searchParams.get('invoiceNumber');

    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    }

    // SECURITY: Only return the invoice status if the invoice belongs to the requesting user
    // (or the user is an admin). This prevents IDOR.
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { invoiceNumber: invoiceNumber },
          { merchantOrderId: invoiceNumber }
        ],
        ...(auth.user?.role !== 'ADMIN' ? { userId: auth.userId } : {})
      },
      select: { status: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ status: invoice.status });
  } catch (error) {
    console.error('Error fetching invoice status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
