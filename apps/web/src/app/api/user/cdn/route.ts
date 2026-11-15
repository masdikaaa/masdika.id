import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { requireAuth } from '@/lib/auth-middleware';
import { v4 as uuidv4 } from "uuid";
import { hasActiveSubscription } from "@/lib/subscription";
import { deleteFromRustFS } from "@/lib/rustfs";
import { deleteFromCustomerRustFS, getCustomerRustFSConfig } from "@/lib/customer-rustfs";
import {
  createCustomerCdnBucket,
  deleteCustomerCdnBucket,
  ensureDefaultCdnBucket,
  resolveCustomerCdnBucket,
} from "@/lib/cdn-bucket";
import { hasForbiddenExtension, sanitizeCdnFolderPath } from "@/lib/upload-security";

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
    const requestedBucket = searchParams.get('bucket');
    const rawSubId = searchParams.get('subscriptionId');
    const subscriptionId = rawSubId ? parseInt(rawSubId, 10) : undefined;
    const validSubId = subscriptionId && !isNaN(subscriptionId) ? subscriptionId : undefined;
    const folderPath = sanitizeCdnFolderPath(searchParams.get('folder') || '/');
    if (!folderPath) {
      return NextResponse.json({ error: "Invalid folder path" }, { status: 400 });
    }

    const activeBucket = await resolveCustomerCdnBucket(userId, requestedBucket, validSubId);
    if (!activeBucket) {
      return NextResponse.json({ error: "Bucket not found or access denied" }, { status: 404 });
    }

    const [buckets, rustfsCfg] = await Promise.all([
      prisma.cdnBucket.findMany({
        where: {
          userId,
          ...(validSubId ? { subscriptionId: validSubId } : {}),
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      getCustomerRustFSConfig(),
    ]);

    // Lazy Cleanup: Delete expired media for this user
    const now = new Date();
    const expiredMedia = await prisma.secureMedia.findMany({
      where: { userId, expiresAt: { lt: now } }
    });

    for (const em of expiredMedia) {
      if (!em.isFolder) {
        const targetBucket = em.bucket || activeBucket.name;
        deleteFromCustomerRustFS(targetBucket, em.filename).catch(() => {});
        if (!em.bucket) {
          deleteFromRustFS(em.filename).catch(() => {});
        }
        const secureDir = path.join(process.cwd(), "storage", "secure-media");
        const filePath = path.join(secureDir, path.basename(em.filename));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await prisma.secureMedia.delete({ where: { id: em.id } });
    }

    const bucketFilter = activeBucket.isDefault
      ? { OR: [{ bucket: activeBucket.name }, { bucket: null }] }
      : { bucket: activeBucket.name };

    const media = await prisma.secureMedia.findMany({
      where: { userId, folderPath, ...bucketFilter },
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
            ...bucketFilter,
            folderPath: {
              startsWith: childrenPathPrefix
            }
          }
        });
        
        const itemCount = descendants.length;
        const folderSize = descendants.reduce((acc, desc) => acc + Number(desc.size), 0);
        
        return {
          ...item,
          bucket: item.bucket || activeBucket.name,
          itemCount,
          folderSize: folderSize.toString()
        };
      }
      
      return {
        ...item,
        bucket: item.bucket || activeBucket.name,
        size: item.size.toString()
      };
    }));

    return NextResponse.json({
      success: true,
      data: enrichedMedia,
      buckets,
      activeBucket: activeBucket.name,
      publicEndpoint: rustfsCfg.publicEndpoint,
      isSuspended,
    });
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
    const rawSubId = body.subscriptionId;
    const subscriptionId = rawSubId ? parseInt(String(rawSubId), 10) : undefined;
    const validSubId = subscriptionId && !isNaN(subscriptionId) ? subscriptionId : undefined;

    if (action === 'createBucket') {
      const { bucketName } = body;
      if (!bucketName || typeof bucketName !== 'string') {
        return NextResponse.json({ error: "Bucket name is required" }, { status: 400 });
      }
      try {
        await ensureDefaultCdnBucket(userId, validSubId);
        const created = await createCustomerCdnBucket(userId, bucketName, validSubId);
        return NextResponse.json({ success: true, bucket: created });
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to create bucket" }, { status: 400 });
      }
    }

    if (action === 'deleteBucket') {
      const { bucketName } = body;
      if (!bucketName || typeof bucketName !== 'string') {
        return NextResponse.json({ error: "Bucket name is required" }, { status: 400 });
      }
      try {
        await deleteCustomerCdnBucket(userId, bucketName);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to delete bucket" }, { status: 400 });
      }
    }

    if (action === 'mkdir') {
      const { currentFolder, folderName, bucket } = body;
      const activeBucket = await resolveCustomerCdnBucket(userId, bucket, validSubId);
      if (!activeBucket) {
        return NextResponse.json({ error: "Bucket not found or access denied" }, { status: 404 });
      }
      const safeFolder = sanitizeCdnFolderPath(currentFolder || '/');
      if (!safeFolder) return NextResponse.json({ error: "Invalid parent folder path" }, { status: 400 });
      const sanitizedName = typeof folderName === "string" ? folderName.replace(/[/\\\0]/g, "").trim().slice(0, 120) : "";
      if (!sanitizedName || sanitizedName === "." || sanitizedName === "..") {
        return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
      }

      const bucketFilter = activeBucket.isDefault
        ? { OR: [{ bucket: activeBucket.name }, { bucket: null }] }
        : { bucket: activeBucket.name };

      // Check if exists
      const existing = await prisma.secureMedia.findFirst({
        where: { userId, folderPath: safeFolder, originalName: sanitizedName, isFolder: true, ...bucketFilter }
      });
      if (existing) return NextResponse.json({ error: "Folder already exists" }, { status: 400 });

      const newFolder = await prisma.secureMedia.create({
        data: {
          filename: `folder-${uuidv4()}`,
          originalName: sanitizedName,
          mimeType: "inode/directory",
          size: 0,
          bucket: activeBucket.name,
          subscriptionId: validSubId ?? activeBucket.subscriptionId ?? null,
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
      // Delete from Customer RustFS & legacy fallback
      const defBucket = await ensureDefaultCdnBucket(userId);
      const targetBucket = media.bucket || defBucket.name;
      deleteFromCustomerRustFS(targetBucket, media.filename).catch(() => {});
      if (!media.bucket) {
        deleteFromRustFS(media.filename).catch(() => {});
      }
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
