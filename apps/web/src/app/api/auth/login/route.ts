import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic, verifyPassword } from '@/lib/encryption';
import { createSessionToken } from '@/lib/session';
import { isIpBlocked } from '@/lib/ip-check';
import crypto from 'crypto';
import { verify } from 'otplib';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { parseUserAgent } from '@/lib/device';

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

    const { email, password, rememberMe, twoFactorCode, turnstileToken, _hp, _ts } = await req.json();

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

    const handleFailedLogin = async () => {
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

      await prisma.loginLog.create({
        data: {
          ipAddress: ip,
          emailAttempt: email ? String(email).trim() : 'unknown',
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
        emailAttempt: email ? String(email).trim() : 'unknown', 
        isBanned 
      });
    };

    if (!email || !password) {
      await handleFailedLogin();
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await handleFailedLogin();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }); // Generic error to prevent email enum
    }

    if (password.length < 8) {
      await handleFailedLogin();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }); // Generic error
    }

    // Encrypt email to match DB value
    const encryptedEmail = encryptDeterministic(email.toLowerCase().trim());

    const user = await prisma.user.findUnique({
      where: { email: encryptedEmail }
    });

    if (!user) {
      await handleFailedLogin();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.isSuspended) {
      await handleFailedLogin();
      return NextResponse.json({ error: user.suspendReason || 'Your account has been suspended.' }, { status: 403 });
    }

    if (!verifyPassword(password, user.password)) {
      await handleFailedLogin();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check 2FA
    if (user.role === 'ADMIN') {
      const is2FAEnabled = await prisma.setting.findUnique({ where: { key: 'twoFactorEnabled' } });
      if (is2FAEnabled?.value === 'true') {
        if (!twoFactorCode) {
          return NextResponse.json({ requires2FA: true });
        }

        const secretSetting = await prisma.setting.findUnique({ where: { key: 'twoFactorSecret' } });
        if (!secretSetting) {
          return NextResponse.json({ error: '2FA configuration error on server' }, { status: 500 });
        }

        const tokenString = String(twoFactorCode).trim();
        if (tokenString.length !== 6) {
          await handleFailedLogin();
          return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
        }

        try {
          const result = await verify({ token: tokenString, secret: secretSetting.value });
          if (!result.valid) {
            await handleFailedLogin();
            return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
          }
        } catch (err) {
          await handleFailedLogin();
          return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
        }
      }
    } else {
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          return NextResponse.json({ requires2FA: true });
        }

        if (!user.twoFactorSecret) {
          return NextResponse.json({ error: '2FA configuration error on user account' }, { status: 500 });
        }

        const tokenString = String(twoFactorCode).trim();
        if (tokenString.length !== 6) {
          await handleFailedLogin();
          return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
        }

        try {
          const result = await verify({ token: tokenString, secret: user.twoFactorSecret });
          if (!result.valid) {
            await handleFailedLogin();
            return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
          }
        } catch (err) {
          await handleFailedLogin();
          return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
        }
      }
    }

    // Generate signed session token
    const { token, maxAge, sessionId } = createSessionToken(user.id, user.role, rememberMe);

    // Login success & log deduplication:
    // If device and IP are the same, don't create duplicate rows. Update login timestamp & sessionId!
    if (ip !== 'unknown') {
      const normalizedEmail = String(email).trim().toLowerCase();
      const existingLog = await prisma.loginLog.findFirst({
        where: {
          success: true,
          ipAddress: ip,
          OR: [
            { userId: user.id },
            { emailAttempt: normalizedEmail }
          ],
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingLog) {
        await prisma.loginLog.update({
          where: { id: existingLog.id },
          data: {
            sessionId,
            userId: user.id,
            emailAttempt: normalizedEmail,
            userAgent,
            isRevoked: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      } else {
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
      }
    }

    // Update lastActive timestamp on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    }).catch(err => console.debug("login lastActive update error:", err));

    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    
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
