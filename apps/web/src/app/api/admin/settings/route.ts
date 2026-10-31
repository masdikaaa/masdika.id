import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic, decryptDeterministic } from '@/lib/encryption';
import { generateSecret, generateURI, verify } from 'otplib';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';
import { getUploadsDir } from '@/lib/file-utils';
import { invalidateRustFSCache } from '@/lib/rustfs';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    const settings = await prisma.setting.findMany();
    
    // Convert settings array to object
    const settingsObj = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    settingsObj['rustfs_endpoint'] = settingsObj['rustfs_endpoint'] || process.env.RUSTFS_ENDPOINT || 'http://192.168.79.10:9000';
    settingsObj['rustfs_access_key'] = settingsObj['rustfs_access_key'] || process.env.RUSTFS_ACCESS_KEY || '39b45c5dd5b53d8c4baba0b7';
    settingsObj['rustfs_secret_key'] = settingsObj['rustfs_secret_key'] || process.env.RUSTFS_SECRET_KEY || 'a73fd5f8f9c867a3ef2af79c6ef74aa6291f41a20293fc88ab0845bc952012c1';
    settingsObj['rustfs_bucket'] = settingsObj['rustfs_bucket'] || process.env.RUSTFS_BUCKET || 'masdika-media';
    settingsObj['rustfs_enabled'] = settingsObj['rustfs_enabled'] ?? (process.env.RUSTFS_ENABLED ?? 'true');

    return NextResponse.json({
      user: {
        name: decryptDeterministic(user?.name) || '',
        email: decryptDeterministic(user?.email) || '',
      },
      settings: settingsObj
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { name, email, bio, twoFactorEnabled, profileImage, cv_url, setup2FA, verify2FA, social_facebook, social_twitter, social_linkedin, social_instagram, social_github, contact_email, contact_location, contact_phone, hero_title, hero_description, hero_typing_text, meta_description, meta_description_blog, meta_description_portfolio, meta_description_services, meta_description_opportunities, meta_description_resume, meta_description_contact, meta_description_community, meta_description_events, meta_description_vacancies, maintenance_mode, maintenance_message, vps_enabled, k3s_enabled, cdn_enabled, promo_banner_image, promo_banner_url, promo_banner_active, tax_rate, rustfs_endpoint, rustfs_access_key, rustfs_secret_key, rustfs_bucket, rustfs_enabled } = body;

    // Update user
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(name !== undefined && { name: encryptDeterministic(name) }),
          ...(email !== undefined && { email: encryptDeterministic(email.toLowerCase().trim()) }),
        }
      });
    }

    // Update settings (bio and social links)
    const settingsToUpdate = [];
    if (bio !== undefined) settingsToUpdate.push({ key: 'bio', value: bio });
    if (social_facebook !== undefined) settingsToUpdate.push({ key: 'social_facebook', value: social_facebook });
    if (social_twitter !== undefined) settingsToUpdate.push({ key: 'social_twitter', value: social_twitter });
    if (social_linkedin !== undefined) settingsToUpdate.push({ key: 'social_linkedin', value: social_linkedin });
    if (social_instagram !== undefined) settingsToUpdate.push({ key: 'social_instagram', value: social_instagram });
    if (social_github !== undefined) settingsToUpdate.push({ key: 'social_github', value: social_github });
    if (contact_email !== undefined) settingsToUpdate.push({ key: 'contact_email', value: contact_email });
    if (contact_location !== undefined) settingsToUpdate.push({ key: 'contact_location', value: contact_location });
    if (contact_phone !== undefined) settingsToUpdate.push({ key: 'contact_phone', value: contact_phone });
    if (hero_title !== undefined) settingsToUpdate.push({ key: 'hero_title', value: hero_title });
    if (hero_description !== undefined) settingsToUpdate.push({ key: 'hero_description', value: hero_description });
    if (hero_typing_text !== undefined) settingsToUpdate.push({ key: 'hero_typing_text', value: hero_typing_text });
    if (meta_description !== undefined) settingsToUpdate.push({ key: 'meta_description', value: meta_description });
    if (meta_description_blog !== undefined) settingsToUpdate.push({ key: 'meta_description_blog', value: meta_description_blog });
    if (meta_description_portfolio !== undefined) settingsToUpdate.push({ key: 'meta_description_portfolio', value: meta_description_portfolio });
    if (meta_description_services !== undefined) settingsToUpdate.push({ key: 'meta_description_services', value: meta_description_services });
    if (meta_description_opportunities !== undefined) settingsToUpdate.push({ key: 'meta_description_opportunities', value: meta_description_opportunities });
    if (meta_description_resume !== undefined) settingsToUpdate.push({ key: 'meta_description_resume', value: meta_description_resume });
    if (meta_description_contact !== undefined) settingsToUpdate.push({ key: 'meta_description_contact', value: meta_description_contact });
    if (meta_description_community !== undefined) settingsToUpdate.push({ key: 'meta_description_community', value: meta_description_community });
    if (meta_description_events !== undefined) settingsToUpdate.push({ key: 'meta_description_events', value: meta_description_events });
    if (meta_description_vacancies !== undefined) settingsToUpdate.push({ key: 'meta_description_vacancies', value: meta_description_vacancies });
    if (cv_url !== undefined) settingsToUpdate.push({ key: 'cv_url', value: cv_url });
    if (maintenance_mode !== undefined) settingsToUpdate.push({ key: 'maintenance_mode', value: String(maintenance_mode) });
    if (maintenance_message !== undefined) settingsToUpdate.push({ key: 'maintenance_message', value: maintenance_message });
    if (vps_enabled !== undefined) settingsToUpdate.push({ key: 'vps_enabled', value: String(vps_enabled) });
    if (k3s_enabled !== undefined) settingsToUpdate.push({ key: 'k3s_enabled', value: String(k3s_enabled) });
    if (cdn_enabled !== undefined) settingsToUpdate.push({ key: 'cdn_enabled', value: String(cdn_enabled) });
    if (promo_banner_image !== undefined) settingsToUpdate.push({ key: 'promo_banner_image', value: promo_banner_image });
    if (promo_banner_url !== undefined) settingsToUpdate.push({ key: 'promo_banner_url', value: promo_banner_url });
    if (promo_banner_active !== undefined) settingsToUpdate.push({ key: 'promo_banner_active', value: String(promo_banner_active) });
    if (tax_rate !== undefined) settingsToUpdate.push({ key: 'tax_rate', value: String(tax_rate) });
    if (rustfs_endpoint !== undefined) settingsToUpdate.push({ key: 'rustfs_endpoint', value: String(rustfs_endpoint) });
    if (rustfs_access_key !== undefined) settingsToUpdate.push({ key: 'rustfs_access_key', value: String(rustfs_access_key) });
    if (rustfs_secret_key !== undefined) settingsToUpdate.push({ key: 'rustfs_secret_key', value: String(rustfs_secret_key) });
    if (rustfs_bucket !== undefined) settingsToUpdate.push({ key: 'rustfs_bucket', value: String(rustfs_bucket) });
    if (rustfs_enabled !== undefined) settingsToUpdate.push({ key: 'rustfs_enabled', value: String(rustfs_enabled) });

    for (const setting of settingsToUpdate) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      });
    }

    invalidateRustFSCache();

    // Update profile image
    if (profileImage !== undefined) {
      let finalImagePath = profileImage;
      
      const existingSetting = await prisma.setting.findUnique({ where: { key: 'profileImage' } });
      const oldImagePath = existingSetting?.value || '';

      if (profileImage.startsWith('data:image/')) {
        const matches = profileImage.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const fileName = `avatar-${Date.now()}.webp`;
          const uploadDir = getUploadsDir('avatars');
          
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          const filePath = path.join(uploadDir, fileName);
          
          // Optimize image using sharp (dynamic import to fix Turbopack build error)
          const sharpModule = await import('sharp');
          const sharp = sharpModule.default || sharpModule;
          
          await sharp(buffer)
            .resize(800, undefined, {
              withoutEnlargement: true,
              fit: 'inside',
            })
            .webp({ quality: 80 })
            .toFile(filePath);
          
          finalImagePath = `/uploads/avatars/${fileName}`;
        }
      }
      if ((profileImage === '' || profileImage.startsWith('data:image/')) && oldImagePath.startsWith('/uploads/')) {
        try {
          const safeFilename = path.basename(oldImagePath);
          // If the old path starts with /uploads/avatars/, we must handle the path correctly.
          // FIX: Prevent directory traversal by strictly joining with safeFilename
          const oldFileAbsolutePath = getUploadsDir('avatars', safeFilename);
          if (fs.existsSync(oldFileAbsolutePath)) {
            fs.unlinkSync(oldFileAbsolutePath);
          }
        } catch (e) {
          console.error("Failed to delete old profile image:", e);
        }
      }

      await prisma.setting.upsert({
        where: { key: 'profileImage' },
        update: { value: finalImagePath },
        create: { key: 'profileImage', value: finalImagePath }
      });
    }

    // Handle 2FA Setup
    if (setup2FA) {
      const secret = generateSecret();
      await prisma.setting.upsert({
        where: { key: 'twoFactorSecret' },
        update: { value: secret },
        create: { key: 'twoFactorSecret', value: secret }
      });
      const issuer = `${process.env.SMTP_FROM_NAME || 'Masdika.ID'} Admin`;
      const accountName = email || user?.email || 'admin@masdika.dev';
      const otpauthUrl = generateURI({
        issuer,
        label: accountName,
        secret
      });
      return NextResponse.json({ success: true, otpauthUrl, secret });
    }

    // Handle 2FA Verify
    if (verify2FA) {
      const secretSetting = await prisma.setting.findUnique({ where: { key: 'twoFactorSecret' } });
      if (!secretSetting) return NextResponse.json({ error: 'No secret found' }, { status: 400 });
      
      try {
        const tokenString = String(verify2FA).trim();
        const result = await verify({ token: tokenString, secret: secretSetting.value });
        if (result.valid) {
          await prisma.setting.upsert({
            where: { key: 'twoFactorEnabled' },
            update: { value: 'true' },
            create: { key: 'twoFactorEnabled', value: 'true' }
          });
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }
      } catch (err) {
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }
    }

    // Handle 2FA Disable
    if (twoFactorEnabled === false) {
      await prisma.setting.upsert({
        where: { key: 'twoFactorEnabled' },
        update: { value: 'false' },
        create: { key: 'twoFactorEnabled', value: 'false' }
      });
      await prisma.setting.deleteMany({ where: { key: 'twoFactorSecret' }});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
