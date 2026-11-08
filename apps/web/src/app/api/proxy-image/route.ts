import { NextResponse } from 'next/server';
import { validateSafeUrl } from '@/lib/ssrf';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';

// Whitelist of allowed domains for image proxying
const ALLOWED_DOMAINS = [
  'pps.whatsapp.net',
  'mmg.whatsapp.net',
  'web.whatsapp.com',
  'static.whatsapp.net',
];

// Strict raster-only MIME allowlist (blocks image/svg+xml XSS)
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit('PROXY_IMAGE', ip, 60, 60))) {
      return new NextResponse('Too many requests', { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url || url.length > 2048) {
      return new NextResponse('Missing or invalid url parameter', { status: 400 });
    }

    // Enterprise SSRF Mitigation:
    // 1. Enforce HTTPS only
    // 2. Enforce strict port 443
    // 3. Enforce whitelist of legitimate image CDN domains
    // 4. Resolve DNS to ensure destination does not point to internal/private IP space
    const validation = await validateSafeUrl(url, {
      allowedProtocols: ['https:'],
      allowedDomains: ALLOWED_DOMAINS,
      allowedPorts: [443],
    });

    if (!validation.safe) {
      console.warn(`[SECURITY ALERT] [SSRF BLOCKED] Destination rejected: ${url} (Reason: ${validation.reason})`);
      return new NextResponse(`URL not allowed: ${validation.reason}`, { status: 403 });
    }

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'error', // Crucial SSRF mitigation: refuse HTTP redirects to prevent redirecting to internal IPs
      headers: {
        'User-Agent': 'WhatsApp/2.21.12.21 A',
        'Accept': 'image/webp,image/apng,image/jpeg,image/png,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!res.ok) {
      return new NextResponse('Failed to fetch image', { status: res.status });
    }

    const rawMime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

    // Validate that the response is strictly a safe raster image (blocks SVG/HTML XSS)
    if (!ALLOWED_IMAGE_MIMES.has(rawMime)) {
      return new NextResponse('Unsupported image MIME type', { status: 400 });
    }

    const arrayBuffer = await res.arrayBuffer();

    // Limit response size to 5MB
    if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
      return new NextResponse('Image too large', { status: 413 });
    }

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': rawMime,
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

