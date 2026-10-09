import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { sendForgotPasswordEmail } from '@/lib/email';
import crypto from 'crypto';
import { encryptDeterministic } from '@/lib/encryption';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Rate limit: 3 requests per hour per IP to prevent email flooding
    const ip = getClientIp(req);

    const allowed = await checkRateLimit('FORGOT_PWD', ip, 3, 3600);
    if (!allowed) {
      // Return same message to prevent information leakage about rate limiting
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const encryptedEmail = encryptDeterministic(email.toLowerCase().trim());

    const user = await prisma.user.findUnique({
      where: { email: encryptedEmail }
    });

    if (!user) {
      // Return 200 anyway to prevent email enumeration
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing in database (so DB leak won't expose valid tokens)
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Invalidate any existing reset tokens for this user
    await prisma.resetToken.deleteMany({
      where: { userId: user.id }
    });

    // Create new reset token with 1 hour expiration
    await prisma.resetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      }
    });

    // Build reset link with raw (unhashed) token — no email in URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    await sendForgotPasswordEmail(email, resetLink);

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
