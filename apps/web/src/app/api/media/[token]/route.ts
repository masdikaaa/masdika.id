import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from '@/lib/get-ip';
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import * as crypto from "crypto";
import { Readable } from "stream";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth-middleware";
import {
  downloadBufferFromRustFS,
  getObjectStreamFromRustFS,
  deleteFromRustFS,
} from "@/lib/rustfs";

const INLINE_ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "image/avif", "image/bmp", "image/tiff",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/aac", "audio/flac",
  "application/pdf",
  "text/plain", "text/csv", "text/markdown",
  "application/json",
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

    // Privacy guard: If file is private, only active unrevoked owner or admin can stream/download
    if (!media.isPublic) {
      const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
      const isAuthorized =
        !auth.error &&
        auth.user &&
        (auth.user.role === "ADMIN" || auth.user.role === "SUPER_ADMIN" || auth.user.id === media.userId);

      if (!isAuthorized) {
        return new NextResponse("Forbidden: This file is private", { status: 403 });
      }
    }

    if (media.userId) {
      const { getSubscriptionInfo } = await import('@/lib/subscription');
      const subInfo = await getSubscriptionInfo(media.userId, "CDN");
      if (subInfo.isSuspended || !subInfo.hasSubscription) {
        return new NextResponse("Service Suspended", { status: 403 });
      }
    }

    // Expiry check
    if (media.expiresAt && media.expiresAt < new Date()) {
      deleteFromRustFS(media.filename).catch(() => {});
      const candidateDirs = [
        path.join(process.cwd(), "storage", "secure-media"),
        path.join(process.cwd(), "apps", "web", "storage", "secure-media")
      ];
      for (const dir of candidateDirs) {
        const fp = path.join(dir, media.filename);
        if (fs.existsSync(fp)) {
          try { fs.unlinkSync(fp); } catch {}
        }
      }
      await prisma.secureMedia.delete({ where: { id: media.id } });
      return new NextResponse("Link has expired", { status: 410 });
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

    // QuickTime (.mov) and ISO MP4 share the same ISO-BMFF container format.
    // Browsers (Chrome on Android/Desktop, Firefox, Edge) do not recognize "video/quicktime" as a valid HTML5 video MIME type
    // and will reject playback under "X-Content-Type-Options: nosniff".
    // For inline streaming, normalizing .mov / video/quicktime to "video/mp4" enables playback
    // across all modern browsers and Android devices.
    const isMov = media.mimeType === "video/quicktime" || media.originalName.toLowerCase().endsWith(".mov");
    const streamMime = canInline && isMov ? "video/mp4" : media.mimeType;

    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://masdika.id";
    const corsOrigin = media.isPublic ? "*" : allowedOrigin;

    const securityHeaders: Record<string, string> = {
      "Content-Type": streamMime,
      "Content-Disposition": contentDispositionFilename(media.originalName, canInline),
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": canInline
        ? media.isPublic
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "private, max-age=3600"
        : "private, no-store",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Origin, Content-Type, Accept",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    };

    const encryptionKeyHex = process.env.MEDIA_ENCRYPTION_KEY;
    const isEncrypted = Boolean(encryptionKeyHex && encryptionKeyHex.length >= 64);
    const rangeHeader = req.headers.get("range");

    // ── FAST PATH: Direct Zero-Copy Streaming when not AES-encrypted ──────────
    if (!isEncrypted) {
      // 1. Stream directly from RustFS with native S3 Range pass-through
      const rustStream = await getObjectStreamFromRustFS(media.filename, rangeHeader);
      if (rustStream) {
        const headers: Record<string, string> = {
          ...securityHeaders,
          "Content-Length": String(rustStream.contentLength),
        };
        if (rustStream.contentRange) {
          headers["Content-Range"] = rustStream.contentRange;
        }
        if (rustStream.etag) {
          headers["ETag"] = rustStream.etag;
        }
        return new NextResponse(rustStream.stream, {
          status: rustStream.statusCode,
          headers,
        });
      }

      // 2. Fallback: Stream directly from local disk with Range support
      const candidateDirs = [
        path.join(process.cwd(), "storage", "secure-media"),
        path.join(process.cwd(), "apps", "web", "storage", "secure-media"),
        path.resolve(__dirname, "../../../../../storage/secure-media"),
        "/app/apps/web/storage/secure-media",
      ];
      for (const dir of candidateDirs) {
        const filePath = path.resolve(dir, media.filename);
        if (filePath.startsWith(path.resolve(dir) + path.sep) && fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          const totalSize = stat.size;

          if (rangeHeader && rangeHeader.startsWith("bytes=")) {
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            const startStr = parts[0];
            const endStr = parts[1];
            let start = startStr ? parseInt(startStr, 10) : NaN;
            let end = endStr ? parseInt(endStr, 10) : totalSize - 1;
            if (isNaN(start)) {
              start = totalSize - parseInt(endStr, 10);
              end = totalSize - 1;
            }
            if (start >= totalSize || start < 0) {
              return new NextResponse(null, {
                status: 416,
                headers: { "Content-Range": `bytes */${totalSize}` },
              });
            }
            end = Math.min(end, totalSize - 1);
            const chunkSize = end - start + 1;
            const nodeStream = fs.createReadStream(filePath, { start, end });
            const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
            return new NextResponse(webStream, {
              status: 206,
              headers: {
                ...securityHeaders,
                "Content-Range": `bytes ${start}-${end}/${totalSize}`,
                "Content-Length": String(chunkSize),
              },
            });
          }

          const nodeStream = fs.createReadStream(filePath);
          const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
          return new NextResponse(webStream, {
            status: 200,
            headers: {
              ...securityHeaders,
              "Content-Length": String(totalSize),
            },
          });
        }
      }
      return new NextResponse("File Not Found", { status: 404 });
    }

    // ── ENCRYPTED PATH: Full buffer download & AES-256-CBC decryption ─────────
    let encryptedBuf: Buffer | null = await downloadBufferFromRustFS(media.filename);

    if (!encryptedBuf) {
      const candidateDirs = [
        path.join(process.cwd(), "storage", "secure-media"),
        path.join(process.cwd(), "apps", "web", "storage", "secure-media"),
        path.resolve(__dirname, "../../../../../storage/secure-media"),
        "/app/apps/web/storage/secure-media"
      ];
      for (const dir of candidateDirs) {
        const filePath = path.resolve(dir, media.filename);
        if (filePath.startsWith(path.resolve(dir) + path.sep) && fs.existsSync(filePath)) {
          encryptedBuf = fs.readFileSync(filePath);
          break;
        }
      }
    }

    if (!encryptedBuf) {
      return new NextResponse("File Not Found", { status: 404 });
    }

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

export async function OPTIONS() {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://masdika.id";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Origin, Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}
