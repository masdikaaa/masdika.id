import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { requireAuth } from '@/lib/auth-middleware';
import { v4 as uuidv4 } from "uuid";
import { hasActiveSubscription } from "@/lib/subscription";
import { deleteFromRustFS } from "@/lib/rustfs";
import { hasForbiddenExtension } from "@/lib/upload-security";

function sanitizeCdnFolderPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.includes("\\")) return null;
  const normalized = ("/" + trimmed).replace(/\/+/g, "/").replace(/\/+$/, "") || "/";
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((s) => s === "." || s === "..")) return null;
  return normalized.slice(0, 500);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = auth.userId!;
    
    // Check if user has active CDN subscription
    let isSuspended = false;
    const isAdmin = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      const { getSubscriptionInfo } = await import('@/lib/subscription');
      const subInfo = await getSubscriptionInfo(userId, "CDN");
      if (!subInfo.hasSubscription) {
        return NextResponse.json({ error: "You don't have an active File CDN subscription." }, { status: 403 });
      }
      isSuspended = subInfo.isSuspended;
    }

    const { searchParams } = new URL(req.url);
    const folderPath = sanitizeCdnFolderPath(searchParams.get('folder') || '/');
    if (!folderPath) {
      return NextResponse.json({ error: "Invalid folder path" }, { status: 400 });
    }

    // Lazy Cleanup: Delete expired media for this user
    const now = new Date();
    const expiredMedia = await prisma.secureMedia.findMany({
      where: { userId, expiresAt: { lt: now } }
    });

    for (const em of expiredMedia) {
      if (!em.isFolder) {
        deleteFromRustFS(em.filename).catch(() => {});
        const secureDir = path.join(process.cwd(), "storage", "secure-media");
        const filePath = path.join(secureDir, path.basename(em.filename));
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
    const isAdmin = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN';
    if (!hasCdn && !isAdmin) {
      return NextResponse.json({ error: "You don't have an active File CDN subscription." }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'mkdir') {
      const { currentFolder, folderName } = body;
      const safeFolder = sanitizeCdnFolderPath(currentFolder || '/');
      if (!safeFolder) return NextResponse.json({ error: "Invalid parent folder path" }, { status: 400 });
      const sanitizedName = typeof folderName === "string" ? folderName.replace(/[/\\\0]/g, "").trim().slice(0, 120) : "";
      if (!sanitizedName || sanitizedName === "." || sanitizedName === "..") {
        return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
      }

      // Check if exists
      const existing = await prisma.secureMedia.findFirst({
        where: { userId, folderPath: safeFolder, originalName: sanitizedName, isFolder: true }
      });
      if (existing) return NextResponse.json({ error: "Folder already exists" }, { status: 400 });

      const newFolder = await prisma.secureMedia.create({
        data: {
          filename: `folder-${uuidv4()}`,
          originalName: sanitizedName,
          mimeType: "inode/directory",
          size: 0,
          folderPath: safeFolder,
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
      const mediaId = parseInt(String(id), 10);
      if (isNaN(mediaId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      const sanitizedName = typeof newName === "string" ? newName.replace(/[/\\\0]/g, "").trim().slice(0, 255) : "";
      if (!sanitizedName || sanitizedName === "." || sanitizedName === "..") {
        return NextResponse.json({ error: "Invalid name" }, { status: 400 });
      }

      // Check ownership
      const existing = await prisma.secureMedia.findFirst({
        where: { id: mediaId, userId }
      });
      if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });

      if (!existing.isFolder) {
        const extCheck = hasForbiddenExtension(sanitizedName);
        if (extCheck.forbidden) {
          return NextResponse.json({ error: extCheck.reason || "Forbidden file extension" }, { status: 400 });
        }
      }

      const updated = await prisma.secureMedia.update({
        where: { id: mediaId },
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
      const mediaId = parseInt(String(id), 10);
      if (isNaN(mediaId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      const safeFolderPath = sanitizeCdnFolderPath(newFolderPath);
      if (!safeFolderPath) return NextResponse.json({ error: "Invalid destination folder path" }, { status: 400 });
      
      // Check ownership
      const existing = await prisma.secureMedia.findFirst({
        where: { id: mediaId, userId }
      });
      if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });
      
      const updated = await prisma.secureMedia.update({
        where: { id: mediaId },
        data: { folderPath: safeFolderPath }
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
      // Delete from RustFS & filesystem
      deleteFromRustFS(media.filename).catch(() => {});
      const candidateDirs = [
        path.join(process.cwd(), "storage", "secure-media"),
        path.join(process.cwd(), "apps", "web", "storage", "secure-media")
      ];
      for (const dir of candidateDirs) {
        const filePath = path.join(dir, media.filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }
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
