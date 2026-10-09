import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email') || '';
  const name = searchParams.get('name') || 'User';

  const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
  const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;
  const fallbackUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f172a&textColor=22d3ee`;

  try {
    const res = await fetch(gravatarUrl, { method: 'HEAD', cache: 'no-store' });
    if (res.ok) {
      return NextResponse.redirect(gravatarUrl);
    }
  } catch (e) {
    // ignore fetch error
  }

  return NextResponse.redirect(fallbackUrl);
}
