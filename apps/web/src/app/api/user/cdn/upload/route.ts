import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";
import { mkdir, writeFile, open, unlink } from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from '@/lib/auth-middleware';
import { getActiveSubscription } from "@/lib/subscription";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/bmp", "image/heic", "image/heic-sequence", "image/heif", "image/heif-sequence",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/hevc",
  "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/aac", "audio/flac", "audio/x-m4a",
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown", "application/json",
  "application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/gzip", "application/x-tar"
]);

const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "heic", "heif",
  "mp4", "webm", "ogg", "mov", "avi", "hevc",
  "mp3", "wav", "m4a", "flac", "aac",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "md", "json",
  "zip", "rar", "7z", "gz", "tar"
]);

function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  if (buf[0] === 0xFF && (buf[1] === 0xFB || buf[1] === 0xF3 || buf[1] === 0xF2)) return "audio/mpeg";
  if (buf.length >= 12 && buf.slice(4, 8).toString("ascii") === "ftyp") return "video/mp4";
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) return "application/zip";
  return null;
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "").trim();
  const safe = base.replace(/[^\w\s.\-()[\]]/g, "_");
  const finalName = safe.replace(/^\.+/, "").slice(0, 255) || "upload";
  
  const parts = finalName.toLowerCase().split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1];
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return finalName + ".txt";
    }
  }
  return finalName;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = auth.userId!;
    
    // Check if user has active CDN subscription
    const cdnSub = await getActiveSubscription(userId, "CDN");
    if (!cdnSub && auth.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "You don't have an active File CDN subscription." }, { status: 403 });
    }

    const uploadToken = req.headers.get("x-upload-token");
    if (!uploadToken) return NextResponse.json({ error: "Missing upload token" }, { status: 400 });
    
    // Security: validate token is a UUID (prevents path traversal)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(uploadToken)) {
      return NextResponse.json({ error: "Invalid upload token" }, { status: 400 });
    }

    const tempPath = path.join(process.cwd(), "storage", "upload-buffers", uploadToken);
    const rawNameBase64 = req.headers.get("x-upload-original-name") || "";
    const rawName = decodeURIComponent(Buffer.from(rawNameBase64, "base64").toString());
    const clientMime = (req.headers.get("x-upload-mime-type") || "application/octet-stream").toLowerCase().split(";")[0].trim();
    const fileSize = parseInt(req.headers.get("x-upload-file-size") || "0", 10);
    const folderPathBase64 = req.headers.get("x-upload-folder-path") || "Lw==";
    const folderPath = decodeURIComponent(Buffer.from(folderPathBase64, "base64").toString());
    const isPublicHeader = req.headers.get("x-upload-is-public");
    const isPublic = isPublicHeader === null ? true : isPublicHeader === "true";

    if (fileSize > MAX_SIZE) {
      await unlink(tempPath).catch(() => {});
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
        await unlink(tempPath).catch(() => {});
        return NextResponse.json({ error: `Storage quota exceeded. Your plan limit is ${storageLimitGB} GB.` }, { status: 403 });
      }
    }

    const headerBuf = Buffer.alloc(12);
    let fh;
    try {
      fh = await open(tempPath, "r");
      await fh.read(headerBuf, 0, 12, 0);
    } catch (err) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    } finally {
      if (fh) await fh.close();
    }
    
    const detectedMime = detectMimeFromBuffer(headerBuf);
    const resolvedMime = detectedMime ?? clientMime;

    if (!ALLOWED_MIME_TYPES.has(resolvedMime)) {
      await unlink(tempPath).catch(() => {});
      return NextResponse.json({ error: `File type "${resolvedMime}" is not allowed` }, { status: 415 });
    }

    const originalName = sanitizeFilename(rawName);

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
  }
}
