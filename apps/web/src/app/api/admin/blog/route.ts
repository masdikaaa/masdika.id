import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { sendNewsletterEmail } from '@/lib/email';
import { decryptDeterministic } from '@/lib/encryption';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const posts = await prisma.blogPost.findMany({
      include: { category: true, author: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { title, excerpt, content, image, published, categoryName, tags, slug: providedSlug } = body;

    // Generate slug from title if not provided
    const slug = slugify(providedSlug || title);

    // Calculate Read Time automatically
    const wordCount = content ? content.trim().split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Get Author ID from authenticated session
    const authorId = auth.userId;

    // Get or create category
    let category = await prisma.blogCategory.findFirst({
      where: { name: categoryName || 'Uncategorized' }
    });

    if (!category) {
      category = await prisma.blogCategory.create({
        data: { name: categoryName || 'Uncategorized' }
      });
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt || '',
        content,
        image: image || null,
        published: published || false,
        readTime,
        categoryId: category.id,
        authorId: authorId,
        tags: tags && tags.length > 0 ? {
          create: tags.map((id: number) => ({ tagId: id }))
        } : undefined
      }
    });

    if (published) {
      const subscribers = await prisma.subscriber.findMany({ select: { email: true } });
      if (subscribers.length > 0) {
        const emails = subscribers.map(s => decryptDeterministic(s.email));
        sendNewsletterEmail(emails, post.title, post.slug).catch(console.error);
      }
    }

    revalidatePath('/', 'layout');

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
