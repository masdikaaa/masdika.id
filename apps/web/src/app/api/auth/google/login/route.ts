import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const ip = getClientIp(req);
  
  // Rate limit: Max 15 attempts per 15 minutes per IP
  if (!(await checkRateLimit('GOOGLE_LOGIN', ip, 15, 900))) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.redirect(new URL('/login?error=RateLimited', baseUrl));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.' }, { status: 500 });
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile&access_type=online&prompt=consent`;
  
  return NextResponse.redirect(url);
}
