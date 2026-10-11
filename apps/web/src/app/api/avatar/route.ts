import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic } from '@/lib/encryption';

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
  return clean.charAt(0).toUpperCase();
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
  const { searchParams } = new URL(req.url);
  const rawEmail = (searchParams.get('email') || '').trim().toLowerCase();
  const name = searchParams.get('name') || 'User';

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
        const redirectUrl = user.image.startsWith('http') ? user.image : new URL(user.image, req.url).toString();
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      // ignore db error
    }
  }

  // 2. Check Gravatar
  if (rawEmail) {
    const hash = crypto.createHash('md5').update(rawEmail).digest('hex');
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404&s=160`;

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
  const svg = generateGoogleFlatAvatar(name, rawEmail || name);
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
