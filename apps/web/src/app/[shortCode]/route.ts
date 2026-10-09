import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, props: { params: Promise<{ shortCode: string }> }) {
  try {
    const params = await props.params;
    const { shortCode } = params;
    
    // Ignore common reserved Next.js paths to prevent unnecessary DB queries
    if (shortCode.startsWith('_') || shortCode.includes('.') || ['api', 'admin', 'dashboard', 'login', 'register', 'favicon.ico'].includes(shortCode.toLowerCase())) {
      // Just pass through, though it shouldn't hit here if they exist
      return new NextResponse('Not Found', { status: 404 });
    }

    const shortLink = await prisma.shortLink.findUnique({
      where: { code: shortCode }
    });

    if (shortLink) {
      if (shortLink.status !== 'ACTIVE') {
        return NextResponse.redirect(new URL('/?error=link-suspended', request.url));
      }
      // Increment clicks asynchronously to not block redirect
      prisma.shortLink.update({
        where: { id: shortLink.id },
        data: { clicks: { increment: 1 } }
      }).catch(console.error);

      // Temporary redirect (307) so browser doesn't cache it forever,
      // allowing us to keep counting clicks
      return NextResponse.redirect(shortLink.url, 307);
    }

    // If not found, redirect to a 404 page or home
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error("Short URL Redirect Error:", error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
