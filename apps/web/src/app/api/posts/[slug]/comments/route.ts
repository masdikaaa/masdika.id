import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { sendCommentVerificationEmail } from '@/lib/email';
import { isIpBlocked } from '@/lib/ip-check';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    const body = await request.json();
    const { name, email, content, parentId } = body;

    if (!name || !email || !content) {
      return NextResponse.json({ error: 'Name, email, and content are required' }, { status: 400 });
    }

    if (email.toLowerCase().endsWith('@masdika.id')) {
      return NextResponse.json({ error: 'Using @masdika.id domain for comments is not allowed.' }, { status: 400 });
    }

    // Extract IP Address
    const ipAddress = getClientIp(request);

    // Check if IP is blocked
    if (await isIpBlocked(ipAddress)) {
      return NextResponse.json({ error: 'You are blocked from leaving comments.' }, { status: 403 });
    }

    // Check if Email is blocked
    const isEmailBlocked = await prisma.blockedUser.findFirst({
      where: { type: 'EMAIL', value: email }
    });

    if (isEmailBlocked) {
      return NextResponse.json({ error: 'You are blocked from leaving comments.' }, { status: 403 });
    }

    // Find the post
    const post = await prisma.blogPost.findUnique({
      where: { slug }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Generate Stateless Verification Token
    const payload = {
      name,
      email,
      content,
      parentId: parentId || null,
      blogPostId: post.id,
      ipAddress,
      exp: Date.now() + 1000 * 60 * 60 * 24 // 24 hours expiration
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'default_secret')
                            .update(payloadBase64)
                            .digest('hex');
    const verificationToken = `${payloadBase64}.${signature}`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/api/verify-comment?token=${verificationToken}`;

    // Send Verification Email (without saving to DB)
    await sendCommentVerificationEmail(email, verificationLink, post.title);

    return NextResponse.json({ message: 'Please check your email to verify your comment.' });
  } catch (error) {
    console.error('Submit comment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
