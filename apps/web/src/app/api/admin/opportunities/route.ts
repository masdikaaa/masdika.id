import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

const ALLOWED_TYPES   = ['EVENT', 'WEBINAR', 'JOBS'] as const;
const ALLOWED_STATUSES = ['PUBLISHED', 'DRAFT'] as const;

function validateImage(image: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (image === null || image === undefined || image === '') return { ok: true, value: null };
  if (typeof image !== 'string' || image.length > 1000) return { ok: false, error: 'Invalid image URL' };
  if (image.startsWith('/uploads/')) return { ok: true, value: image };
  try {
    const u = new URL(image);
    if (u.protocol !== 'https:') return { ok: false, error: 'External image must use HTTPS' };
    const host = u.hostname.toLowerCase();
    const blocked = [/^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^::1$/, /^fc00:/i, /^fe80:/i];
    if (blocked.some(p => p.test(host))) return { ok: false, error: 'Private or internal URLs are not allowed' };
    if (!host.includes('.')) return { ok: false, error: 'Invalid image URL' };
    return { ok: true, value: image };
  } catch {
    return { ok: false, error: 'Invalid image URL format' };
  }
}

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const opportunities = await prisma.opportunity.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { type, title, description, image, link, date, status, isNew } = body;

    // Validate required
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const imgValidation = validateImage(image);
    if (!imgValidation.ok) {
      return NextResponse.json({ error: imgValidation.error }, { status: 400 });
    }

    let finalLink = link;
    if (finalLink) {
      finalLink = finalLink.trim();
      if (!finalLink.includes('://') && !finalLink.startsWith('mailto:') && !finalLink.startsWith('tel:')) {
        if (finalLink.includes('@') && !finalLink.includes('/')) {
          finalLink = `mailto:${finalLink}`;
        } else {
          finalLink = `https://${finalLink}`;
        }
      }
      try {
        const u = new URL(finalLink);
        if (!['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol)) {
          return NextResponse.json({ error: 'External link must use HTTP, HTTPS, mailto:, or tel: protocol' }, { status: 400 });
        }
      } catch (e) {
        return NextResponse.json({ error: 'Invalid external link format' }, { status: 400 });
      }
    }

    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = `opportunity-${Date.now()}`;
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await prisma.opportunity.findUnique({ where: { slug } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        type,
        title: title.trim(),
        slug,
        description: typeof description === 'string' ? description.trim() : '',
        image: imgValidation.value,
        link: finalLink || null,
        date: date ? new Date(date) : null,
        status: status || 'PUBLISHED',
        isNew: typeof isNew === 'boolean' ? isNew : false,
      }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
