import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

// ─── Constants ───────────────────────────────────────────────────────────────
const ALLOWED_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
const MAX_TITLE   = 200;
const MAX_DESC    = 2000;
const MAX_TAGS    = 300;
const MAX_IMG_URL = 500;

/** Basic HTTPS URL check — rejects non-http(s) schemes to prevent javascript: etc. */
function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Parse and validate a positive integer from a route param */
function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const [series, total] = await Promise.all([
      prisma.series.findMany({
        skip,
        take: limit,
        include: { episodes: { select: { id: true, published: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.series.count()
    ]);

    return NextResponse.json({
      data: series,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { title, description, image, level, tags, published } = body;

    // ── Validate required fields ──────────────────────────────────────────
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.trim().length > MAX_TITLE) {
      return NextResponse.json({ error: `Title must be ${MAX_TITLE} characters or less` }, { status: 400 });
    }

    // ── Validate optional fields ──────────────────────────────────────────
    if (description && typeof description === 'string' && description.length > MAX_DESC) {
      return NextResponse.json({ error: `Description must be ${MAX_DESC} characters or less` }, { status: 400 });
    }
    if (image && (typeof image !== 'string' || !isSafeUrl(image) || image.length > MAX_IMG_URL)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }
    if (level && !ALLOWED_LEVELS.includes(level)) {
      return NextResponse.json({ error: 'Invalid level value' }, { status: 400 });
    }
    if (tags && typeof tags === 'string' && tags.length > MAX_TAGS) {
      return NextResponse.json({ error: `Tags too long` }, { status: 400 });
    }

    const slug = slugify(title.trim());
    if (!slug) {
      return NextResponse.json({ error: 'Could not generate a valid slug from the title' }, { status: 400 });
    }

    const series = await prisma.series.create({
      data: {
        title: title.trim(),
        slug,
        description: typeof description === 'string' ? description.trim() : '',
        image: image || null,
        level: ALLOWED_LEVELS.includes(level) ? level : 'Beginner',
        tags: typeof tags === 'string' ? tags.trim() || null : null,
        published: published === true,
      },
    });

    revalidatePath('/', 'layout');

    return NextResponse.json(series);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A series with this title already exists' }, { status: 409 });
    }
    console.error('Error creating series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export { isSafeUrl, parseId, ALLOWED_LEVELS, MAX_IMG_URL };
