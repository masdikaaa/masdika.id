import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';
import { isSafeUrl, parseId, MAX_IMG_URL } from '../../route';

const MAX_TITLE   = 300;
const MAX_EXCERPT = 500;
const MAX_CONTENT = 200_000; // ~200KB
const MAX_VID_URL = 500;

/** Validate a YouTube URL only — rejects any other domain */
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const seriesId = parseId(id);
  if (!seriesId) return NextResponse.json({ error: 'Invalid series ID' }, { status: 400 });

  try {
    // Verify series exists and belongs to this admin operation
    const seriesExists = await prisma.series.findUnique({ where: { id: seriesId }, select: { id: true } });
    if (!seriesExists) return NextResponse.json({ error: 'Series not found' }, { status: 404 });

    const body = await req.json();
    const { title, excerpt, content, image, videoUrl, order, published } = body;

    // ── Validate ──────────────────────────────────────────────────────────
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.length > MAX_TITLE) {
      return NextResponse.json({ error: `Title must be ${MAX_TITLE} characters or less` }, { status: 400 });
    }
    if (excerpt && typeof excerpt === 'string' && excerpt.length > MAX_EXCERPT) {
      return NextResponse.json({ error: `Excerpt too long` }, { status: 400 });
    }
    if (content && typeof content === 'string' && content.length > MAX_CONTENT) {
      return NextResponse.json({ error: 'Content too large' }, { status: 400 });
    }
    if (image && (typeof image !== 'string' || !isSafeUrl(image) || image.length > MAX_IMG_URL)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }
    if (videoUrl && (typeof videoUrl !== 'string' || !isValidYouTubeUrl(videoUrl) || videoUrl.length > MAX_VID_URL)) {
      return NextResponse.json({ error: 'Invalid video URL. Only YouTube links are allowed.' }, { status: 400 });
    }
    if (order !== undefined && order !== null && (!Number.isFinite(order) || order < 0)) {
      return NextResponse.json({ error: 'Invalid order value' }, { status: 400 });
    }

    const slug = slugify(title.trim());
    if (!slug) return NextResponse.json({ error: 'Could not generate slug from title' }, { status: 400 });

    // Auto order
    let epOrder = typeof order === 'number' && Number.isFinite(order) ? order : undefined;
    if (epOrder === undefined) {
      const last = await prisma.episode.findFirst({
        where: { seriesId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      epOrder = (last?.order ?? -1) + 1;
    }

    const episode = await prisma.episode.create({
      data: {
        title: title.trim(),
        slug,
        excerpt: typeof excerpt === 'string' ? excerpt.trim() || null : null,
        content: typeof content === 'string' ? content : '',
        image: image || null,
        videoUrl: videoUrl || null,
        order: epOrder,
        published: published === true,
        seriesId,
      },
    });
    return NextResponse.json(episode);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'An episode with this title already exists in this series' }, { status: 409 });
    }
    console.error('Error creating episode:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
