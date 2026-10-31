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

  try {
    const adminUser = auth.user!;

    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs array' }, { status: 400 });
    }

    // Fetch media to delete their files
    const mediaItems = await prisma.secureMedia.findMany({
      where: {
        id: { in: ids }
      }
    });

    // Delete files from filesystem & RustFS
    const candidateDirs = [
      path.join(process.cwd(), "storage", "secure-media"),
      path.join(process.cwd(), "apps", "web", "storage", "secure-media")
    ];
    mediaItems.forEach(media => {
      deleteFromRustFS(media.filename).catch(() => {});
      for (const dir of candidateDirs) {
        const filePath = path.join(dir, media.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error("Failed to delete secure media file:", e);
          }
        }
      }
    });

    // Delete records
    await prisma.secureMedia.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    // Delete records from Elasticsearch
    ids.forEach(id => syncMediaToElastic(id).catch(err => console.error('Bulk delete media elastic sync error:', err)));

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("Bulk delete media error:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
