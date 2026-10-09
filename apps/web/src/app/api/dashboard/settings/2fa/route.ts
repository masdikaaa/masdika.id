import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { decryptDeterministic } from '@/lib/encryption';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { action, code } = await req.json();
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const email = decryptDeterministic(user.email);

    if (action === 'generate') {
      const secret = generateSecret();
      const otpauthUrl = generateURI({ issuer: 'Masdika', label: email, secret });
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: secret, twoFactorEnabled: false }
      });

      return NextResponse.json({ qrCodeUrl, secret });
    }

    if (action === 'verify_enable') {
      if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });
      if (!user.twoFactorSecret) return NextResponse.json({ error: '2FA setup not initiated' }, { status: 400 });

      const isValid = verify({ token: code, secret: user.twoFactorSecret });
      if (!isValid) return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true }
      });

      return NextResponse.json({ success: true, message: '2FA enabled successfully' });
    }

    if (action === 'disable') {
      if (!code) return NextResponse.json({ error: 'Code is required to disable 2FA' }, { status: 400 });
      if (!user.twoFactorSecret || !user.twoFactorEnabled) {
         return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
      }

      const isValid = verify({ token: code, secret: user.twoFactorSecret });
      if (!isValid) return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null }
      });

      return NextResponse.json({ success: true, message: '2FA disabled successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('2FA error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
