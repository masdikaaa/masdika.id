import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";
import { mkdir, open, unlink, stat, readFile } from "fs/promises";
import { createReadStream, createWriteStream, existsSync, unlinkSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from '@/lib/auth-middleware';
import { getActiveSubscription } from "@/lib/subscription";
import { uploadFileToRustFS } from "@/lib/rustfs";
import { syncMediaToElastic } from "@/lib/sync-elasticsearch";
import {
  validateFileUploadSecurity,
  validateRealImageBuffer,
} from "@/lib/upload-security";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif",
  "mp4", "webm", "ogg", "mov", "avi", "mkv",
  "mp3", "wav", "m4a", "flac", "aac",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "md", "json",
  "zip", "rar", "7z", "gz"
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif"]);

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "").trim();
  const safe = base.replace(/[^\w\s.\-()[\]]/g, "_");
  return safe.replace(/^\.+/, "").slice(0, 255) || "upload";
}

export async function POST(req: NextRequest) {
  const uploadToken = req.headers.get("x-upload-token");
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const tempPath =
    uploadToken && UUID_REGEX.test(uploadToken)
      ? path.join(process.cwd(), "storage", "upload-buffers", uploadToken)
      : null;

  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const userId = auth.userId!;

    // Check if user has active CDN subscription
    const cdnSub = await getActiveSubscription(userId, "CDN");
    if (!cdnSub && auth.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "You don't have an active File CDN subscription." }, { status: 403 });
    }

    if (!tempPath) {
      return NextResponse.json({ error: "Invalid or missing upload token" }, { status: 400 });
    }

    const rawNameBase64 = req.headers.get("x-upload-original-name") || "";
    const rawName = decodeURIComponent(Buffer.from(rawNameBase64, "base64").toString());
    const folderPathBase64 = req.headers.get("x-upload-folder-path") || "Lw==";
    const folderPath = decodeURIComponent(Buffer.from(folderPathBase64, "base64").toString());
    const isPublicHeader = req.headers.get("x-upload-is-public");
    const isPublic = isPublicHeader === null ? true : isPublicHeader === "true";

    // SECURITY: Read actual file size on disk rather than trusting client headers
    const fileStats = await stat(tempPath).catch(() => null);
    if (!fileStats || fileStats.size <= 0) {
      return NextResponse.json({ error: "File kosong atau upload terputus." }, { status: 400 });
    }
    const fileSize = fileStats.size;

    if (fileSize > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 10GB limit" }, { status: 413 });
    }

    if (auth.user?.role !== 'ADMIN' && cdnSub) {
      const limits = JSON.parse(cdnSub.plan.limits);
      const storageLimitGB = Number(limits.storageGB || 0);
      const storageLimitBytes = storageLimitGB * 1024 * 1024 * 1024;

      const aggregate = await prisma.secureMedia.aggregate({
        where: { userId },
        _sum: { size: true }
      });
      const currentStorageBytes = Number(aggregate._sum.size || 0);

      if (currentStorageBytes + fileSize > storageLimitBytes) {
        return NextResponse.json({ error: `Storage quota exceeded. Your plan limit is ${storageLimitGB} GB.` }, { status: 403 });
      }
    }

    // Read head (up to 64KB) and tail (up to 8KB) for magic bytes & anti-webshell scan
    const headLen = Math.min(fileSize, 65536);
    const tailLen = Math.min(fileSize, 8192);
    const headBuf = Buffer.alloc(headLen);
    const tailBuf = Buffer.alloc(tailLen);

    let fh;
    try {
      fh = await open(tempPath, "r");
      await fh.read(headBuf, 0, headLen, 0);
      await fh.read(tailBuf, 0, tailLen, Math.max(0, fileSize - tailLen));
    } catch {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    } finally {
      if (fh) await fh.close();
    }

    const originalName = sanitizeFilename(rawName);
    const securityCheck = validateFileUploadSecurity({
      filename: originalName,
      headBuffer: headBuf,
      tailBuffer: tailBuf,
      allowedExtensions: ALLOWED_EXTENSIONS,
    });

    if (!securityCheck.valid || !securityCheck.resolvedMime) {
      return NextResponse.json(
        { error: securityCheck.error || "File ditolak oleh sistem keamanan." },
        { status: 415 }
      );
    }

    // Deep image verification with Sharp for image files (blocks corrupted/fake images & polyglot shells)
    if (securityCheck.ext && IMAGE_EXTENSIONS.has(securityCheck.ext)) {
      if (fileSize > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran file gambar melebihi batas wajar 50MB." }, { status: 413 });
      }
      const fullImgBuf = await readFile(tempPath);
      const imgValidation = await validateRealImageBuffer(fullImgBuf);
      if (!imgValidation.valid) {
        return NextResponse.json({ error: imgValidation.error }, { status: 400 });
      }
    }

    const resolvedMime = securityCheck.resolvedMime;

    // Storage
    const secureDir = path.join(process.cwd(), "storage", "secure-media");
    await mkdir(secureDir, { recursive: true });
    const uniqueFilename = `${Date.now()}-${uuidv4()}`;
    const filePath = path.join(secureDir, uniqueFilename);

    // Encrypt & stream write
    const encryptionKeyHex = process.env.MEDIA_ENCRYPTION_KEY;
    if (encryptionKeyHex && encryptionKeyHex.length >= 64) {
      const key = Buffer.from(encryptionKeyHex.substring(0, 64), "hex");
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

      const readStream = createReadStream(tempPath);
      const writeStream = createWriteStream(filePath, { mode: 0o600 });

      writeStream.write(iv);
      await pipeline(readStream, cipher, writeStream);
    } else {
      const readStream = createReadStream(tempPath);
      const writeStream = createWriteStream(filePath, { mode: 0o600 });
      await pipeline(readStream, writeStream);
    }

    await unlink(tempPath).catch(() => {});

    // Upload to RustFS and cleanup local disk
    try {
      const uploaded = await uploadFileToRustFS(filePath, uniqueFilename, resolvedMime);
      if (uploaded && existsSync(filePath)) {
        unlinkSync(filePath);
        try {
          const readdirSync = (await import('fs')).readdirSync;
          const rmdirSync = (await import('fs')).rmdirSync;
          if (existsSync(secureDir) && readdirSync(secureDir).length === 0) {
            rmdirSync(secureDir);
          }
        } catch {}
      }
    } catch (e) {
      console.warn('[User CDN Upload] RustFS upload failed, keeping on local disk as fallback:', e);
    }

    const shareToken = uuidv4();
    const media = await prisma.secureMedia.create({
      data: {
        filename: uniqueFilename,
        originalName,
        mimeType: resolvedMime,
        size: fileSize,
        folderPath,
        isFolder: false,
        isPublic,
        token: shareToken,
        userId: userId,
      },
    });

    syncMediaToElastic(media.id).catch(() => {});

    return NextResponse.json({
      success: true,
      media: {
        ...media,
        size: media.size.toString()
      }
    });
  } catch (error) {
    console.error("User CDN upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  } finally {
    if (tempPath) {
      await unlink(tempPath).catch(() => {});
    }
  }
}
