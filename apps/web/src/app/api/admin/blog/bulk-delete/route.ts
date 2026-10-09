import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    // Explicitly delete related comments and reactions for these posts
    await prisma.comment.deleteMany({
      where: { blogPostId: { in: ids } }
    });
    await prisma.blogReaction.deleteMany({
      where: { blogPostId: { in: ids } }
    });

    await prisma.blogPost.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error bulk deleting blog posts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
