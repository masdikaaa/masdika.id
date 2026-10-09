import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';
import { deleteLocalFile } from '@/lib/file-utils';
import { isSafeUrl, parseId, MAX_IMG_URL } from '../../../route';

const MAX_TITLE   = 300;
const MAX_EXCERPT = 500;
const MAX_CONTENT = 200_000;
const MAX_VID_URL = 500;

function isValidYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return host === 'www.youtube.com' || host === 'youtube.com' || host === 'youtu.be';
  } catch {
    return false;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; epId: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, epId } = await params;
  const seriesId = parseId(id);
  const episodeId = parseId(epId);
  if (!seriesId || !episodeId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const episode = await prisma.episode.findFirst({
      where: { id: episodeId, seriesId }, // ← ownership check
    });
    if (!episode) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(episode);
  } catch (error) {
    console.error('Error fetching episode:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; epId: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, epId } = await params;
  const seriesId = parseId(id);
  const episodeId = parseId(epId);
  if (!seriesId || !episodeId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    // ── Ownership check ───────────────────────────────────────────────────
    const existing = await prisma.episode.findFirst({
      where: { id: episodeId, seriesId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Episode not found' }, { status: 404 });

    const body = await req.json();
    const { title, excerpt, content, image, videoUrl, order, published } = body;

    // ── Validate ──────────────────────────────────────────────────────────
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      if (title.length > MAX_TITLE) {
        return NextResponse.json({ error: `Title too long` }, { status: 400 });
      }
    }
    if (excerpt !== undefined && typeof excerpt === 'string' && excerpt.length > MAX_EXCERPT) {
      return NextResponse.json({ error: 'Excerpt too long' }, { status: 400 });
    }
    if (content !== undefined && typeof content === 'string' && content.length > MAX_CONTENT) {
      return NextResponse.json({ error: 'Content too large' }, { status: 400 });
    }
    if (image !== undefined && image !== null && (typeof image !== 'string' || !isSafeUrl(image) || image.length > MAX_IMG_URL)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }
    if (videoUrl !== undefined && videoUrl !== null && (typeof videoUrl !== 'string' || !isValidYouTubeUrl(videoUrl) || videoUrl.length > MAX_VID_URL)) {
      return NextResponse.json({ error: 'Invalid video URL. Only YouTube links are allowed.' }, { status: 400 });
    }
    if (order !== undefined && (!Number.isFinite(order) || order < 0)) {
      return NextResponse.json({ error: 'Invalid order value' }, { status: 400 });
    }

    const episode = await prisma.episode.update({
      where: { id: episodeId },
      data: {
        ...(title    && { title: title.trim(), slug: slugify(title.trim()) }),
        ...(excerpt  !== undefined && { excerpt: typeof excerpt === 'string' ? excerpt.trim() || null : null }),
        ...(content  !== undefined && { content: typeof content === 'string' ? content : '' }),
        ...(image    !== undefined && { image: image || null }),
        ...(videoUrl !== undefined && { videoUrl: videoUrl || null }),
        ...(order    !== undefined && Number.isFinite(order) && { order }),
        ...(published !== undefined && { published: published === true }),
      },
    });
    return NextResponse.json(episode);
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    console.error('Error updating episode:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; epId: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, epId } = await params;
  const seriesId = parseId(id);
  const episodeId = parseId(epId);
  if (!seriesId || !episodeId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    // ── Ownership check — only delete if episode belongs to this series ───
    const existing = await prisma.episode.findFirst({
      where: { id: episodeId, seriesId },
      select: { id: true, image: true },
    });
    if (!existing) return NextResponse.json({ error: 'Episode not found' }, { status: 404 });

    if (existing.image) {
      deleteLocalFile(existing.image);
    }

    await prisma.episode.delete({ where: { id: episodeId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    console.error('Error deleting episode:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
