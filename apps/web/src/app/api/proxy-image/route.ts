import { NextResponse } from 'next/server';

// Whitelist of allowed domains for image proxying
const ALLOWED_DOMAINS = [
  'pps.whatsapp.net',
  'mmg.whatsapp.net',
  'web.whatsapp.com',
  'static.whatsapp.net',
];

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTPS
    if (url.protocol !== 'https:') return false;
    
    // Check against whitelist
    const hostname = url.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Validate URL against whitelist to prevent SSRF
    if (!isAllowedUrl(url)) {
      return new NextResponse('URL domain not allowed', { status: 403 });
    }

    const res = await fetch(url, {
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

