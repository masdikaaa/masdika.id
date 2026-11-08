import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/get-ip";
import { checkRateLimit } from "@/lib/rate-limit";

// Shared read-only zero buffer (64KB) so concurrent speed-test streams allocate near-zero heap
const ZERO_CHUNK = new Uint8Array(64 * 1024);

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit("LG_TEST_FILE", ip, 5, 60))) {
    return new Response("Rate limit exceeded. Please wait before running another speed test.", { status: 429 });
  }

  const searchParams = req.nextUrl.searchParams;
  const sizeParam = searchParams.get("size");

  if (!sizeParam) {
    return new Response("Missing size parameter", { status: 400 });
  }

  // Size in MB (capped at 100MB to prevent bandwidth/memory amplification)
  const sizeMB = parseInt(sizeParam, 10);
  if (isNaN(sizeMB) || sizeMB <= 0 || sizeMB > 100) {
    return new Response("Invalid size parameter (1-100 MB allowed)", { status: 400 });
  }

  const totalBytes = sizeMB * 1024 * 1024;
  let bytesSent = 0;

  // Pull-based stream respects client TCP backpressure with zero unbounded buffering
  const stream = new ReadableStream({
    pull(controller) {
      if (bytesSent >= totalBytes) {
        controller.close();
        return;
      }

      const remaining = totalBytes - bytesSent;
      const currentChunkSize = Math.min(ZERO_CHUNK.byteLength, remaining);
      const view = currentChunkSize === ZERO_CHUNK.byteLength
        ? ZERO_CHUNK
        : ZERO_CHUNK.subarray(0, currentChunkSize);

      controller.enqueue(view);
      bytesSent += currentChunkSize;

      if (bytesSent >= totalBytes) {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="test-${sizeMB}MB.bin"`,
      "Content-Length": totalBytes.toString(),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
