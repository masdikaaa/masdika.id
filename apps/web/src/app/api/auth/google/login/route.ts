import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { isIpBlocked } from '@/lib/ip-check';

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rawOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const normalizedBase = rawOrigin.replace(/\/+$/, '');

  // Rate limit: Max 15 attempts per 15 minutes per IP
  if (!(await checkRateLimit('GOOGLE_LOGIN', ip, 15, 900))) {
    return NextResponse.redirect(new URL('/login?error=RateLimited', normalizedBase));
  }

  if (await isIpBlocked(ip)) {
    return NextResponse.redirect(new URL('/login?error=Blocked', normalizedBase));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${normalizedBase}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.' }, { status: 500 });
  }

  const state = crypto.randomBytes(32).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'online',
    prompt: 'consent',
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
