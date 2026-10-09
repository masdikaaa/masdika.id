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
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const finalSlug = slug?.trim() ? slugify(slug.trim()) : slugify(name.trim());

    const existing = await prisma.blogCategory.findFirst({
      where: { 
        OR: [{ name: name.trim() }, { slug: finalSlug }], 
        id: { not: parseInt(id) } 
      }
    });
    if (existing) {
      return NextResponse.json({ error: 'Category name or slug already exists' }, { status: 400 });
    }

    const category = await prisma.blogCategory.update({
      where: { id: parseInt(id) },
      data: { name: name.trim(), slug: finalSlug }
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
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

    // Check if category has posts
    const postCount = await prisma.blogPost.count({ where: { categoryId: parseInt(id) } });
    if (postCount > 0) {
      return NextResponse.json({ error: `Cannot delete category: ${postCount} articles are using this category` }, { status: 400 });
    }

    await prisma.blogCategory.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
