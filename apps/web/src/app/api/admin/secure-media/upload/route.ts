import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as crypto from "crypto";
import { mkdir, writeFile, open, unlink, stat } from "fs/promises";
import { createReadStream, createWriteStream, existsSync, unlinkSync } from "fs";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/auth-middleware";
import { syncMediaToElastic } from "@/lib/sync-elasticsearch";
import { uploadBufferToRustFS, uploadFileToRustFS } from "@/lib/rustfs";

// Allow up to 10GB request body for this route
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ─── Max upload size: 10 GB ──────────────────────────────────────────────────
const MAX_SIZE = 10 * 1024 * 1024 * 1024;

// ─── Allowed MIME types (server-enforced whitelist) ───────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "image/bmp", "image/tiff", "image/svg+xml",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo",
  "video/x-matroska",
  "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/aac",
  "audio/flac", "audio/x-m4a",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "text/plain", "text/csv", "text/markdown",
  "application/json", "application/xml", "text/xml",
]);

// ─── Magic byte detection ─────────────────────────────────────────────────────
function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 4) return null;

  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)
    return "image/webp";
  if (buf[0] === 0x42 && buf[1] === 0x4D) return "image/bmp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  if ((buf[0] === 0xFF && (buf[1] === 0xFB || buf[1] === 0xF3 || buf[1] === 0xF2)) ||
      (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33)) return "audio/mpeg";
  if (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return "audio/ogg";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x41 && buf[10] === 0x56 && buf[11] === 0x45)
    return "audio/wav";
  if (buf[0] === 0x66 && buf[1] === 0x4C && buf[2] === 0x61 && buf[3] === 0x43) return "audio/flac";
  if (buf.length >= 12) {
    const ftyp = buf.slice(4, 8).toString("ascii");
    if (ftyp === "ftyp") {
      const brand = buf.slice(8, 12).toString("ascii");
      if (["qt  ", "M4V ", "M4A ", "M4P "].includes(brand)) return "video/quicktime";
      return "video/mp4";
    }
  }
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return "video/webm";
  // ZIP-based (Office Open XML, ODF) — can't distinguish docx/xlsx/pptx by magic
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) return null;
  // OLE2 compound (legacy .doc / .xls / .ppt)
  if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return "application/msword";
  return null;
}

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

    const adminUser = auth.user!;

    // ── Large-file path (pre-processed by custom server via busboy) ──────────────
    if (uploadToken) {
      if (!tempPath) {
        return NextResponse.json({ error: "Invalid upload token" }, { status: 400 });
      }

      const rawNameBase64 = req.headers.get("x-upload-original-name") || "";
      const rawName = decodeURIComponent(Buffer.from(rawNameBase64, "base64").toString());
      const clientMime = (req.headers.get("x-upload-mime-type") || "application/octet-stream").toLowerCase().split(";")[0].trim();
      const folderPathBase64 = req.headers.get("x-upload-folder-path") || "Lw==";
      const folderPath = decodeURIComponent(Buffer.from(folderPathBase64, "base64").toString());
      const expiresIn = req.headers.get("x-upload-expires-in") || "permanent";
      const isPublicHeader = req.headers.get("x-upload-is-public");
      const isPublic = isPublicHeader === null ? true : isPublicHeader === "true";

      // SECURITY: Get actual file size instead of trusting client header to prevent quota bypass
      const fileStats = await stat(tempPath).catch(() => null);
      if (!fileStats) {
        return NextResponse.json({ error: "Temporary file not found or upload aborted" }, { status: 400 });
      }
      const fileSize = fileStats.size;

      if (fileSize > MAX_SIZE) {
        return NextResponse.json({ error: "File exceeds 10GB limit" }, { status: 413 });
      }

      // MIME detection — read only first 12 bytes (magic bytes)
      const headerBuf = Buffer.alloc(12);
      const fh = await open(tempPath, "r");
      await fh.read(headerBuf, 0, 12, 0);
      await fh.close();
      const detectedMime = detectMimeFromBuffer(headerBuf);
      const resolvedMime = detectedMime ?? clientMime;

      if (!ALLOWED_MIME_TYPES.has(resolvedMime)) {
        return NextResponse.json({ error: `File type "${resolvedMime}" is not allowed` }, { status: 415 });
      }

      const originalName = sanitizeFilename(rawName);

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
      return NextResponse.json({ error: "File exceeds 5GB limit" }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 5GB limit" }, { status: 413 });
    }

    // MIME detection from magic bytes
    const detectedMime = detectMimeFromBuffer(buffer);
    const clientMime = (file.type || "application/octet-stream").toLowerCase().split(";")[0].trim();
    const resolvedMime = detectedMime ?? clientMime;

    if (!ALLOWED_MIME_TYPES.has(resolvedMime)) {
      return NextResponse.json(
        { error: `File type "${resolvedMime}" is not allowed` },
        { status: 415 }
      );
    }

    // Filename sanitization
    const originalName = sanitizeFilename(file.name);

    // Expiry validation
    const allowedExpiry = ["1d", "1w", "1m", "permanent"];
    if (!allowedExpiry.includes(expiresIn)) {
      return NextResponse.json({ error: "Invalid expiration value" }, { status: 400 });
    }
    let expiresAt: Date | null = null;
    if (expiresIn === "1d") { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 1); }
    else if (expiresIn === "1w") { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7); }
    else if (expiresIn === "1m") { expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1); }

    // Storage
    const secureDir = path.join(process.cwd(), "storage", "secure-media");
    await mkdir(secureDir, { recursive: true });
    const uniqueFilename = `${Date.now()}-${uuidv4()}`;
    const filePath = path.join(secureDir, uniqueFilename);

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
