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
import { uploadStreamToCustomerRustFS } from "@/lib/customer-rustfs";
import { resolveCustomerCdnBucket } from "@/lib/cdn-bucket";
import { syncMediaToElastic } from "@/lib/sync-elasticsearch";
import {
  sanitizeCdnFolderPath,
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
const MAX_TEMP_TTL_SECONDS = 365 * 24 * 60 * 60;

function parsePlanStorageGb(limitsStr: string | null | undefined): number {
  if (!limitsStr) return 0;
  try {
    const limits = JSON.parse(limitsStr);
    if (limits.storage === "unlimited" || limits.storageGb === "unlimited" || limits.storageGB === "unlimited") return 0;
    if (limits.storageGb !== undefined) return Number(limits.storageGb) || 0;
    if (limits.storageGB !== undefined) return Number(limits.storageGB) || 0;
    if (limits.storage) {
      const match = String(limits.storage).trim().match(/^(\d+)\s*(GB|MB|KB|TB)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        const unit = match[2].toUpperCase();
        if (unit === "KB") return val / (1024 * 1024);
        if (unit === "MB") return val / 1024;
        if (unit === "GB") return val;
        if (unit === "TB") return val * 1024;
      }
    }
  } catch {
    // ignore malformed limits
  }
  return 0;
}

function parseUploadExpiresAt(rawHeader: string | null): { valid: boolean; expiresAt: Date | null } {
  if (!rawHeader || rawHeader === "permanent") {
    return { valid: true, expiresAt: null };
  }
  const ttlSeconds = Number(rawHeader);
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > MAX_TEMP_TTL_SECONDS) {
    return { valid: false, expiresAt: null };
  }
  return { valid: true, expiresAt: new Date(Date.now() + ttlSeconds * 1000) };
}

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

    let rawName = "";
    let decodedFolder = "";
    try {
      const rawNameBase64 = req.headers.get("x-upload-original-name") || "";
      rawName = decodeURIComponent(Buffer.from(rawNameBase64, "base64").toString());
      const folderPathBase64 = req.headers.get("x-upload-folder-path") || "Lw==";
      decodedFolder = decodeURIComponent(Buffer.from(folderPathBase64, "base64").toString());
    } catch {
      return NextResponse.json({ error: "Invalid upload filename or folder encoding" }, { status: 400 });
    }

    const folderPath = sanitizeCdnFolderPath(decodedFolder);
    if (!folderPath) {
      return NextResponse.json({ error: "Invalid folder path" }, { status: 400 });
    }
    if (!rawName.trim()) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }
    const isPublicHeader = req.headers.get("x-upload-is-public");
    const isPublic = isPublicHeader === null ? true : isPublicHeader === "true";

    const expiryParsed = parseUploadExpiresAt(req.headers.get("x-upload-expires-in"));
    if (!expiryParsed.valid) {
      return NextResponse.json({ error: "Invalid expiration duration" }, { status: 400 });
    }

    const requestedBucket = req.headers.get("x-upload-bucket");
    const rawSubId = req.headers.get("x-upload-subscription-id");
    const parsedSubId = rawSubId ? parseInt(rawSubId, 10) : undefined;
    const validSubId = parsedSubId && !isNaN(parsedSubId) ? parsedSubId : undefined;
    const targetBucket = await resolveCustomerCdnBucket(userId, requestedBucket, validSubId);
    if (!targetBucket) {
      return NextResponse.json({ error: "Target CDN bucket not found or access denied" }, { status: 404 });
    }

    const targetSubId = validSubId ?? targetBucket.subscriptionId ?? null;
    const targetSub = targetSubId
      ? await prisma.subscription.findFirst({
          where: { id: targetSubId, userId, plan: { service: "CDN" } },
          include: { plan: true },
        })
      : cdnSub;

    if (!targetSub && auth.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Target File CDN subscription not found" }, { status: 403 });
    }
    if (targetSub && targetSub.status === "SUSPENDED") {
      return NextResponse.json({ error: "File CDN instance is suspended. Top up balance to reactivate." }, { status: 403 });
    }
    if (targetSub && targetSub.status !== "ACTIVE" && auth.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "File CDN instance is not active." }, { status: 403 });
    }

    // SECURITY: Read actual file size on disk rather than trusting client headers
    const fileStats = await stat(tempPath).catch(() => null);
    if (!fileStats || fileStats.size <= 0) {
      return NextResponse.json({ error: "File kosong atau upload terputus." }, { status: 400 });
    }
    const fileSize = fileStats.size;

    if (fileSize > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 10GB limit" }, { status: 413 });
    }

    if (auth.user?.role !== 'ADMIN' && targetSub) {
      const storageLimitGB = parsePlanStorageGb(targetSub.plan?.limits);
      const storageLimitBytes = storageLimitGB * 1024 * 1024 * 1024;

      if (storageLimitGB > 0) {
        const aggregate = await prisma.secureMedia.aggregate({
          where: {
            userId,
            isFolder: false,
            OR: [
              ...(targetSub.id ? [{ subscriptionId: targetSub.id }] : []),
              { subscriptionId: null, bucket: targetBucket.name },
            ],
          },
          _sum: { size: true },
        });
        const currentStorageBytes = Number(aggregate._sum.size || 0);

        if (currentStorageBytes + fileSize > storageLimitBytes) {
          return NextResponse.json({ error: `Storage quota exceeded. Your plan limit is ${storageLimitGB} GB.` }, { status: 403 });
        }
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

    // Upload to Customer RustFS and cleanup local disk
    try {
      const encryptedStat = await stat(filePath);
      const uploaded = await uploadStreamToCustomerRustFS(
        targetBucket.name,
        uniqueFilename,
        createReadStream(filePath),
        encryptedStat.size,
        resolvedMime
      );
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
      console.warn('[User CDN Upload] Customer RustFS upload failed, keeping on local disk as fallback:', e);
    }

    const shareToken = uuidv4();
    const media = await prisma.secureMedia.create({
      data: {
        filename: uniqueFilename,
        originalName,
        mimeType: resolvedMime,
        size: fileSize,
        bucket: targetBucket.name,
        subscriptionId: validSubId ?? targetBucket.subscriptionId ?? null,
        folderPath,
        isFolder: false,
        isPublic,
        expiresAt: expiryParsed.expiresAt,
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
