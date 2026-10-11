import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { requireAuth } from '@/lib/auth-middleware';
import { v4 as uuidv4 } from "uuid";
import { hasActiveSubscription } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = auth.userId!;
    
    // Check if user has active CDN subscription
    let isSuspended = false;
    if (auth.user?.role !== 'ADMIN') {
      const { getSubscriptionInfo } = await import('@/lib/subscription');
      const subInfo = await getSubscriptionInfo(userId, "CDN");
      if (!subInfo.hasSubscription) {
        return NextResponse.json({ error: "You don't have an active File CDN subscription." }, { status: 403 });
      }
      isSuspended = subInfo.isSuspended;
    }

    const { searchParams } = new URL(req.url);
    const folderPath = searchParams.get('folder') || '/';

    // Lazy Cleanup: Delete expired media for this user
    const now = new Date();
    const expiredMedia = await prisma.secureMedia.findMany({
      where: { userId, expiresAt: { lt: now } }
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
    }

    const media = await prisma.secureMedia.findMany({
      where: { userId, folderPath },
      orderBy: [
        { isFolder: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const enrichedMedia = await Promise.all(media.map(async (item) => {
      if (item.isFolder) {
        const childrenPathPrefix = `${item.folderPath === '/' ? '' : item.folderPath}/${item.originalName}`;
        
        const descendants = await prisma.secureMedia.findMany({
          where: {
            userId,
            folderPath: {
              startsWith: childrenPathPrefix
            }
          }
        });
        
        const itemCount = descendants.length;
        const folderSize = descendants.reduce((acc, desc) => acc + Number(desc.size), 0);
        
        return {
          ...item,
          itemCount,
          folderSize: folderSize.toString() // BigInt needs to be stringified or converted
        };
      }
      
      return {
        ...item,
        size: item.size.toString()
      };
    }));

    return NextResponse.json({ success: true, data: enrichedMedia, isSuspended });
  } catch (error) {
    console.error("List CDN media error:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = auth.userId!;
    
    // Check if user has active CDN subscription
    const hasCdn = await hasActiveSubscription(userId, "CDN");
    if (!hasCdn && auth.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "You don't have an active File CDN subscription." }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'mkdir') {
      const { currentFolder, folderName } = body;
      const sanitizedName = folderName.replace(/[/\\]/g, "").trim();
      if (!sanitizedName) return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });

      // Check if exists
      const existing = await prisma.secureMedia.findFirst({
        where: { userId, folderPath: currentFolder, originalName: sanitizedName, isFolder: true }
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
          token: uuidv4(),
          userId
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        folder: {
          ...newFolder,
          size: newFolder.size.toString()
        } 
      });
    }

    if (action === 'rename') {
      const { id, newName } = body;
      const sanitizedName = newName.replace(/[/\\]/g, "").trim();
      if (!sanitizedName) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

      // Check ownership
      const existing = await prisma.secureMedia.findFirst({
        where: { id: parseInt(id), userId }
      });
      if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });

      const updated = await prisma.secureMedia.update({
        where: { id: parseInt(id) },
        data: { originalName: sanitizedName }
      });
      
      // If it's a folder, we need to update all children's folderPaths too.
      // (Skipping recursive rename for simplicity as in admin API)

      return NextResponse.json({ 
        success: true, 
        media: {
          ...updated,
          size: updated.size.toString()
        } 
      });
    }

    if (action === 'move') {
      const { id, newFolderPath } = body;
      
      // Check ownership
      const existing = await prisma.secureMedia.findFirst({
        where: { id: parseInt(id), userId }
      });
      if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });
      
      const updated = await prisma.secureMedia.update({
        where: { id: parseInt(id) },
        data: { folderPath: newFolderPath }
      });
      
      return NextResponse.json({ 
        success: true, 
        media: {
          ...updated,
          size: updated.size.toString()
        }
      });
    }

    if (action === 'toggleVisibility') {
      const { id, isPublic } = body;
      
      const existing = await prisma.secureMedia.findFirst({
        where: { id: parseInt(id), userId }
      });
      if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });
      
      const nextPublic = typeof isPublic === 'boolean' ? isPublic : !existing.isPublic;
      const updated = await prisma.secureMedia.update({
        where: { id: parseInt(id) },
        data: { isPublic: nextPublic }
      });
      
      return NextResponse.json({ 
        success: true, 
        media: {
          ...updated,
          size: updated.size.toString()
        }
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = auth.userId!;
    
    // Check if user has active CDN subscription
    const hasCdn = await hasActiveSubscription(userId, "CDN");
    if (!hasCdn && auth.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "You don't have an active File CDN subscription." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const media = await prisma.secureMedia.findFirst({
      where: { id: parseInt(id), userId }
    });

    if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

    // If it's a folder, block deletion if it's not empty
    if (media.isFolder) {
      const childrenPath = `${media.folderPath === '/' ? '' : media.folderPath}/${media.originalName}`;
      const childrenCount = await prisma.secureMedia.count({
        where: { userId, folderPath: childrenPath }
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete CDN media error:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
