import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { sendAdminCommunityNotificationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

// ─── Allowed link hosts ───────────────────────────────────────────────────────
const WA_ALLOWED_HOST = 'chat.whatsapp.com';
const TG_ALLOWED_HOSTS = ['t.me', 'telegram.me'];

/**
 * Validate that the link is a genuine WhatsApp or Telegram group invite URL.
 * WhatsApp: https://chat.whatsapp.com/INVITE_CODE
 * Telegram:  https://t.me/+CODE or https://t.me/username or https://telegram.me/...
 */
function isValidGroupLink(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;

    const host = url.hostname.toLowerCase();

    // WhatsApp
    if (host === WA_ALLOWED_HOST) {
      if (!/^\/[A-Za-z0-9]{10,40}$/.test(url.pathname)) return false;
      if (url.search || url.hash) return false;
      return true;
    }

    // Telegram
    if (TG_ALLOWED_HOSTS.includes(host)) {
      // t.me/+InviteHash or t.me/username — basic sanity check
      if (!/^\/[+A-Za-z0-9_]{3,64}$/.test(url.pathname)) return false;
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Strip HTML tags from scraped metadata */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { link } = body;

    if (typeof link !== 'string' || !isValidGroupLink(link)) {
      return NextResponse.json(
        { error: 'Invalid group invite link. Please use a WhatsApp (chat.whatsapp.com) or Telegram (t.me) link.' },
        { status: 400 }
      );
    }

    // ── Rate limit: 2 submissions per hour per IP ───────────────────────────
    const ip = getClientIp(req);

    const allowed = await checkRateLimit('COMMUNITY', ip, 2, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: 'You have reached the submission limit. Please try again later.' },
        { status: 429 }
      );
    }

    // ── Duplicate check ─────────────────────────────────────────────────────
    const existingGroup = await prisma.communityGroup.findUnique({
      where: { link },
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: 'This WhatsApp group has already been submitted.' },
        { status: 400 }
      );
    }

    // ── Scrape group name (SSRF-safe: no redirects, timeout, host pinned) ──
    let groupName = link.includes('whatsapp') ? 'WhatsApp Group' : 'Telegram Group';
    try {
      const fetchRes = await fetch(link, {
        method: 'GET',
        redirect: 'error', // SSRF mitigation: refuse HTTP redirects
        headers: {
          'User-Agent': 'WhatsApp/2.21.12.21 A',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (fetchRes.ok) {
        const html = await fetchRes.text();
        // Extract og:title only — sanitise result
        const titleMatch = html.match(
          /<meta\s+property="og:title"\s+content="([^"]{1,200})"\s*\/?>/i
        );
        if (titleMatch?.[1]) {
          const raw = stripHtml(titleMatch[1]).substring(0, 100);
          if (raw.length > 0) groupName = raw;
        }
      }
    } catch {
      // Fetch failed — use default name, don't block submission
    }

    // ── Persist (not published until admin review) ──────────────────────────
    const newGroup = await prisma.communityGroup.create({
      data: {
        name: groupName,
        link,
        isPublished: false,
        submitterIp: ip !== 'unknown' ? ip : null,
      },
    });

    // Notify admin asynchronously
    sendAdminCommunityNotificationEmail(groupName, link).catch((err) =>
      console.error('Failed to send admin notification email:', err)
    );

    return NextResponse.json({
      success: true,
      message: 'Group successfully submitted and is waiting for admin review.',
      group: newGroup,
    });
  } catch (error) {
    console.error('Submit community group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const groups = await prisma.communityGroup.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error('Fetch public community groups error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
