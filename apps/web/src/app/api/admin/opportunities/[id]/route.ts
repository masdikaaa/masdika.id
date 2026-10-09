import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { deleteLocalFile } from '@/lib/file-utils';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

/**
 * Validate an image value — accepts:
 * - Local uploads: starts with /uploads/
 * - External HTTPS URLs: must be https, no private IPs, reasonable length
 */
function validateImage(image: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (image === null || image === undefined || image === '') {
    return { ok: true, value: null };
  }
  if (typeof image !== 'string') {
    return { ok: false, error: 'Invalid image value' };
  }
  if (image.length > 1000) {
    return { ok: false, error: 'Image URL too long' };
  }
  // Allow local uploads
  if (image.startsWith('/uploads/')) {
    // Prevent path traversal
    const safe = path.basename(image.replace('/uploads/', ''));
    if (!safe || image !== `/uploads/${safe}`) {
      return { ok: false, error: 'Invalid upload path' };
    }
    return { ok: true, value: image };
  }
  // External URL — must be https
  try {
    const u = new URL(image);
    if (u.protocol !== 'https:') {
      return { ok: false, error: 'External image must use HTTPS' };
    }
    // Block private/internal IP ranges (SSRF prevention)
    const host = u.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
    ];
    for (const pattern of privatePatterns) {
      if (pattern.test(host)) {
        return { ok: false, error: 'Private or internal URLs are not allowed' };
      }
    }
    // Must have a valid TLD or be a known hostname
    if (!host.includes('.') && host !== 'localhost') {
      return { ok: false, error: 'Invalid image URL' };
    }
    return { ok: true, value: image };
  } catch {
    return { ok: false, error: 'Invalid image URL format' };
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }
    
    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const body = await req.json();
    const { type, title, description, image, link, date, status, isNew } = body;

    let slugData = {};
    if (title) {
      let baseSlug = slugify(title);
      if (!baseSlug) baseSlug = `opportunity-${Date.now()}`;
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await prisma.opportunity.findUnique({ where: { slug } });
        if (!existing || existing.id === parseInt(id)) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      slugData = { slug };
    }

    const currentOpp = await prisma.opportunity.findUnique({ where: { id: parseInt(id) } });

    // Validate image
    if (image !== undefined) {
      const imgValidation = validateImage(image);
      if (!imgValidation.ok) {
        return NextResponse.json({ error: imgValidation.error }, { status: 400 });
      }
    }

    let finalLink = link;
    if (finalLink !== undefined && finalLink !== null && finalLink !== '') {
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
    } else if (finalLink === '') {
      finalLink = null;
    }

    const opportunity = await prisma.opportunity.update({
      where: { id: parseInt(id) },
      data: {
        ...(type && { type }),
        ...(title && { title }),
        ...slugData,
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(link !== undefined && { link: finalLink }),
        ...(date !== undefined && { date: date ? new Date(date) : null }),
        ...(status && { status }),
        ...(isNew !== undefined && { isNew }),
      }
    });

    // Delete old image if it was replaced or removed
    if (currentOpp?.image && image !== undefined && currentOpp.image !== image) {
      deleteLocalFile(currentOpp.image);
    }

    revalidatePath('/', 'layout');

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    
    const opportunity = await prisma.opportunity.findUnique({ where: { id: parseInt(id) } });

    await prisma.opportunity.delete({
      where: { id: parseInt(id) }
    });

    if (opportunity?.image) {
      deleteLocalFile(opportunity.image);
    }

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
