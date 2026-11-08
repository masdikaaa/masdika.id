import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic, hashPassword } from '@/lib/encryption';
import { create2FAChallengeToken, createSessionToken } from '@/lib/session';
import crypto from 'crypto';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { isIpBlocked } from '@/lib/ip-check';
import { parseUserAgent } from '@/lib/device';
import { syncCustomerToElastic } from '@/lib/sync-elasticsearch';
import { notifyUserPresencePing } from '@/lib/presence-emitter';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  const rawOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const normalizedBase = rawOrigin.replace(/\/+$/, '');

  const ip = getClientIp(req);
  if (!(await checkRateLimit('GOOGLE_CALLBACK', ip, 15, 900))) {
    return NextResponse.redirect(new URL('/login?error=RateLimited', normalizedBase));
  }

  if (await isIpBlocked(ip)) {
    return NextResponse.redirect(new URL('/login?error=Blocked', normalizedBase));
  }

  // Enforce CSRF state verification via HttpOnly cookie
  const cookieStore = await cookies();
  const expectedState = cookieStore.get('google_oauth_state')?.value;
  const isStateValid = (() => {
    if (!state || !expectedState) return false;
    const stateBuf = Buffer.from(state, 'utf8');
    const expBuf = Buffer.from(expectedState, 'utf8');
    if (stateBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(stateBuf, expBuf);
  })();

  if (!isStateValid || error || !code) {
    const failRes = NextResponse.redirect(new URL('/login?error=GoogleAuthFailed', normalizedBase));
    failRes.cookies.delete('google_oauth_state');
    return failRes;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${normalizedBase}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    const cfgRes = NextResponse.redirect(new URL('/login?error=ConfigurationError', normalizedBase));
    cfgRes.cookies.delete('google_oauth_state');
    return cfgRes;
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token error:', tokenData);
      const tokenErrRes = NextResponse.redirect(new URL('/login?error=GoogleAuthFailed', normalizedBase));
      tokenErrRes.cookies.delete('google_oauth_state');
      return tokenErrRes;
    }

    // 2. Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await profileRes.json();
    if (!profileRes.ok || !profileData.email || profileData.verified_email !== true) {
      console.error('Google profile error or unverified email:', profileData);
      const profErrRes = NextResponse.redirect(new URL('/login?error=GoogleProfileFailed', normalizedBase));
      profErrRes.cookies.delete('google_oauth_state');
      return profErrRes;
    }

    const { email, name, picture } = profileData;
    const normalizedEmail = String(email).toLowerCase().trim();
    const encryptedEmail = encryptDeterministic(normalizedEmail);

    // 3. Find or create user
    let user = await prisma.user.findUnique({
      where: { email: encryptedEmail },
    });

    if (!user) {
      // Create new user with a strong dummy password (they cannot login via email/pwd unless they reset it)
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = hashPassword(dummyPassword);

      user = await prisma.user.create({
        data: {
          email: encryptedEmail,
          password: hashedPassword,
          name: encryptDeterministic(name || 'Google User'),
          image: picture || null,
          role: 'USER',
          balance: 0,
        },
      });

      // Sync newly created user to Elasticsearch
      syncCustomerToElastic(user.id).catch(err => console.debug('ES syncCustomer error:', err));
    }

    if (user.isSuspended) {
      const suspRes = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(user.suspendReason || 'Account suspended')}`, normalizedBase));
      suspRes.cookies.delete('google_oauth_state');
      return suspRes;
    }

    // Enforce 2FA on Google OAuth sign-in when enabled for this user or Admin
    let requires2FA = Boolean(user.twoFactorEnabled);
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      const admin2FA = await prisma.setting.findUnique({ where: { key: 'twoFactorEnabled' } });
      if (admin2FA?.value === 'true') {
        requires2FA = true;
      }
    }

    if (requires2FA) {
      const challengeToken = create2FAChallengeToken(user.id, true);
      const challengeRes = NextResponse.redirect(new URL('/login?requires2fa=1', normalizedBase));
      challengeRes.cookies.delete('google_oauth_state');
      challengeRes.cookies.set('masdika_2fa_challenge', challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 300,
      });
      return challengeRes;
    }

    // 4. Generate session token
    // Set rememberMe to true for Google logins by default
    const { token, maxAge, sessionId } = createSessionToken(user.id, user.role, true);

    // Record immutable login log row (never overwrite or un-revoke prior sessions)
    try {
      const userAgent = req.headers.get('user-agent') || '';
      const deviceInfo = parseUserAgent(userAgent);

      await prisma.loginLog.create({
        data: {
          userId: user.id,
          sessionId,
          ipAddress: ip,
          emailAttempt: normalizedEmail,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          userAgent,
          success: true,
          isBanned: false,
          isRevoked: false
        }
      });
    } catch (logErr) {
      console.error('Failed to record Google login log:', logErr);
    }

    // Update lastActive timestamp on successful Google login and immediately broadcast presence
    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: now },
    }).catch(err => console.debug('google login lastActive update error:', err));

    notifyUserPresencePing({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      lastActive: now,
    });

    const redirectUrl = new URL(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard', normalizedBase);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('google_oauth_state');
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error) {
    console.error('Google callback error:', error);
    const errRes = NextResponse.redirect(new URL('/login?error=InternalError', normalizedBase));
    errRes.cookies.delete('google_oauth_state');
    return errRes;
  }
}
