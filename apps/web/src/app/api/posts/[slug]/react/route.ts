import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const ip = getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    const existing = await prisma.blogReaction.findUnique({
      where: {
        blogPostId_ipHash: {
          blogPostId: post.id,
          ipHash
        }
      }
    });

    if (existing) {
      // User already reacted
      return NextResponse.json({ success: false, message: 'Already reacted' }, { status: 400 });
    }

    await prisma.blogReaction.create({
      data: {
        blogPostId: post.id,
        ipHash
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
