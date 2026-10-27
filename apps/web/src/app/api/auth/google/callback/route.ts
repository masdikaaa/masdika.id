import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic, hashPassword } from '@/lib/encryption';
import { createSessionToken } from '@/lib/session';
import crypto from 'crypto';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseUserAgent } from '@/lib/device';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.url;

  const ip = getClientIp(req);
  if (!(await checkRateLimit('GOOGLE_CALLBACK', ip, 15, 900))) {
    return NextResponse.redirect(new URL('/login?error=RateLimited', baseUrl));
  }

  if (error || !code) {
    if (state && state.startsWith('gdrive_')) {
      return NextResponse.redirect(new URL('/dashboard/services?error=GoogleAuthFailed', baseUrl));
    }
    return NextResponse.redirect(new URL('/login?error=GoogleAuthFailed', baseUrl));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const rawOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const normalizedBase = rawOrigin.replace(/\/+$/, "");
  let redirectUri = `${normalizedBase}/api/auth/google/callback`;

  // If this is a GDrive OAuth flow and specified its exact redirectUri in state, match it
  if (state && state.startsWith('gdrive_')) {
    try {
      const rawState = state.replace('gdrive_', '');
      const stateData = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf-8'));
      if (stateData.redirectUri) {
        redirectUri = stateData.redirectUri;
      }
    } catch {}
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=ConfigurationError', baseUrl));
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
      if (state && state.startsWith('gdrive_')) {
        return NextResponse.redirect(new URL('/dashboard/services?error=GoogleTokenFailed', baseUrl));
      }
      return NextResponse.redirect(new URL('/login?error=GoogleAuthFailed', baseUrl));
    }

    // Handle Google Drive OAuth Connection for VPS Cloud Backup
    if (state && state.startsWith('gdrive_')) {
      try {
        const rawState = state.replace('gdrive_', '');
        const stateData = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf-8'));
        const vpsId = stateData.vpsId;

        if (!vpsId) {
          return NextResponse.redirect(new URL('/dashboard/services?error=InvalidState', baseUrl));
        }

        if (!tokenData.refresh_token) {
          console.error('Google Drive token exchange did not return refresh_token:', tokenData);
          return NextResponse.redirect(new URL(`/dashboard/vps/${vpsId}?tab=cloud-backup&error=NoRefreshToken`, baseUrl));
        }

        // Fetch user profile to get Google email
        let googleEmail: string | null = null;
        try {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            googleEmail = profile.email || null;
          }
        } catch (e) {
          console.warn('Failed to fetch profile email during GDrive connect:', e);
        }

        // Upsert VpsCloudBackupConfig with new refresh token and email
        await prisma.vpsCloudBackupConfig.upsert({
          where: { vpsId: parseInt(vpsId.toString()) },
          create: {
            vpsId: parseInt(vpsId.toString()),
            provider: 'GDRIVE',
            gdriveRefreshToken: tokenData.refresh_token,
            gdriveClientEmail: googleEmail,
            lastStatus: 'CONNECTED',
            lastError: null
          },
          update: {
            provider: 'GDRIVE',
            gdriveRefreshToken: tokenData.refresh_token,
            gdriveClientEmail: googleEmail,
            lastStatus: 'CONNECTED',
            lastError: null
          }
        });

        return NextResponse.redirect(new URL(`/dashboard/vps/${vpsId}?tab=cloud-backup&gdrive=connected`, baseUrl));
      } catch (gdriveErr: any) {
        console.error('Error handling GDrive connect callback:', gdriveErr);
        return NextResponse.redirect(new URL('/dashboard/services?error=GDriveConnectFailed', baseUrl));
      }
    }

    // 2. Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await profileRes.json();
    if (!profileRes.ok || !profileData.email) {
      console.error('Google profile error:', profileData);
      return NextResponse.redirect(new URL('/login?error=GoogleProfileFailed', baseUrl));
    }

    const { email, name, picture } = profileData;
    const encryptedEmail = encryptDeterministic(email.toLowerCase().trim());

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
          name: name || 'Google User',
          image: picture || null,
          role: 'USER',
          balance: 0,
        },
      });
    }

    if (user.isSuspended) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(user.suspendReason || 'Account suspended')}`, baseUrl));
    }

    // 4. Generate session token
    // Set rememberMe to true for Google logins by default
    const { token, maxAge, sessionId } = createSessionToken(user.id, user.role, true);

    // Record login log with device info and deduplication
    try {
      const userAgent = req.headers.get('user-agent') || '';
      const deviceInfo = parseUserAgent(userAgent);
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
    } catch (logErr) {
      console.error('Failed to record Google login log:', logErr);
    }

    const redirectUrl = new URL(user.role === 'ADMIN' ? '/admin' : '/dashboard', baseUrl);
    const response = NextResponse.redirect(redirectUrl);

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
    return NextResponse.redirect(new URL('/login?error=InternalError', baseUrl));
  }
}
