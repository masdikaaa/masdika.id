import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { requireAuth } from '@/lib/auth-middleware';
import { v4 as uuidv4 } from "uuid";
import { searchMediaElastic, syncMediaToElastic } from "@/lib/sync-elasticsearch";

export async function GET(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const adminUser = auth.user!;

    const { searchParams } = new URL(req.url);
    const folderPath = searchParams.get('folder') || '/';
    const search = searchParams.get('search') || searchParams.get('q') || '';

    // Lazy Cleanup: Delete expired media
    const now = new Date();
    const expiredMedia = await prisma.secureMedia.findMany({
      where: { expiresAt: { lt: now } }
    });

    for (const em of expiredMedia) {
      if (!em.isFolder) {
        const secureDir = path.join(process.cwd(), "storage", "secure-media");
        const filePath = path.join(secureDir, em.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await prisma.secureMedia.delete({ where: { id: em.id } });
      syncMediaToElastic(em.id).catch(() => {});
    }

    let media: any[] = [];
    let elasticMediaIds: number[] | null = null;

    if (search.trim()) {
      elasticMediaIds = await searchMediaElastic(search.trim(), {
        isAdminMedia: true,
        limit: 150
      });

      if (elasticMediaIds !== null) {
        if (elasticMediaIds.length > 0) {
          media = await prisma.secureMedia.findMany({
            where: {
              id: { in: elasticMediaIds },
              OR: [
                { userId: null },
                { user: { role: 'ADMIN' } },
              ],
            }
          });
          // Sort according to Elasticsearch relevance ranking
          media.sort((a, b) => elasticMediaIds!.indexOf(a.id) - elasticMediaIds!.indexOf(b.id));
        }
      } else {
        // Fallback for local dev when Elasticsearch is not running
        media = await prisma.secureMedia.findMany({
          where: {
            originalName: { contains: search.trim(), mode: 'insensitive' },
            OR: [
              { userId: null },
              { user: { role: 'ADMIN' } },
            ],
          },
          orderBy: [
            { isPinned: 'desc' },
            { isFolder: 'desc' },
            { createdAt: 'desc' }
          ]
        });
      }
    } else {
      media = await prisma.secureMedia.findMany({
        where: {
          folderPath,
          OR: [
            { userId: null },
            { user: { role: 'ADMIN' } },
          ],
        },
        orderBy: [
          { isPinned: 'desc' },
          { isFolder: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    }

    const enrichedMedia = await Promise.all(media.map(async (item) => {
      if (item.isFolder) {
        const childrenPathPrefix = `${item.folderPath === '/' ? '' : item.folderPath}/${item.originalName}`;
        
        const descendants = await prisma.secureMedia.findMany({
          where: {
            folderPath: {
              startsWith: childrenPathPrefix
            },
            OR: [
              { userId: null },
              { user: { role: 'ADMIN' } },
            ],
          }
        });
        
        const itemCount = descendants.length;
        const folderSize = descendants.reduce((acc, desc) => acc + Number(desc.size), 0);
        
        return {
          ...item,
          itemCount,
          folderSize
        };
      }
      return item;
    }));

    return NextResponse.json(enrichedMedia);
  } catch (error) {
    console.error("List media error:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const adminUser = auth.user!;

    const body = await req.json();
    const { action } = body;

    if (action === 'mkdir') {
      const { currentFolder, folderName } = body;
      const sanitizedName = folderName.replace(/[/\\]/g, "").trim();
      if (!sanitizedName) return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });

      // Check if exists
      const existing = await prisma.secureMedia.findFirst({
        where: { folderPath: currentFolder, originalName: sanitizedName, isFolder: true }
      });
      if (existing) return NextResponse.json({ error: "Folder already exists" }, { status: 400 });

      const newFolder = await prisma.secureMedia.create({
        data: {
          filename: `folder-${uuidv4()}`,
          originalName: sanitizedName,
          mimeType: "inode/directory",
          size: 0,
          folderPath: currentFolder,
          isFolder: true,
          token: uuidv4()
        }
      });
      syncMediaToElastic(newFolder.id).catch(err => console.error('Failed to sync new folder to elastic:', err));
      return NextResponse.json({ success: true, folder: newFolder });
    }

    if (action === 'rename') {
      const { id, newName } = body;
      const sanitizedName = newName.replace(/[/\\]/g, "").trim();
      if (!sanitizedName) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

      const updated = await prisma.secureMedia.update({
        where: { id: parseInt(id) },
        data: { originalName: sanitizedName }
      });
      
      syncMediaToElastic(updated.id).catch(err => console.error('Failed to sync rename to elastic:', err));

      return NextResponse.json({ success: true, media: updated });
    }

    if (action === 'move') {
      const { id, newFolderPath } = body;
      const updated = await prisma.secureMedia.update({
        where: { id: parseInt(id) },
        data: { folderPath: newFolderPath }
      });
      syncMediaToElastic(updated.id).catch(err => console.error('Failed to sync move to elastic:', err));
      return NextResponse.json({ success: true, media: updated });
    }

    if (action === 'togglePin') {
      const { id, isPinned } = body;
      const updated = await prisma.secureMedia.update({
        where: { id: parseInt(id) },
        data: { isPinned: Boolean(isPinned) }
      });
      syncMediaToElastic(updated.id).catch(err => console.error('Failed to sync pin to elastic:', err));
      return NextResponse.json({ success: true, media: updated });
    }

    if (action === 'toggleVisibility') {
      const { id, isPublic } = body;
      const target = await prisma.secureMedia.findUnique({ where: { id: parseInt(id) } });
      if (!target) return NextResponse.json({ error: "Media not found" }, { status: 404 });
      
      const nextPublic = typeof isPublic === 'boolean' ? isPublic : !target.isPublic;
      const updated = await prisma.secureMedia.update({
        where: { id: parseInt(id) },
        data: { isPublic: nextPublic }
      });
      syncMediaToElastic(updated.id).catch(err => console.error('Failed to sync visibility to elastic:', err));
      return NextResponse.json({ success: true, media: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const media = await prisma.secureMedia.findUnique({
      where: { id: parseInt(id) },
      include: { user: true },
    });

    if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });
    if (media.userId !== null && media.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "Cannot delete customer files from this route" }, { status: 403 });
    }

    // If it's a folder, block deletion if it's not empty
    if (media.isFolder) {
      const childrenPath = `${media.folderPath === '/' ? '' : media.folderPath}/${media.originalName}`;
      const childrenCount = await prisma.secureMedia.count({
        where: { folderPath: childrenPath }
      });
      if (childrenCount > 0) {
        return NextResponse.json({ error: "Folder is not empty" }, { status: 400 });
      }
    } else {
      // Delete from filesystem
      const secureDir = path.join(process.cwd(), "storage", "secure-media");
      const filePath = path.join(secureDir, media.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from db
    await prisma.secureMedia.delete({
      where: { id: parseInt(id) }
    });

    syncMediaToElastic(parseInt(id)).catch(err => console.error('Failed to delete media from elastic:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete media error:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
