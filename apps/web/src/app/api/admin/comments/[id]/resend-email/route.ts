import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCommentVerificationEmail } from '@/lib/email';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { blogPost: true }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.isVerified) {
      return NextResponse.json({ error: 'Comment is already verified' }, { status: 400 });
    }

    let token = comment.verificationToken;
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      await prisma.comment.update({
        where: { id },
        data: { verificationToken: token }
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/api/verify-comment?token=${token}`;

    await sendCommentVerificationEmail(comment.email, verificationLink, comment.blogPost.title);

    return NextResponse.json({ message: 'Verification email resent successfully' });
  } catch (error) {
    console.error('Error resending email:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
