import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { logger } from './lib/logger';

// In-memory store for rate limiting (bounded to prevent memory exhaustion DoS)
const MAX_RATE_MAP_SIZE = 10_000;
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const criticalRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 300; // 300 requests per minute for normal routes
const MAX_CRITICAL_REQUESTS = 10; // 10 requests per minute for auth/billing
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

// Known bot/scraper user agents
const BLOCKED_USER_AGENTS = [
  'python-requests',
  'curl',
  'wget',
  'scrapy',
  'postman',
  'insomnia'
];

function extractClientIp(request: NextRequest): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim() && cfIp !== 'unknown') return cfIp.trim();

  const trueClientIp = request.headers.get('true-client-ip');
  if (trueClientIp && trueClientIp.trim() && trueClientIp !== 'unknown') return trueClientIp.trim();

  if ('ip' in request && typeof (request as any).ip === 'string' && (request as any).ip.trim()) {
    return (request as any).ip.trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim() && realIp !== 'unknown') return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first && first !== 'unknown') return first;
  }

  return 'unknown-ip';
}

function setBoundedRateEntry(
  store: Map<string, { count: number; resetTime: number }>,
  key: string,
  value: { count: number; resetTime: number },
  now: number
) {
  if (!store.has(key) && store.size >= MAX_RATE_MAP_SIZE) {
    for (const [k, v] of store.entries()) {
      if (now > v.resetTime) store.delete(k);
    }
    if (store.size >= MAX_RATE_MAP_SIZE) {
      const oldest = store.keys().next().value;
      if (oldest) store.delete(oldest);
    }
  }
  store.set(key, value);
}

/**
 * Verify session token in middleware (Edge-compatible).
 * We inline the verification logic here because middleware runs in the Edge runtime
 * and we want to keep the session.ts lib usable in both environments.
 */
function verifySessionTokenEdge(token: string | undefined | null, secret: string): { userId: number, role: string } | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  if (!/^[0-9a-f]{64}$/i.test(signature)) return null;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('hex');

  // Constant-length check before timing-safe compare
  if (signature.length !== expectedSignature.length) return null;

  const sigBuffer = Buffer.from(signature.toLowerCase(), 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    if (!payload || typeof payload !== 'object' || payload.purpose) return null;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') return null;
    if (now > payload.exp) return null;

    // Validate userId
    if (!Number.isSafeInteger(payload.userId) || payload.userId <= 0) return null;

    return { userId: payload.userId, role: payload.role || 'USER' };
  } catch {
    return null;
  }
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_fallback_session_secret_do_not_use_in_production';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = extractClientIp(request);

  // 0. Allow health check endpoint to bypass all middleware checks (Docker/K8s/Heartbeat probes)
  if (pathname === '/api/health') {
    return new NextResponse('OK', { status: 200 });
  }

  // Log incoming requests for ELK
  if (pathname.startsWith('/api')) {
    logger.info(`Incoming API Request: ${request.method} ${pathname}`, {
      ip,
      method: request.method,
      url: pathname,
      user_agent: request.headers.get('user-agent') || 'unknown'
    });
  }

  // 1. User Agent Filtering (exempt machine-to-machine endpoints: Reseller API, Duitku Webhook, Cron, Internal Metrics)
  const userAgent = request.headers.get('user-agent') || '';
  const isMachineApi =
    pathname.startsWith('/api/v1') ||
    pathname === '/api/payment/callback' ||
    pathname.startsWith('/api/cron/') ||
    pathname === '/api/metrics' ||
    pathname === '/api/health/deploy-readiness';
  
  if (!isMachineApi && (!userAgent || BLOCKED_USER_AGENTS.some(ua => userAgent.toLowerCase().includes(ua)))) {
    return new NextResponse('Forbidden: Access denied for your client.', { status: 403 });
  }

  // 1b. Cross-Site Request Forgery (CSRF) Origin Validation for Cookie-Authenticated Mutations
  const isMutatingMethod = request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH' || request.method === 'DELETE';
  if (isMutatingMethod && pathname.startsWith('/api/') && !isMachineApi) {
    const originHeader = request.headers.get('origin');
    if (originHeader) {
      try {
        const originHost = new URL(originHeader).host.toLowerCase();
        const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase();
        const directHost = request.headers.get('host')?.trim().toLowerCase();
        const appHost = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host.toLowerCase() : null;
        if (originHost !== forwardedHost && originHost !== directHost && (!appHost || originHost !== appHost)) {
          return NextResponse.json({ error: 'Forbidden: Cross-origin request blocked' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Forbidden: Invalid Origin header' }, { status: 403 });
      }
    }
  }

  // 2. IP Rate Limiting
  const now = Date.now();
  if (ip !== 'unknown-ip' && !pathname.startsWith('/_next') && !pathname.startsWith('/favicon.ico') && !pathname.startsWith('/api/cron/') && pathname !== '/api/metrics') {
    const isCriticalRoute = 
      pathname.startsWith('/api/auth') || 
      pathname.startsWith('/api/user/topup') ||
      pathname.startsWith('/api/user/checkout');

    const store = isCriticalRoute ? criticalRequestCounts : ipRequestCounts;
    const limit = isCriticalRoute ? MAX_CRITICAL_REQUESTS : MAX_REQUESTS;
    
    const record = store.get(ip);
    
    if (record) {
      if (now > record.resetTime) {
        setBoundedRateEntry(store, ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW }, now);
      } else {
        record.count++;
        if (record.count > limit) {
          return new NextResponse(JSON.stringify({ 
            error: 'Too Many Requests',
            message: 'Slow down. You are making too many requests. Please try again in a minute.' 
          }), { status: 429, headers: { 'Content-Type': 'application/json' } });
        }
      }
    } else {
      setBoundedRateEntry(store, ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW }, now);
    }
  }

  if (Math.random() < 0.05) {
    for (const [key, value] of ipRequestCounts.entries()) {
      if (now > value.resetTime) ipRequestCounts.delete(key);
    }
    for (const [key, value] of criticalRequestCounts.entries()) {
      if (now > value.resetTime) criticalRequestCounts.delete(key);
    }
  }


  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/');
  const isProtectedApi =
    isAdminApi ||
    pathname === '/api/user' ||
    pathname.startsWith('/api/user/') ||
    pathname === '/api/dashboard' ||
    pathname.startsWith('/api/dashboard/') ||
    pathname === '/api/tickets' ||
    pathname.startsWith('/api/tickets/') ||
    pathname === '/api/tunnels' ||
    pathname.startsWith('/api/tunnels/');
  const isProtectedUi = isAdminPath || pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  let response: NextResponse | undefined;

  // Skip middleware for public APIs (login, logout) or impersonation stop
  const isStopImpersonate = pathname === '/api/admin/impersonate/stop' || pathname === '/api/auth/impersonate/stop';
  if (pathname === '/api/auth/login' || pathname === '/api/auth/logout' || isStopImpersonate) {
    response = NextResponse.next();
  }

  // Check authentication for protected paths
  if ((isProtectedUi || isProtectedApi) && !isStopImpersonate) {
    // STRICT RUNTIME SECURITY CHECK
    if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || SESSION_SECRET === 'dev_fallback_session_secret_do_not_use_in_production')) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is missing. Middleware cannot safely verify sessions.');
    }

    const sessionCookie = request.cookies.get('admin_session');
    const session = verifySessionTokenEdge(sessionCookie?.value, SESSION_SECRET);

    if (!session?.userId) {
      if (isProtectedApi) {
        // Return 401 JSON for all protected API requests
        response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      } else {
        // Redirect to login page for UI requests
        response = NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // For admin paths/APIs, also enforce ADMIN / SUPER_ADMIN role (not just authenticated)
    if (!response && (isAdminPath || isAdminApi) && (!session?.role || !ADMIN_ROLES.has(session.role))) {
      if (isAdminApi) {
        response = NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      } else {
        response = NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // Prevent logged in users from accessing the login page (unless completing 2FA challenge)
  if (!response && pathname === '/login' && !request.nextUrl.searchParams.has('requires2fa')) {
    const sessionCookie = request.cookies.get('admin_session');
    const session = verifySessionTokenEdge(sessionCookie?.value, SESSION_SECRET);
    if (session?.userId) {
      if (session.role && ADMIN_ROLES.has(session.role)) {
        response = NextResponse.redirect(new URL('/admin', request.url));
      } else {
        response = NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  if (!response) {
    response = NextResponse.next();
  }

  // 3. Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // 4. Disable client browser caching for HTML routes & dynamic APIs
  // Ensures browser and Cloudflare CDN always load the latest UI without getting stuck on old cached pages.
  // Data caching is handled on the server via Redis.
  if (!pathname.startsWith('/uploads/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    response.headers.set('Surrogate-Control', 'no-store');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    // Always run proxy on all API, Admin, and Dashboard routes regardless of file extension suffixes
    '/api/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
    /*
     * Match all other request paths except for static assets:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public static files (.webp, .png, .jpg, .svg, .woff2, etc.)
     */
    '/((?!api/|admin/|dashboard/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
