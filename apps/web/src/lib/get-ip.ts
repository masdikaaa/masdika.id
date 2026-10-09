/**
 * getClientIp — Cloudflare-aware IP extraction
 *
 * Priority order (highest trust first):
 * 1. CF-Connecting-IP  — set by Cloudflare edge, cannot be spoofed when using cloudflared
 * 2. X-Real-IP         — set by Nginx/reverse proxies
 * 3. X-Forwarded-For   — first entry in the chain (closest client)
 * 4. Fallback          — 'unknown'
 *
 * When deployed via Cloudflare Tunnel (cloudflared), CF-Connecting-IP is always
 * the real visitor IP and is 100% trustworthy. X-Forwarded-For can be spoofed
 * if traffic bypasses Cloudflare, but with cloudflared it's tunneled so that
 * risk is mitigated.
 */
export function getClientIp(req: Request): string {
  // Cloudflare Tunnel: CF-Connecting-IP is the real visitor IP
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  // Nginx / load balancer real IP header
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  // Standard forwarded-for: take first (original client) entry
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  return 'unknown';
}
