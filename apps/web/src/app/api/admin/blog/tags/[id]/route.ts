import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, slug } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const finalSlug = slug?.trim() ? slugify(slug.trim()) : slugify(name.trim());

    const existing = await prisma.tag.findFirst({
      where: { 
        OR: [{ name: name.trim() }, { slug: finalSlug }], 
        id: { not: parseInt(id) } 
      }
    });
    if (existing) {
      return NextResponse.json({ error: 'Tag name or slug already exists' }, { status: 400 });
    }

    const tag = await prisma.tag.update({
      where: { id: parseInt(id) },
      data: { name: name.trim(), slug: finalSlug }
    });
    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
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

    // Check if tag has posts
    const tag = await prisma.tag.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { posts: true } } }
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    await prisma.tag.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
