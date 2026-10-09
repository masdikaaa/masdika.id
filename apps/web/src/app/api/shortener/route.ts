import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { validateApiKey } from '@/lib/api-key';

// Generate a random string for short link
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  let userId = null;
  const urlParams = new URL(req.url).searchParams;
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "") || urlParams.get("apikey");

  if (apiKey) {
    const authResult = await validateApiKey(req as any, "shortener");
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    userId = authResult.keyData?.userId;
  } else {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    userId = auth.user!.id;
  }

  // Bypass limits for admins
  const adminCheck = !apiKey ? await requireAuth({ allowedRoles: ['ADMIN'] }) : { error: true };
  const isAdmin = !adminCheck.error;
  
  if (!isAdmin && userId) {
    const { enforceShortenerLimit } = await import('@/lib/billing-limits');
    try {
      await enforceShortenerLimit(userId);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
  }

  try {
    const { url, code } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(url);
      // Only allow http and https to prevent javascript:, file://, ftp:// etc.
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Only HTTP and HTTPS URLs are allowed" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    let finalCode = code?.trim();
    if (finalCode) finalCode = finalCode.toLowerCase();
    
    if (finalCode) {
      if (!/^[a-zA-Z0-9-_]+$/.test(finalCode)) {
        return NextResponse.json({ error: "Custom alias can only contain letters, numbers, hyphens, and underscores" }, { status: 400 });
      }

      // Ensure custom code doesn't conflict with reserved routes
      const reserved = ['admin', 'api', 'dashboard', 'login', 'register', 'opportunities', 'api-hub', 'blog', 'community', '_next'];
      if (reserved.includes(finalCode.toLowerCase())) {
        return NextResponse.json({ error: "This alias is reserved and cannot be used" }, { status: 400 });
      }

      const existing = await prisma.shortLink.findUnique({
        where: { code: finalCode }
      });
      if (existing) {
        return NextResponse.json({ error: "Custom alias already exists" }, { status: 400 });
      }
    } else {
      finalCode = generateShortCode();
      let existing = await prisma.shortLink.findUnique({ where: { code: finalCode } });
      while (existing) {
        finalCode = generateShortCode();
        existing = await prisma.shortLink.findUnique({ where: { code: finalCode } });
      }
    }

    const shortLink = await prisma.shortLink.create({
      data: {
        code: finalCode,
        url,
        userId: userId,
      }
    });

    return NextResponse.json({ 
      message: "Short link created successfully",
      shortLink 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Shortener API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  let userId = null;
  const urlParams = new URL(req.url).searchParams;
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "") || urlParams.get("apikey");

  if (apiKey) {
    const authResult = await validateApiKey(req as any, "shortener");
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    userId = authResult.keyData?.userId;
  } else {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    userId = auth.userId;

    const { hasActiveSubscription } = await import('@/lib/subscription');
    const hasSub = await hasActiveSubscription(userId!, "SHORTENER");
    if (!hasSub && auth.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "You don't have an active URL Shortener subscription." }, { status: 403 });
    }
  }

  try {
    const shortLinks = await prisma.shortLink.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(shortLinks);
  } catch (error) {
    console.error("Shortener API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  let userId = null;
  const urlParams = new URL(req.url).searchParams;
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "") || urlParams.get("apikey");

  if (apiKey) {
    const authResult = await validateApiKey(req as any, "shortener");
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    userId = authResult.keyData?.userId;
  } else {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    userId = auth.userId;
  }

  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    // Ensure we only delete the links belonging to the authenticated user
    const deleteResult = await prisma.shortLink.deleteMany({
      where: {
        id: { in: ids },
        userId: userId!,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${deleteResult.count} short links`,
      count: deleteResult.count 
    });
  } catch (error) {
    console.error("Shortener API Delete Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
