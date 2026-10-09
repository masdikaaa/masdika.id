import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sizeParam = searchParams.get("size");

  if (!sizeParam) {
    return new Response("Missing size parameter", { status: 400 });
  }

  // Size in MB
  const sizeMB = parseInt(sizeParam, 10);
  if (isNaN(sizeMB) || sizeMB <= 0 || sizeMB > 1000) {
    return new Response("Invalid size parameter", { status: 400 });
  }

  const totalBytes = sizeMB * 1024 * 1024;
  const chunkSize = 1024 * 1024; // 1MB chunks

  // Create a readable stream that yields zeros
  const stream = new ReadableStream({
    start(controller) {
      let bytesSent = 0;

      function push() {
        if (bytesSent >= totalBytes) {
          controller.close();
          return;
        }

        const remaining = totalBytes - bytesSent;
        const currentChunkSize = Math.min(chunkSize, remaining);
        const chunk = new Uint8Array(currentChunkSize);
        // Uint8Array is automatically initialized to 0

        controller.enqueue(chunk);
        bytesSent += currentChunkSize;

        // Use setImmediate or setTimeout to prevent event loop blocking
        setTimeout(push, 0);
      }

      push();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="test-${sizeMB}MB.bin"`,
      "Content-Length": totalBytes.toString(),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
