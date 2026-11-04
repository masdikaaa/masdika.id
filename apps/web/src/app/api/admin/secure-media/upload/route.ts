import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";
import { mkdir, writeFile, open, unlink, stat, readFile } from "fs/promises";
import { createReadStream, createWriteStream, existsSync, unlinkSync } from "fs";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/auth-middleware";
import { syncMediaToElastic } from "@/lib/sync-elasticsearch";
import { uploadBufferToRustFS, uploadFileToRustFS } from "@/lib/rustfs";
import {
  validateFileUploadSecurity,
  validateRealImageBuffer,
} from "@/lib/upload-security";

// Allow up to 10GB request body for this route
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ─── Max upload size: 10 GB ──────────────────────────────────────────────────
const MAX_SIZE = 10 * 1024 * 1024 * 1024;

// ─── Allowed extensions (server-enforced whitelist) ──────────────────────────
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif",
  "mp4", "webm", "ogg", "mov", "avi", "mkv",
  "mp3", "wav", "m4a", "flac", "aac",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
  "txt", "csv", "md", "json",
  "zip", "rar", "7z", "gz"
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif"]);

// ─── Filename sanitization ────────────────────────────────────────────────────
function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "").trim();
  const safe = base.replace(/[^\w\s.\-()[\]]/g, "_");
  return safe.replace(/^\.+/, "").slice(0, 255) || "upload";
}

export async function POST(req: NextRequest) {
  const uploadToken = req.headers.get("x-upload-token");
  let tempPath: string | null = null;
  
  if (uploadToken) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (UUID_REGEX.test(uploadToken)) {
      tempPath = path.join(process.cwd(), "storage", "upload-buffers", uploadToken);
    }
  }

  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // ── Large-file path (pre-processed by custom server) ──────────────────────
    if (uploadToken) {
      if (!tempPath) {
        return NextResponse.json({ error: "Invalid upload token" }, { status: 400 });
      }

      const rawNameBase64 = req.headers.get("x-upload-original-name") || "";
      const rawName = decodeURIComponent(Buffer.from(rawNameBase64, "base64").toString());
      const folderPathBase64 = req.headers.get("x-upload-folder-path") || "Lw==";
      const folderPath = decodeURIComponent(Buffer.from(folderPathBase64, "base64").toString());
      const expiresIn = req.headers.get("x-upload-expires-in") || "permanent";
      const isPublicHeader = req.headers.get("x-upload-is-public");
      const isPublic = isPublicHeader === null ? true : isPublicHeader === "true";

      // SECURITY: Get actual file size instead of trusting client header to prevent quota bypass
      const fileStats = await stat(tempPath).catch(() => null);
      if (!fileStats || fileStats.size <= 0) {
        return NextResponse.json({ error: "Temporary file not found or upload aborted" }, { status: 400 });
      }
      const fileSize = fileStats.size;

      if (fileSize > MAX_SIZE) {
        return NextResponse.json({ error: "File exceeds 10GB limit" }, { status: 413 });
      }

      const headLen = Math.min(fileSize, 65536);
      const tailLen = Math.min(fileSize, 8192);
      const headBuf = Buffer.alloc(headLen);
      const tailBuf = Buffer.alloc(tailLen);

      let fh;
      try {
        fh = await open(tempPath, "r");
        await fh.read(headBuf, 0, headLen, 0);
        await fh.read(tailBuf, 0, tailLen, Math.max(0, fileSize - tailLen));
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

      // Expiry validation
      const allowedExpiry = ["1d", "1w", "1m", "permanent"];
      if (!allowedExpiry.includes(expiresIn)) {
        return NextResponse.json({ error: "Invalid expiration value" }, { status: 400 });
      }
      let expiresAt: Date | null = null;
      if (expiresIn === "1d") { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 1); }
      else if (expiresIn === "1w") { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7); }
      else if (expiresIn === "1m") { expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1); }

      // Storage — stream from temp to final location
      const secureDir = path.join(process.cwd(), "storage", "secure-media");
      await mkdir(secureDir, { recursive: true });
      const uniqueFilename = `${Date.now()}-${uuidv4()}`;
      const filePath = path.join(secureDir, uniqueFilename);

      const encryptionKeyHex = process.env.MEDIA_ENCRYPTION_KEY;
      if (encryptionKeyHex && encryptionKeyHex.length >= 64) {
        // Stream-encrypt: [16-byte IV][AES-256-CBC encrypted data]
        const key = Buffer.from(encryptionKeyHex.substring(0, 64), "hex");
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        const ws = createWriteStream(filePath, { mode: 0o600 });
        let ivWritten = false;
        const ivPrepender = new Transform({
          transform(chunk, _enc, cb) {
            if (!ivWritten) { ivWritten = true; cb(null, Buffer.concat([iv, chunk])); }
            else cb(null, chunk);
          },
          flush(cb) { cb(); }
        });
        await pipeline(createReadStream(tempPath), cipher, ivPrepender, ws);
      } else {
        // Stream directly without encryption
        const ws = createWriteStream(filePath, { mode: 0o600 });
        await pipeline(createReadStream(tempPath), ws);
      }

      // Upload stream to RustFS and cleanup local disk
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
        console.warn('[Upload Chunk] RustFS upload failed, keeping on local disk as fallback:', e);
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
          expiresAt,
        },
      });

      syncMediaToElastic(media.id).catch(err => console.error('Failed to sync media to elastic:', err));

      return NextResponse.json({ success: true, media });
    }
    // ── End large-file path ─────────────────────────────────────────────────────

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const expiresIn = (formData.get("expiresIn") as string) || "permanent";
    const folderPath = (formData.get("folderPath") as string) || "/";
    const isPublicField = formData.get("isPublic");
    const isPublic = isPublicField === null ? true : isPublicField === "true";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Server-side size check
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 10GB limit" }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 10GB limit" }, { status: 413 });
    }

    // Filename sanitization & deep security validation
    const originalName = sanitizeFilename(file.name);
    const securityCheck = validateFileUploadSecurity({
      filename: originalName,
      headBuffer: buffer,
      tailBuffer: buffer,
      allowedExtensions: ALLOWED_EXTENSIONS,
    });

    if (!securityCheck.valid || !securityCheck.resolvedMime) {
      return NextResponse.json(
        { error: securityCheck.error || "File ditolak oleh sistem keamanan." },
        { status: 415 }
      );
    }

    if (securityCheck.ext && IMAGE_EXTENSIONS.has(securityCheck.ext)) {
      const imgValidation = await validateRealImageBuffer(buffer);
      if (!imgValidation.valid) {
        return NextResponse.json({ error: imgValidation.error }, { status: 400 });
      }
    }

    const resolvedMime = securityCheck.resolvedMime;

    // Expiry validation
    const allowedExpiry = ["1d", "1w", "1m", "permanent"];
    if (!allowedExpiry.includes(expiresIn)) {
      return NextResponse.json({ error: "Invalid expiration value" }, { status: 400 });
    }
    let expiresAt: Date | null = null;
    if (expiresIn === "1d") { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 1); }
    else if (expiresIn === "1w") { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7); }
    else if (expiresIn === "1m") { expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1); }

    const uniqueFilename = `${Date.now()}-${uuidv4()}`;

    // Encrypt & write
    const encryptionKeyHex = process.env.MEDIA_ENCRYPTION_KEY;
    let finalBuffer: Buffer;
    if (encryptionKeyHex && encryptionKeyHex.length >= 64) {
      const key = Buffer.from(encryptionKeyHex.substring(0, 64), "hex");
      const iv  = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      finalBuffer = Buffer.concat([iv, encrypted]);
    } else {
      finalBuffer = buffer;
    }

    let savedToRustFS = false;
    try {
      savedToRustFS = await uploadBufferToRustFS(uniqueFilename, finalBuffer, resolvedMime);
    } catch (e) {
      console.warn('[Upload] RustFS upload failed, falling back to local disk:', e);
    }

    if (!savedToRustFS) {
      const secureDir = path.join(process.cwd(), "storage", "secure-media");
      await mkdir(secureDir, { recursive: true });
      const filePath = path.join(secureDir, uniqueFilename);
      await writeFile(filePath, finalBuffer, { mode: 0o600 });
    }

    const shareToken = uuidv4();
    const media = await prisma.secureMedia.create({
      data: {
        filename: uniqueFilename,
        originalName,
        mimeType: resolvedMime,
        size: buffer.length,
        folderPath,
        isFolder: false,
        isPublic,
        token: shareToken,
        expiresAt,
      },
    });

    syncMediaToElastic(media.id).catch(err => console.error('Failed to sync media to elastic:', err));

    return NextResponse.json({ success: true, media });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  } finally {
    if (tempPath) {
      await unlink(tempPath).catch(() => {});
    }
  }
}
