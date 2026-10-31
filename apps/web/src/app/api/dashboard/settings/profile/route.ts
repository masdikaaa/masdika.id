import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { decryptDeterministic } from '@/lib/encryption';
import { getUploadsDir, deleteLocalFile } from '@/lib/file-utils';
import { uploadPublicUploadToRustFS, deletePublicUploadFromRustFS } from '@/lib/rustfs';

const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_AVATAR_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validate image file by checking magic bytes (file signature).
 * Prevents uploading malicious files disguised as images.
 */
function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
      && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  return false;
}

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
        deleteLocalFile(currentUser.image);
        try {
          await deletePublicUploadFromRustFS(currentUser.image.replace(/^\/uploads\//, ''));
        } catch {}
      }
      updateData.image = null;
    } else if (file && file.size > 0) {
      // 1. Enforce file size limit
      if (file.size > MAX_AVATAR_SIZE) {
        return NextResponse.json({ error: 'Ukuran file avatar melebihi batas maksimal 5MB' }, { status: 400 });
      }

      // 2. Enforce strict extension whitelist
      const fileExt = (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_AVATAR_EXTS.has(fileExt)) {
        return NextResponse.json({ error: 'Format file tidak diizinkan. Hanya file gambar (.jpg, .jpeg, .png, .webp, .gif) yang diperbolehkan.' }, { status: 400 });
      }

      // 3. Enforce MIME type validation
      if (file.type && !ALLOWED_AVATAR_MIMES.has(file.type.toLowerCase())) {
        return NextResponse.json({ error: 'Tipe konten file tidak valid untuk avatar' }, { status: 400 });
      }

      // 4. Validate binary magic bytes
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      if (!isValidImageMagicBytes(buffer)) {
        return NextResponse.json({ error: 'Konten file tidak valid atau bukan gambar asli' }, { status: 400 });
      }

      // 5. Re-encode and sanitize image with Sharp (strips all EXIF, metadata, and any embedded scripts)
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;

      const optimizedBuffer = await sharp(buffer)
        .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const uploadDir = getUploadsDir('avatars');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      // Always save as clean sanitized .webp with unguessable random suffix
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const fileName = `avatar-${Date.now()}-${randomSuffix}.webp`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, optimizedBuffer, { mode: 0o644 });
      imageUrl = `/uploads/avatars/${fileName}`;

      // Upload to RustFS bucket (masdika-media)
      try {
        await uploadPublicUploadToRustFS(`avatars/${fileName}`, optimizedBuffer, 'image/webp');
      } catch (rustErr) {
        console.error('[Avatar Upload] RustFS upload error:', rustErr);
      }

      // Clean up previous avatar if it was changed
      const currentUser = await prisma.user.findUnique({ where: { id: auth.userId }, select: { image: true } });
      if (currentUser?.image && currentUser.image !== imageUrl) {
        deleteLocalFile(currentUser.image);
        try {
          await deletePublicUploadFromRustFS(currentUser.image.replace(/^\/uploads\//, ''));
        } catch {}
      }
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
