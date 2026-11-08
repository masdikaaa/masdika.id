import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic, encryptDeterministic, hashPassword, verifyPassword } from '@/lib/encryption';
import { create2FAChallengeToken, createSessionToken, verify2FAChallengeToken } from '@/lib/session';
import { isIpBlocked } from '@/lib/ip-check';
import { verify } from 'otplib';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { parseUserAgent } from '@/lib/device';
import { notifyUserPresencePing } from '@/lib/presence-emitter';

// Precomputed dummy scrypt hash so unknown-email lookups perform identical KDF work
const DUMMY_PASSWORD_HASH = hashPassword('masdika_timing_equalizer_dummy_password_!2026');

async function getActiveTwoFactorSecret(user: { role: string; twoFactorEnabled: boolean; twoFactorSecret: string | null }): Promise<{ required: boolean; secret: string | null }> {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    const is2FAEnabled = await prisma.setting.findUnique({ where: { key: 'twoFactorEnabled' } });
    if (is2FAEnabled?.value === 'true') {
      const secretSetting = await prisma.setting.findUnique({ where: { key: 'twoFactorSecret' } });
      return { required: true, secret: secretSetting?.value || null };
    }
  }
  if (user.twoFactorEnabled) {
    return { required: true, secret: user.twoFactorSecret };
  }
  return { required: false, secret: null };
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';
    const deviceInfo = parseUserAgent(userAgent);

    // Anti-Brute-Force & Race Condition Prevention: Max 15 attempts per 15 minutes per IP
    if (!(await checkRateLimit('LOGIN', ip, 15, 900))) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    // 1. Check if IP is permanently blocked
    if (await isIpBlocked(ip)) {
      return NextResponse.json({ error: 'Your IP address is blocked due to suspicious activity.' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, rememberMe, twoFactorCode, turnstileToken, _hp, _ts } = body;

    const handleFailedLogin = async (attemptedEmail?: string) => {
      if (ip === 'unknown') return;

      const timeWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 mins
      const failedAttemptsCount = await prisma.loginLog.count({
        where: {
          ipAddress: ip,
          success: false,
          createdAt: { gte: timeWindow }
        }
      });

      const isBanned = failedAttemptsCount >= 4; // This attempt will be the 5th

      if (isBanned) {
        await prisma.blockedUser.upsert({
          where: { value: ip },
          update: { reason: 'Brute force login attempts (Max 5x)' },
          create: { type: 'IP', value: ip, reason: 'Brute force login attempts (Max 5x)' }
        });
      }

      const safeAttemptEmail = attemptedEmail ? String(attemptedEmail).trim().toLowerCase() : (email ? String(email).trim().toLowerCase() : 'unknown');

      await prisma.loginLog.create({
        data: {
          ipAddress: ip,
          emailAttempt: safeAttemptEmail,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          userAgent,
          success: false,
          isBanned: isBanned
        }
      });

      logger.warn('Failed login attempt', { 
        event: 'auth.failed', 
        ip, 
        emailAttempt: safeAttemptEmail, 
        isBanned 
      });
    };

    const cookieStore = await cookies();
    const challengeCookie = cookieStore.get('masdika_2fa_challenge')?.value;
    const verifiedChallenge = twoFactorCode && challengeCookie ? verify2FAChallengeToken(challengeCookie) : null;

    // STEP 2 PATH: Complete 2FA via signed HttpOnly challenge cookie (from password step 1 or Google OAuth)
    if (twoFactorCode && verifiedChallenge && !password) {
      if (!(await checkRateLimit('LOGIN_2FA_USER', String(verifiedChallenge.userId), 5, 300))) {
        const rateRes = NextResponse.json({ error: 'Too many 2FA attempts. Please sign in again.' }, { status: 429 });
        rateRes.cookies.delete('masdika_2fa_challenge');
        return rateRes;
      }

      const user = await prisma.user.findUnique({ where: { id: verifiedChallenge.userId } });
      if (!user || user.isSuspended) {
        const failRes = NextResponse.json({ error: user?.suspendReason || 'Invalid session challenge.' }, { status: user?.isSuspended ? 403 : 401 });
        failRes.cookies.delete('masdika_2fa_challenge');
        return failRes;
      }

      const plainEmail = decryptDeterministic(user.email) || 'unknown';
      const twoFactorState = await getActiveTwoFactorSecret(user);
      if (!twoFactorState.required || !twoFactorState.secret) {
        const errRes = NextResponse.json({ error: '2FA configuration error on account' }, { status: 500 });
        errRes.cookies.delete('masdika_2fa_challenge');
        return errRes;
      }

      const tokenString = String(twoFactorCode).trim();
      if (!/^\d{6}$/.test(tokenString)) {
        await handleFailedLogin(plainEmail);
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
      }

      try {
        const result = await verify({ token: tokenString, secret: twoFactorState.secret });
        if (!result.valid) {
          await handleFailedLogin(plainEmail);
          return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
        }
      } catch {
        await handleFailedLogin(plainEmail);
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
      }

      const { token, maxAge, sessionId } = createSessionToken(user.id, user.role, verifiedChallenge.rememberMe);
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          sessionId,
          ipAddress: ip,
          emailAttempt: plainEmail.toLowerCase(),
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          userAgent,
          success: true,
          isBanned: false,
          isRevoked: false,
        }
      });

      const now = new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActive: now },
      }).catch(err => console.debug('login lastActive update error:', err));

      notifyUserPresencePing({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        lastActive: now,
      });

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      });
      response.cookies.delete('masdika_2fa_challenge');
      response.cookies.set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      });
      return response;
    }

    if (twoFactorCode && !password && !verifiedChallenge) {
      return NextResponse.json({ error: 'Your 2FA verification session expired. Please sign in again.' }, { status: 401 });
    }

    // STEP 1 PATH: Primary Email + Password Authentication
    // Turnstile Verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!turnstileToken) {
        return NextResponse.json({ error: 'Please complete the captcha verification.' }, { status: 400 });
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(turnstileToken)}&remoteip=${encodeURIComponent(ip)}`
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json({ error: 'Failed captcha verification. Please try again.' }, { status: 400 });
      }
    }

    // Honeypot: bots fill hidden fields, humans don't
    if (_hp) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Timing check: block submissions faster than 2 seconds (bots)
    if (_ts && Date.now() - _ts < 2000) {
      return NextResponse.json({ error: 'Please slow down.' }, { status: 400 });
    }

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      await handleFailedLogin();
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || password.length < 8 || password.length > 256) {
      await handleFailedLogin(email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Encrypt email to match DB value
    const normalizedEmail = email.toLowerCase().trim();
    const encryptedEmail = encryptDeterministic(normalizedEmail);

    const user = await prisma.user.findUnique({
      where: { email: encryptedEmail }
    });

    if (!user) {
      verifyPassword(password, DUMMY_PASSWORD_HASH);
      await handleFailedLogin(normalizedEmail);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password BEFORE checking suspension to prevent account enumeration
    if (!verifyPassword(password, user.password)) {
      await handleFailedLogin(normalizedEmail);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.isSuspended) {
      await handleFailedLogin(normalizedEmail);
      return NextResponse.json({ error: user.suspendReason || 'Your account has been suspended.' }, { status: 403 });
    }

    // Check 2FA
    const twoFactorState = await getActiveTwoFactorSecret(user);
    if (twoFactorState.required) {
      if (!twoFactorCode) {
        const challengeToken = create2FAChallengeToken(user.id, Boolean(rememberMe));
        const challengeRes = NextResponse.json({ requires2FA: true });
        challengeRes.cookies.set('masdika_2fa_challenge', challengeToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 300,
        });
        return challengeRes;
      }

      if (!(await checkRateLimit('LOGIN_2FA_USER', String(user.id), 5, 300))) {
        return NextResponse.json({ error: 'Too many 2FA attempts. Please wait 5 minutes.' }, { status: 429 });
      }

      if (!twoFactorState.secret) {
        return NextResponse.json({ error: '2FA configuration error on server' }, { status: 500 });
      }

      const tokenString = String(twoFactorCode).trim();
      if (!/^\d{6}$/.test(tokenString)) {
        await handleFailedLogin(normalizedEmail);
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
      }

      try {
        const result = await verify({ token: tokenString, secret: twoFactorState.secret });
        if (!result.valid) {
          await handleFailedLogin(normalizedEmail);
          return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
        }
      } catch {
        await handleFailedLogin(normalizedEmail);
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
      }
    }

    // Generate signed session token & append immutable LoginLog row (never un-revoke or overwrite old sessions)
    const { token, maxAge, sessionId } = createSessionToken(user.id, user.role, Boolean(rememberMe));

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

    // Update lastActive timestamp on successful login and immediately broadcast presence
    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: now },
    }).catch(err => console.debug("login lastActive update error:", err));

    notifyUserPresencePing({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      lastActive: now,
    });

    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    response.cookies.delete('masdika_2fa_challenge');
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
