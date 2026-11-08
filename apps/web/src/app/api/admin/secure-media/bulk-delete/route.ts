import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { requireAuth } from '@/lib/auth-middleware';
import { syncMediaToElastic } from '@/lib/sync-elasticsearch';
import { deleteFromRustFS } from '@/lib/rustfs';

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.impersonatedBy) return NextResponse.json({ error: 'Forbidden while impersonating' }, { status: 403 });

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs array' }, { status: 400 });
    }

    const cleanIds = ids
      .map((x: unknown) => Number(x))
      .filter((n: number) => Number.isInteger(n) && n > 0);
    if (cleanIds.length === 0) {
      return NextResponse.json({ error: 'Invalid IDs provided' }, { status: 400 });
    }

    // Fetch ONLY admin-owned / system media (never customer CDN files)
    const mediaItems = await prisma.secureMedia.findMany({
      where: {
        id: { in: cleanIds },
        OR: [
          { userId: null },
          { user: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } },
        ],
      }
    });

    const allowedIds = mediaItems.map((m) => m.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Delete files from filesystem & RustFS
    const candidateDirs = [
      path.join(process.cwd(), "storage", "secure-media"),
      path.join(process.cwd(), "apps", "web", "storage", "secure-media")
    ];
    mediaItems.forEach(media => {
      if (media.isFolder) return;
      deleteFromRustFS(media.filename).catch(() => {});
      const safeFilename = path.basename(media.filename);
      for (const dir of candidateDirs) {
        const filePath = path.join(dir, safeFilename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error("Failed to delete secure media file:", e);
          }
        }
      }
    });

    // Delete records strictly matching allowed admin IDs
    await prisma.secureMedia.deleteMany({
      where: {
        id: { in: allowedIds },
      }
    });

    // Delete records from Elasticsearch
    allowedIds.forEach(id => syncMediaToElastic(id).catch(err => console.error('Bulk delete media elastic sync error:', err)));

    return NextResponse.json({ success: true, count: allowedIds.length });
  } catch (error) {
    console.error("Bulk delete media error:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
