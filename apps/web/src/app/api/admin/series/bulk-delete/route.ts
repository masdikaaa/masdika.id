import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs array' }, { status: 400 });
    }

    // Fetch series to delete their images if needed
    const seriesList = await prisma.series.findMany({
      where: {
        id: { in: ids }
      }
    });

    // Delete images
    seriesList.forEach(series => {
      if (series.image && series.image.startsWith('/uploads/')) {
        const oldFilename = series.image.split('/uploads/')[1];
        if (oldFilename) {
          const safeFilename = path.basename(oldFilename);
          const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (e) {
              console.error("Failed to delete series image:", e);
            }
          }
        }
      }
    });

    // Delete records
    await prisma.series.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk deleting series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
