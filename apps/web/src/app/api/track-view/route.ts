import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    
    // Hash IP for privacy
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    try {
      await prisma.pageView.upsert({
        where: { ipHash },
        create: { ipHash },
        update: {},
      });
    } catch (e: any) {
      // Ignore unique constraint errors (P2002) from race conditions
      if (e.code !== 'P2002') throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking view:', error);
    // Don't fail the client on tracking errors
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
