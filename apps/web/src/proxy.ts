import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { logger } from './lib/logger';

// In-memory store for rate limiting
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const criticalRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 300; // 300 requests per minute for normal routes
const MAX_CRITICAL_REQUESTS = 10; // 10 requests per minute for auth/billing

// Known bot/scraper user agents
const BLOCKED_USER_AGENTS = [
  'python-requests',
  'curl',
  'wget',
  'scrapy',
  'postman',
  'insomnia'
];

/**
 * Verify session token in middleware (Edge-compatible).
 * We inline the verification logic here because middleware runs in the Edge runtime
 * and we want to keep the session.ts lib usable in both environments.
 */
function verifySessionTokenEdge(token: string | undefined | null, secret: string): { userId: number, role: string } | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('hex');

  // Constant-length check before timing-safe compare
  if (signature.length !== expectedSignature.length) return null;

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;

    // Validate userId
    if (!payload.userId || typeof payload.userId !== 'number') return null;

    return { userId: payload.userId, role: payload.role || 'USER' };
  } catch {
    return null;
  }
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_fallback_session_secret_do_not_use_in_production';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Allow health check endpoint to bypass all middleware checks (Docker health probes)
  if (pathname === '/api/health') {
    return new NextResponse('OK', { status: 200 });
  }

  // Log incoming requests for ELK
  if (pathname.startsWith('/api')) {
    logger.info(`Incoming API Request: ${request.method} ${pathname}`, {
      ip: (request as any).ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown-ip',
      method: request.method,
      url: pathname,
      user_agent: request.headers.get('user-agent') || 'unknown'
    });
  }

  // 1. User Agent Filtering
  const userAgent = request.headers.get('user-agent') || '';
  const isResellerApi = pathname.startsWith('/api/v1');
  
  if (!isResellerApi && (!userAgent || BLOCKED_USER_AGENTS.some(ua => userAgent.toLowerCase().includes(ua)))) {
    return new NextResponse('Forbidden: Access denied for your client.', { status: 403 });
  }

  // 2. IP Rate Limiting
  let ip = (request as any).ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown-ip';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  const now = Date.now();
  if (ip !== 'unknown-ip' && !request.nextUrl.pathname.startsWith('/_next') && !request.nextUrl.pathname.startsWith('/favicon.ico')) {
    const isCriticalRoute = 
      request.nextUrl.pathname.startsWith('/api/auth') || 
      request.nextUrl.pathname.startsWith('/api/user/topup') ||
      request.nextUrl.pathname.startsWith('/api/user/checkout');

    const store = isCriticalRoute ? criticalRequestCounts : ipRequestCounts;
    const limit = isCriticalRoute ? MAX_CRITICAL_REQUESTS : MAX_REQUESTS;
    
    const record = store.get(ip);
    
    if (record) {
      if (now > record.resetTime) {
        store.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
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
      store.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
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


  const isAdminPath = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  let response: NextResponse | undefined;

  // Skip middleware for public APIs (login, logout) or impersonation stop
  const isStopImpersonate = pathname === '/api/admin/impersonate/stop' || pathname === '/api/auth/impersonate/stop';
  if (pathname === '/api/auth/login' || pathname === '/api/auth/logout' || isStopImpersonate) {
    response = NextResponse.next();
  }

  // Check authentication for protected paths
  if (isAdminPath || isAdminApi || pathname.startsWith('/dashboard') || pathname.startsWith('/api/user')) {
    // STRICT RUNTIME SECURITY CHECK
    if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || SESSION_SECRET === 'dev_fallback_session_secret_do_not_use_in_production')) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is missing. Middleware cannot safely verify sessions.');
    }

    const sessionCookie = request.cookies.get('admin_session');
    const session = verifySessionTokenEdge(sessionCookie?.value, SESSION_SECRET);

    if (!session?.userId) {
      if (isAdminApi) {
        // Return 401 for API requests
        response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      } else {
        // Redirect to login page for UI requests
        response = NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // For admin paths/APIs, also enforce ADMIN role (not just authenticated), except when stopping impersonation
    if (!response && (isAdminPath || isAdminApi) && session?.role !== 'ADMIN' && !isStopImpersonate) {
      if (isAdminApi) {
        response = NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      } else {
        response = NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // Prevent logged in users from accessing the login page
  if (!response && pathname === '/login') {
    const sessionCookie = request.cookies.get('admin_session');
    const session = verifySessionTokenEdge(sessionCookie?.value, SESSION_SECRET);
    if (session?.userId) {
      if (session.role === 'ADMIN') {
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
  // Ensures browser always loads the latest UI without getting stuck on old cached pages.
  // Data caching is handled on the server via Redis.
  if (!pathname.startsWith('/uploads/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - static files (.webp, .png, .jpg, .svg, .woff2, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
};
