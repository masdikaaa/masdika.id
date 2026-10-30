import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';
import { deleteLocalFile } from '@/lib/file-utils';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs array' }, { status: 400 });
    }

    // Fetch opportunities to delete their images if needed
    const opportunities = await prisma.opportunity.findMany({
      where: {
        id: { in: ids }
      }
    });

    // Delete images
    opportunities.forEach(opp => {
      if (opp.image) {
        deleteLocalFile(opp.image);
      }
    });

    // Delete records
    const result = await prisma.opportunity.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error bulk deleting opportunities:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
