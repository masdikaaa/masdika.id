import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic } from '@/lib/encryption';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { getUploadsDir } from '@/lib/file-utils';

// Exact Google Material Account palette (matching Customer page avatars: Guardian Marx #004d40, finger red #ab47bc)
const GOOGLE_COLORS = [
  '#004d40', // Exact Guardian Marx Teal Green (Customer page)
  '#ab47bc', // Exact finger red Purple (Customer page)
  '#1a73e8', // Google Blue
  '#188038', // Google Green
  '#d93025', // Google Red
  '#e37400', // Google Orange
  '#007b83', // Google Dark Cyan
  '#7627bb', // Google Deep Purple
  '#c2185b', // Google Rose / Magenta
  '#f29900', // Google Amber
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isTrustedAvatarUrl(rawImage: string, requestUrl: string): string | null {
  if (rawImage.startsWith('/') && !rawImage.startsWith('//')) {
    return new URL(rawImage, requestUrl).toString();
  }
  if (!rawImage.startsWith('https://')) return null;
  try {
    const parsed = new URL(rawImage);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    const host = parsed.hostname.toLowerCase();
    const reqHost = new URL(requestUrl).hostname.toLowerCase();
    const appHost = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.toLowerCase()
      : '';
    if (
      host === reqHost ||
      (appHost && host === appHost) ||
      host === 'avatars.githubusercontent.com' ||
      host === 'www.gravatar.com' ||
      host === 'secure.gravatar.com' ||
      host.endsWith('.googleusercontent.com')
    ) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function getColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GOOGLE_COLORS[Math.abs(hash) % GOOGLE_COLORS.length];
}

function getInitial(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'U';
  return escapeXml(clean.charAt(0).toUpperCase());
}

function generateGoogleFlatAvatar(name: string, seed: string): string {
  const color = getColor(seed || name);
  const initial = getInitial(name);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" fill="${color}" />
  <text 
    x="48" 
    y="48.5" 
    text-anchor="middle" 
    dominant-baseline="central" 
    font-family="Roboto, Arial, sans-serif" 
    font-size="48" 
    font-weight="400" 
    fill="#ffffff"
  >${initial}</text>
</svg>`;
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit('AVATAR', ip, 120, 60))) {
    return new Response('Too Many Requests', { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const rawEmail = (searchParams.get('email') || '').trim().toLowerCase().slice(0, 254);
  const rawHash = (searchParams.get('hash') || '').trim().toLowerCase();
  const validHash = /^[0-9a-f]{32}$/.test(rawHash) ? rawHash : '';
  const name = (searchParams.get('name') || 'User').slice(0, 100);
  const forceFallback = searchParams.get('fallback') === '1';

  // If fallback is forced, directly return Google Material SVG avatar
  if (forceFallback) {
    const svg = generateGoogleFlatAvatar(name, rawEmail || validHash || name);
    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  }

  // 1. Check if user has a profile image in Masdika DB (e.g. Google OAuth image or custom upload)
  if (rawEmail) {
    try {
      const encryptedEmail = encryptDeterministic(rawEmail);
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: encryptedEmail },
            { email: rawEmail },
          ],
        },
        select: { image: true },
      });

      if (user?.image) {
        // If it's a local /uploads/ file, verify it actually exists on disk before redirecting
        if (user.image.startsWith('/uploads/')) {
          const subPath = user.image.replace(/^\/uploads\//, '');
          const localPath = path.normalize(path.join(getUploadsDir(), ...subPath.split('/')));
          if (fs.existsSync(localPath)) {
            const safeRedirectUrl = isTrustedAvatarUrl(user.image, req.url);
            if (safeRedirectUrl) {
              return NextResponse.redirect(safeRedirectUrl);
            }
          }
          // File does NOT exist on disk -> fall through to Google Flat SVG initial avatar
        } else {
          const safeRedirectUrl = isTrustedAvatarUrl(user.image, req.url);
          if (safeRedirectUrl) {
            return NextResponse.redirect(safeRedirectUrl);
          }
        }
      }
    } catch {
      // ignore db error
    }
  }

  // 2. Check Gravatar (supports either rawEmail or pre-hashed MD5 from public comment avatars)
  const gravatarHash = validHash || (rawEmail ? crypto.createHash('md5').update(rawEmail).digest('hex') : '');
  if (gravatarHash) {
    const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?d=404&s=160`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(gravatarUrl, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);
      if (res.ok) {
        return NextResponse.redirect(gravatarUrl);
      }
    } catch {
      // ignore fetch error
    }
  }

  // 3. Fallback: Return flat Google-style avatar matching Customer page exactly
  const svg = generateGoogleFlatAvatar(name, rawEmail || validHash || name);
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
