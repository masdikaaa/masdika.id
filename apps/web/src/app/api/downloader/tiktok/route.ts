import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { validateApiKey } from '@/lib/api-key';

export async function POST(req: Request) {
  let userId = null;
  const urlParams = new URL(req.url).searchParams;
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "") || urlParams.get("apikey");

  if (apiKey) {
    const authResult = await validateApiKey(req as any, "tiktok");
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    userId = authResult.keyData?.userId;
  } else {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    userId = auth.user!.id;
  }

  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Security: Validate hostname to prevent SSRF via spoofed URLs
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname !== 'tiktok.com' &&
        hostname !== 'www.tiktok.com' &&
        hostname !== 'm.tiktok.com' &&
        !hostname.endsWith('.tiktok.com')
      ) {
        return NextResponse.json({ error: "Invalid TikTok URL" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid TikTok URL" }, { status: 400 });
    }

    // Check and Enforce Limit
    const { enforceApiLimit } = await import('@/lib/billing-limits');
    await enforceApiLimit(userId!, 'TIKTOK');

    // Proxy the request to tikwm API
    const response = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from TikTok scraper: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0 || !data.data) {
      return NextResponse.json(
        { error: "Failed to process TikTok video. It might be private or invalid." },
        { status: 400 }
      );
    }

    const tiktokData = data.data;

    return NextResponse.json({
      success: true,
      data: {
        title: tiktokData.title,
        cover: tiktokData.cover,
        duration: `${tiktokData.duration} seconds`,
        author: tiktokData.author?.nickname || 'Unknown',
        urls: {
          video_no_watermark: tiktokData.play,
          audio: tiktokData.music
        }
      }
    });

  } catch (error: any) {
    console.error("TikTok Downloader Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error while processing TikTok video" },
      { status: 500 }
    );
  }
}
