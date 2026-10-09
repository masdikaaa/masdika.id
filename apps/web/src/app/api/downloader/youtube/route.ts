import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { validateApiKey } from '@/lib/api-key';
import ytdl from '@distube/ytdl-core';

export async function POST(req: Request) {
  let userId = null;
  const urlParams = new URL(req.url).searchParams;
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "") || urlParams.get("apikey");

  if (apiKey) {
    const authResult = await validateApiKey(req as any, "youtube");
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
        hostname !== 'youtube.com' &&
        hostname !== 'www.youtube.com' &&
        hostname !== 'm.youtube.com' &&
        hostname !== 'youtu.be' &&
        !hostname.endsWith('.youtube.com')
      ) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // Check and Enforce Limit
    const { enforceApiLimit } = await import('@/lib/billing-limits');
    await enforceApiLimit(userId!, 'YOUTUBE');

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const thumbnail = info.videoDetails.thumbnails.length > 0 
      ? info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url 
      : null;
    const duration = info.videoDetails.lengthSeconds;

    // Filter formats: get highest video + audio (mp4)
    const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
    const highestVideo = videoFormats.length > 0 ? videoFormats[0].url : null;

    // Filter formats: get highest audio only (for mp3/m4a)
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const highestAudio = audioFormats.length > 0 ? audioFormats[0].url : null;

    return NextResponse.json({
      success: true,
      data: {
        title,
        thumbnail,
        duration: `${duration} seconds`,
        urls: {
          video: highestVideo,
          audio: highestAudio
        }
      }
    });

  } catch (error: any) {
    console.error("YouTube Downloader Error:", error);
    return NextResponse.json(
      { error: "Failed to process YouTube video. It might be private or age-restricted." },
      { status: 500 }
    );
  }
}
