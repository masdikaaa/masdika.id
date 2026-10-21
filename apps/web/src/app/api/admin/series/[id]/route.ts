import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';
import { deleteLocalFile } from '@/lib/file-utils';
import { invalidateCache } from '@/lib/cache';
import { isSafeUrl, parseId, ALLOWED_LEVELS, MAX_IMG_URL } from '../route';

const MAX_TITLE = 200;
const MAX_DESC  = 2000;
const MAX_TAGS  = 300;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const seriesId = parseId(id);
  if (!seriesId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const { searchParams } = new URL(req.url);
    const epPage = Math.max(1, parseInt(searchParams.get('epPage') || '1', 10));
    const epLimit = Math.max(1, parseInt(searchParams.get('epLimit') || '10', 10));
    const epSkip = (epPage - 1) * epLimit;

    const series = await prisma.series.findUnique({
      where: { id: seriesId },
    });
    
    if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [episodes, totalEpisodes] = await Promise.all([
      prisma.episode.findMany({
        where: { seriesId },
        orderBy: { order: 'asc' },
        skip: epSkip,
        take: epLimit,
      }),
      prisma.episode.count({ where: { seriesId } })
    ]);

    return NextResponse.json({
      ...series,
      episodes,
      meta: {
        episodes: {
          total: totalEpisodes,
          page: epPage,
          limit: epLimit,
          totalPages: Math.ceil(totalEpisodes / epLimit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const seriesId = parseId(id);
  if (!seriesId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const body = await req.json();
    const { title, description, image, level, tags, published } = body;

    // ── Validate fields ───────────────────────────────────────────────────
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      if (title.length > MAX_TITLE) {
        return NextResponse.json({ error: `Title must be ${MAX_TITLE} characters or less` }, { status: 400 });
      }
    }
    if (description !== undefined && typeof description === 'string' && description.length > MAX_DESC) {
      return NextResponse.json({ error: `Description too long` }, { status: 400 });
    }
    if (image !== undefined && image !== null && (typeof image !== 'string' || !isSafeUrl(image) || image.length > MAX_IMG_URL)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }
    if (level !== undefined && !ALLOWED_LEVELS.includes(level)) {
      return NextResponse.json({ error: 'Invalid level value' }, { status: 400 });
    }
    if (tags !== undefined && typeof tags === 'string' && tags.length > MAX_TAGS) {
      return NextResponse.json({ error: 'Tags too long' }, { status: 400 });
    }

    const series = await prisma.series.update({
      where: { id: seriesId },
      data: {
        ...(title    && { title: title.trim(), slug: slugify(title.trim()) }),
        ...(description !== undefined && { description: typeof description === 'string' ? description.trim() : '' }),
        ...(image    !== undefined && { image: image || null }),
        ...(level    !== undefined && ALLOWED_LEVELS.includes(level) && { level }),
        ...(tags     !== undefined && { tags: typeof tags === 'string' ? tags.trim() || null : null }),
        ...(published !== undefined && { published: published === true }),
      },
    });

    try {
      await invalidateCache('series:*');
      revalidatePath('/series');
      revalidatePath(`/series/${series.slug}`);
      revalidatePath('/', 'layout');
    } catch (cacheErr) {
      console.warn('Failed to revalidate cache after series update:', cacheErr);
    }

    return NextResponse.json(series);
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    if (error?.code === 'P2002') return NextResponse.json({ error: 'A series with this title already exists' }, { status: 409 });
    console.error('Error updating series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const seriesId = parseId(id);
  if (!seriesId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (series?.image) {
      deleteLocalFile(series.image);
    }
    
    await prisma.series.delete({ where: { id: seriesId } });

    try {
      await invalidateCache('series:*');
      revalidatePath('/series');
      if (series?.slug) {
        revalidatePath(`/series/${series.slug}`);
      }
      revalidatePath('/', 'layout');
    } catch (cacheErr) {
      console.warn('Failed to revalidate cache after series delete:', cacheErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    console.error('Error deleting series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
