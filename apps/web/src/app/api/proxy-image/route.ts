import { NextResponse } from 'next/server';
import { validateSafeUrl } from '@/lib/ssrf';

// Whitelist of allowed domains for image proxying
const ALLOWED_DOMAINS = [
  'pps.whatsapp.net',
  'mmg.whatsapp.net',
  'web.whatsapp.com',
  'static.whatsapp.net',
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return new NextResponse('Missing url parameter', { status: 400 });
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
      return new NextResponse(`URL not allowed: ${validation.reason}`, { status: 403 });
    }

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'error', // Crucial SSRF mitigation: refuse HTTP redirects to prevent redirecting to internal IPs
      headers: {
        'User-Agent': 'WhatsApp/2.21.12.21 A',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!res.ok) {
      return new NextResponse('Failed to fetch image', { status: res.status });
    }

    const contentType = res.headers.get('content-type');
    
    // Validate that the response is actually an image
    if (contentType && !contentType.startsWith('image/')) {
      return new NextResponse('Response is not an image', { status: 400 });
    }

    const arrayBuffer = await res.arrayBuffer();

    // Limit response size to 5MB
    if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
      return new NextResponse('Image too large', { status: 413 });
    }

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

