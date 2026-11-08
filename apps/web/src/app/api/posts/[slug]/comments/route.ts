import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { sendCommentVerificationEmail } from '@/lib/email';
import { isIpBlocked } from '@/lib/ip-check';
import { checkRateLimit } from '@/lib/rate-limit';
import { encryptDeterministic } from '@/lib/encryption';
import { signDomainToken } from '@/lib/session';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Extract IP Address & enforce rate limit first to prevent email-verification bombing
    const ipAddress = getClientIp(request);
    if (!(await checkRateLimit('BLOG_COMMENT', ipAddress, 5, 600))) {
      return NextResponse.json(
        { error: 'Too many comment submissions. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    const body = await request.json();
    const { name, email, content, parentId } = body;

    if (typeof name !== 'string' || typeof email !== 'string' || typeof content !== 'string') {
      return NextResponse.json({ error: 'Name, email, and content are required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanContent = content.trim();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return NextResponse.json({ error: 'Name must be between 2 and 80 characters.' }, { status: 400 });
    }

    if (cleanEmail.length < 5 || cleanEmail.length > 254 || !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    if (cleanContent.length < 2 || cleanContent.length > 2000) {
      return NextResponse.json({ error: 'Comment must be between 2 and 2000 characters.' }, { status: 400 });
    }

    if (cleanEmail.endsWith('@masdika.id') || cleanEmail.endsWith('.masdika.id')) {
      return NextResponse.json({ error: 'Using @masdika.id domain for comments is not allowed.' }, { status: 400 });
    }

    let parsedParentId: number | null = null;
    if (parentId !== undefined && parentId !== null && parentId !== '') {
      const numParent = Number(parentId);
      if (!Number.isInteger(numParent) || numParent <= 0) {
        return NextResponse.json({ error: 'Invalid parent comment ID.' }, { status: 400 });
      }
      parsedParentId = numParent;
    }

    // Check if IP is blocked
    if (await isIpBlocked(ipAddress)) {
      return NextResponse.json({ error: 'You are blocked from leaving comments.' }, { status: 403 });
    }

    // Per-email rate limit to prevent bombing a single external inbox from rotating IPs
    if (!(await checkRateLimit('BLOG_COMMENT_EMAIL', cleanEmail, 3, 600))) {
      return NextResponse.json(
        { error: 'Too many verification requests for this email. Please check your inbox.' },
        { status: 429 }
      );
    }

    // Check if Email is blocked (both plaintext & deterministic-encrypted)
    const encryptedEmail = encryptDeterministic(cleanEmail);
    const isEmailBlocked = await prisma.blockedUser.findFirst({
      where: { type: 'EMAIL', value: { in: [cleanEmail, encryptedEmail] } }
    });

    if (isEmailBlocked) {
      return NextResponse.json({ error: 'You are blocked from leaving comments.' }, { status: 403 });
    }

    // Find the published post
    const post = await prisma.blogPost.findUnique({
      where: { slug }
    });

    if (!post || !post.published) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (parsedParentId) {
      const parentExists = await prisma.comment.findFirst({
        where: { id: parsedParentId, blogPostId: post.id, isVerified: true },
        select: { id: true },
      });
      if (!parentExists) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
    }

    // Generate Stateless Verification Token with HKDF domain separation
    const payload = {
      name: cleanName,
      email: cleanEmail,
      content: cleanContent,
      parentId: parsedParentId,
      blogPostId: post.id,
      ipAddress,
      exp: Date.now() + 1000 * 60 * 60 * 24 // 24 hours expiration
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = signDomainToken('comment-verify', payloadBase64);
    const verificationToken = `${payloadBase64}.${signature}`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/api/verify-comment?token=${encodeURIComponent(verificationToken)}`;

    // Send Verification Email (without saving to DB)
    await sendCommentVerificationEmail(cleanEmail, verificationLink, post.title);

    return NextResponse.json({ message: 'Please check your email to verify your comment.' });
  } catch (error) {
    console.error('Submit comment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
