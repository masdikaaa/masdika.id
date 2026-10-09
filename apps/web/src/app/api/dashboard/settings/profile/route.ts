import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { decryptDeterministic } from '@/lib/encryption';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        name: true, email: true, image: true, twoFactorEnabled: true,
        companyName: true, phone: true, address1: true, address2: true,
        city: true, state: true, postalCode: true, country: true,
      }
    });

    if (user) {
      if (user.email) user.email = decryptDeterministic(user.email);
      if (user.name) user.name = decryptDeterministic(user.name);
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const file = formData.get('image') as File | null;
    const removeImage = formData.get('removeImage') === 'true';

    // Billing fields
    const companyName = formData.get('companyName') as string | null;
    const phone = formData.get('phone') as string | null;
    const address1 = formData.get('address1') as string | null;
    const address2 = formData.get('address2') as string | null;
    const city = formData.get('city') as string | null;
    const state = formData.get('state') as string | null;
    const postalCode = formData.get('postalCode') as string | null;
    const country = formData.get('country') as string | null;

    let imageUrl = undefined;
    const updateData: any = {};

    if (removeImage) {
      const currentUser = await prisma.user.findUnique({ where: { id: auth.userId } });
      if (currentUser?.image) {
        const filePath = path.join(process.cwd(), 'public', currentUser.image);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to delete image file', e); }
        }
      }
      updateData.image = null;
    } else if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      imageUrl = `/uploads/avatars/${fileName}`;
    }

    if (name) updateData.name = name;
    if (imageUrl) updateData.image = imageUrl;

    // Always update billing fields if sent
    if (companyName !== null) updateData.companyName = companyName || null;
    if (phone !== null) updateData.phone = phone || null;
    if (address1 !== null) updateData.address1 = address1 || null;
    if (address2 !== null) updateData.address2 = address2 || null;
    if (city !== null) updateData.city = city || null;
    if (state !== null) updateData.state = state || null;
    if (postalCode !== null) updateData.postalCode = postalCode || null;
    if (country !== null) updateData.country = country || null;

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: { name: true, image: true }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
