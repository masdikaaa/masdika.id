import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SEED_DATA = [
  {
    slug: "cdn",
    name: "Masdika CDN",
    description: "Secure Content Delivery Network for Masdika platform. Allows you to upload files via POST with custom expiration (1d, 1w, 1m, permanent) and fetch files via GET. Max upload size 100MB.",
    icon: "download",
    endpoint: "https://www.masdika.id/api/public/upload",
    method: "POST",
    category: "Storage",
    isPremium: false,
  },
  {
    slug: "blog",
    name: "Masdika Blog API",
    description: "Access published blog posts from Masdika. Fetch a list of posts with pagination, filter by category or tag, search by keyword, or retrieve a single post by slug.",
    icon: "echo",
    endpoint: "https://www.masdika.id/api/blog",
    method: "GET",
    category: "Content",
    isPremium: false,
  },
  {
    slug: "shortener",
    name: "Masdika URL Shortener API",
    description: "Create and manage shortened URLs programmatically. Accepts a long URL and returns an auto-generated short link. Requires API Key authentication.",
    icon: "echo",
    endpoint: "https://www.masdika.id/api/shortener",
    method: "POST",
    category: "Tools",
    isPremium: false,
  },
  {
    slug: "youtube-downloader",
    name: "YouTube Downloader API",
    description: "Extract video metadata and direct MP4/MP3 download links from YouTube. Fast and reliable stream extraction.",
    icon: "download",
    endpoint: "https://www.masdika.id/api/downloader/youtube",
    method: "POST",
    category: "Downloader",
    isPremium: false,
  },
  {
    slug: "tiktok-downloader",
    name: "TikTok Downloader API",
    description: "Download TikTok videos without watermark and extract MP3 audio. High-quality instant processing.",
    icon: "download",
    endpoint: "https://www.masdika.id/api/downloader/tiktok",
    method: "POST",
    category: "Downloader",
    isPremium: false,
  },
  {
    slug: "spotify-downloader",
    name: "Spotify Downloader API",
    description: "Download Spotify tracks directly in high quality (MP3). Easy, fast, and secure API for developers.",
    icon: "download",
    endpoint: "https://www.masdika.id/api/downloader/spotify",
    method: "POST",
    category: "Downloader",
    isPremium: false,
  }
];

export async function GET(req: NextRequest) {
  try {
    // Upsert seed data to always ensure CDN + Blog are present
    for (const data of SEED_DATA) {
      await prisma.apiProject.upsert({
        where: { slug: data.slug },
        update: { name: data.name, description: data.description, endpoint: data.endpoint, category: data.category },
        create: data
      });
    }

    const projects = await prisma.apiProject.findMany({
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch API projects:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

