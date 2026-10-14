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
  // 1. Cloudflare edge header (highest priority, untamperable via Cloudflare proxy)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim() && cfIp !== 'unknown') return cfIp.trim();

  // 2. Akamai / Cloudflare Enterprise true client header
  const trueClientIp = req.headers.get('true-client-ip');
  if (trueClientIp && trueClientIp.trim() && trueClientIp !== 'unknown') return trueClientIp.trim();

  // 3. NextRequest internal client IP if available
  if ('ip' in req && typeof (req as any).ip === 'string' && (req as any).ip.trim() && (req as any).ip !== 'unknown') {
    return (req as any).ip.trim();
  }

  // 4. Standard forwarded-for: first entry is the original client
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first && first !== 'unknown') return first;
  }

  // 5. Nginx / load balancer real IP header
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim() && realIp !== 'unknown') return realIp.trim();

  return 'unknown';
}

/**
 * getIpVariants - returns possible representations of an IP
 * (e.g., IPv4 mapped IPv6 ::ffff:127.0.0.1, 127.0.0.1, ::1)
 * to prevent duplicate rating/comment bypassing via IP representation mismatch.
 */
export function getIpVariants(ip: string): string[] {
  const set = new Set<string>();
  if (!ip || ip === 'unknown') return ['unknown'];
  const clean = ip.trim();
  set.add(clean);

  if (clean.startsWith('::ffff:')) {
    set.add(clean.replace('::ffff:', ''));
  } else if (!clean.includes(':')) {
    set.add(`::ffff:${clean}`);
  }

  if (clean === '127.0.0.1' || clean === '::1' || clean === '::ffff:127.0.0.1') {
    set.add('127.0.0.1');
    set.add('::1');
    set.add('::ffff:127.0.0.1');
  }

  return Array.from(set);
}
