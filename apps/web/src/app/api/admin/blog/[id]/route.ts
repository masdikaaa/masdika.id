import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { deleteLocalFile } from '@/lib/file-utils';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const post = await prisma.blogPost.findUnique({
      where: { id: parseInt(id) },
      include: { category: true, tags: { include: { tag: true } } }
    });
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      ...post,
      tags: post.tags.map(pt => pt.tag)
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
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
    const { title, excerpt, content, image, published, categoryName, tags, slug: providedSlug } = body;

    // Get old post for image cleanup
    const oldPost = await prisma.blogPost.findUnique({ where: { id: parseInt(id) } });

    let slug = undefined;
    if (providedSlug) {
      slug = slugify(providedSlug);
    } else if (title) {
      slug = slugify(title);
    }

    let readTime = undefined;
    if (content) {
      const wordCount = content.trim().split(/\s+/).length;
      readTime = Math.max(1, Math.ceil(wordCount / 200));
    }

    let categoryId = undefined;
    if (categoryName) {
      let category = await prisma.blogCategory.findFirst({
        where: { name: categoryName }
      });
      if (!category) {
        category = await prisma.blogCategory.create({
          data: { name: categoryName }
        });
      }
      categoryId = category.id;
    }

    const post = await prisma.blogPost.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title, slug }),
        ...(excerpt !== undefined && { excerpt }),
        ...(content !== undefined && { content }),
        ...(image !== undefined && { image }),
        ...(published !== undefined && { published }),
        ...(readTime !== undefined && { readTime }),
        ...(categoryId !== undefined && { categoryId }),
        ...(tags !== undefined && {
          tags: {
            deleteMany: {},
            create: tags.map((id: number) => ({ tagId: id }))
          }
        }),
      }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating blog post:', error);
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
    
    // Get the post before deleting to clean up images
    const post = await prisma.blogPost.findUnique({ where: { id: parseInt(id) } });
    
    // The user requested to delete images from storage when the post is deleted
    if (post && post.image) {
      deleteLocalFile(post.image);
    }
    
    // Explicitly delete related comments and reactions
    await prisma.comment.deleteMany({ where: { blogPostId: parseInt(id) } });
    await prisma.blogReaction.deleteMany({ where: { blogPostId: parseInt(id) } });
    
    await prisma.blogPost.delete({
      where: { id: parseInt(id) }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
