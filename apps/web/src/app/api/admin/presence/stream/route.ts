import { requireAuth } from '@/lib/auth-middleware';
import { presenceEmitter, fetchOnlineUsersList } from '@/lib/presence-emitter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'SUPER_ADMIN'] });
  if (auth.error || !auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const safeEnqueue = (str: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(str));
        } catch {
          isClosed = true;
        }
      };

      // Push 2KB initial comment padding to immediately bypass Cloudflare / Traefik / Nginx buffering
      safeEnqueue(`: ${' '.repeat(2048)}\n\n`);

      // 1. Send initial state immediately
      try {
        const initialUsers = await fetchOnlineUsersList();
        safeEnqueue(`event: init\ndata: ${JSON.stringify(initialUsers)}\n\n`);
      } catch (err) {
        console.error('Error sending initial presence state:', err);
      }

      // 2. Listen to real-time presence pings
      const onPing = (data: any) => {
        safeEnqueue(`event: ping\ndata: ${JSON.stringify(data)}\n\n`);
      };

      presenceEmitter.on('presence_ping', onPing);

      // 3. Periodic full sync & keep-alive every 15s to prune users whose 5m expired
      const syncInterval = setInterval(async () => {
        if (isClosed) return;
        try {
          const currentOnline = await fetchOnlineUsersList();
          safeEnqueue(`event: sync\ndata: ${JSON.stringify(currentOnline)}\n\n`);
          safeEnqueue(`: keepalive ${Date.now()}\n\n`);
        } catch (err) {
          console.error('Presence sync error:', err);
        }
      }, 15000);

      // 4. Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        isClosed = true;
        presenceEmitter.off('presence_ping', onPing);
        clearInterval(syncInterval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for Nginx/proxies
    },
  });
}

