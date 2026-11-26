import { getDnsdistStats } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Ignore already closed controller
        }
      };

      req.signal.addEventListener("abort", close);

      const pushSample = async () => {
        if (closed) return;
        try {
          const stats = await getDnsdistStats();
          if (closed) return;
          if (!stats.available) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ available: false })}\n\n`));
            return;
          }
          const { reason: _reason, ...publicStats } = stats;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(publicStats)}\n\n`));
        } catch {
          // Ignore transient tick errors; next 1s tick will recover
        }
      };

      // Send immediately on connect, then every 1 second
      await pushSample();
      const interval = setInterval(() => {
        pushSample();
      }, 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
