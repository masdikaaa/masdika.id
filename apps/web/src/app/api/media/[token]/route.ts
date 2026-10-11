import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from '@/lib/get-ip';
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import * as crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

const INLINE_ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "image/avif", "image/bmp", "image/tiff",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/aac", "audio/flac",
  "application/pdf",
  "text/plain", "text/csv", "text/markdown",
  "application/json", "application/xml", "text/xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
]);

function contentDispositionFilename(name: string, inline: boolean): string {
  const disposition = inline ? "inline" : "attachment";
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16));
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // UUID validation
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(token)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const media = await prisma.secureMedia.findUnique({ where: { token } });
    if (!media) return new NextResponse("Not Found", { status: 404 });

    if (media.userId) {
      const { getSubscriptionInfo } = await import('@/lib/subscription');
      const subInfo = await getSubscriptionInfo(media.userId, "CDN");
      if (subInfo.isSuspended || !subInfo.hasSubscription) {
        return new NextResponse("Service Suspended", { status: 403 });
      }
    }

    // Expiry check
    if (media.expiresAt && media.expiresAt < new Date()) {
      const secureDir = path.join(process.cwd(), "storage", "secure-media");
      const fp = path.join(secureDir, media.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      await prisma.secureMedia.delete({ where: { id: media.id } });
      return new NextResponse("Link has expired", { status: 410 });
    }

    const secureDir = path.join(process.cwd(), "storage", "secure-media");

    // Path traversal guard
    const filePath = path.resolve(secureDir, media.filename);
    if (!filePath.startsWith(path.resolve(secureDir) + path.sep)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File Not Found on Disk", { status: 404 });
    }

    const inlineRequested = req.nextUrl.searchParams.get("inline") === "true";
    const canInline = inlineRequested && INLINE_ALLOWED_MIME.has(media.mimeType);

    // Rate limit: 300 req/IP/min for inline streaming chunks, 60 req/IP/min for full downloads
    const ip = getClientIp(req);
    const rateLimitKey = inlineRequested ? "MEDIA_STREAM" : "MEDIA_DL";
    const rateLimitMax = inlineRequested ? 300 : 60;
    if (!(await checkRateLimit(rateLimitKey, ip, rateLimitMax, 60))) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }

    const securityHeaders: Record<string, string> = {
      "Content-Type": media.mimeType,
      "Content-Disposition": contentDispositionFilename(media.originalName, canInline),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": canInline ? "private, max-age=3600" : "private, no-store",
      "Accept-Ranges": "bytes",
      // Allow same-origin fetch from PDF.js web worker
      "Access-Control-Allow-Origin": (() => {
        const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://masdika.id";
        const requestOrigin = req.headers.get("origin");
        return requestOrigin === allowedOrigin ? allowedOrigin : "";
      })(),
      "Access-Control-Allow-Methods": "GET",
    };

    // Read entire file into buffer and decrypt in-memory.
    const encryptedBuf = fs.readFileSync(filePath);
    const encryptionKeyHex = process.env.MEDIA_ENCRYPTION_KEY;

    let outputBuf: Buffer;
    if (encryptionKeyHex && encryptionKeyHex.length >= 64) {
      const key     = Buffer.from(encryptionKeyHex.substring(0, 64), "hex");
      const iv      = encryptedBuf.subarray(0, 16);
      const payload = encryptedBuf.subarray(16);
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      outputBuf = Buffer.concat([decipher.update(payload), decipher.final()]);
    } else {
      outputBuf = encryptedBuf;
    }

    const totalSize = outputBuf.length;
    const rangeHeader = req.headers.get("range");

    // Handle HTTP Range Requests (Essential for video/audio seeking and skipping)
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const startStr = parts[0];
      const endStr = parts[1];

      let start = startStr ? parseInt(startStr, 10) : NaN;
      let end = endStr ? parseInt(endStr, 10) : totalSize - 1;

      if (isNaN(start)) {
        // e.g. bytes=-500 means the last 500 bytes
        start = totalSize - parseInt(endStr, 10);
        end = totalSize - 1;
      }

      if (start >= totalSize || start < 0) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      end = Math.min(end, totalSize - 1);
      const chunkSize = end - start + 1;
      const chunk = outputBuf.subarray(start, end + 1);

      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...securityHeaders,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": String(chunkSize),
        },
      });
    }

    return new NextResponse(new Uint8Array(outputBuf), {
      status: 200,
      headers: {
        ...securityHeaders,
        "Content-Length": String(totalSize),
      },
    });
  } catch (error) {
    console.error("Download media error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
