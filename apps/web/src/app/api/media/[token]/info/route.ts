import { getClientIp } from '@/lib/get-ip';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // UUID validation
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Rate limit: 120 info requests per IP per minute
  const ip = getClientIp(req);
  const allowed = await checkRateLimit("MEDIA_INFO", ip, 120, 60);
  if (!allowed) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  try {
    const media = await prisma.secureMedia.findUnique({
      where: { token },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        expiresAt: true,
        token: true,
        // Never expose: filename (internal storage path)
      },
    });

    if (!media) return new NextResponse("Not Found", { status: 404 });

    if (media.expiresAt && media.expiresAt < new Date()) {
      return new NextResponse("Link has expired", { status: 410 });
    }

    return NextResponse.json(media, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Media info error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
