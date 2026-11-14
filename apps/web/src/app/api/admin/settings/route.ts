import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic, decryptDeterministic } from '@/lib/encryption';
import { generateSecret, generateURI, verify } from 'otplib';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';
import { getUploadsDir } from '@/lib/file-utils';
import { invalidateRustFSCache } from '@/lib/rustfs';
import { invalidateK8sClusterConfigCache } from '@/lib/k8s-database';
import { invalidatePublicSettingsCache } from '@/lib/settings';
import { revalidatePath } from 'next/cache';
import { checkRateLimit } from '@/lib/rate-limit';

const MASKED_SECRET = '••••••••';

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

    // Never expose raw secrets in settings responses
    settingsObj['twoFactorEnabled'] = settingsObj['twoFactorEnabled'] === 'true' ? 'true' : 'false';
    delete settingsObj['twoFactorSecret'];
    delete settingsObj['email_blast_smtp_pass'];

    const hasRustFsSecret = Boolean(settingsObj['rustfs_secret_key'] || process.env.RUSTFS_SECRET_KEY);
    settingsObj['rustfs_endpoint'] = settingsObj['rustfs_endpoint'] || process.env.RUSTFS_ENDPOINT || '';
    settingsObj['rustfs_access_key'] = settingsObj['rustfs_access_key'] || process.env.RUSTFS_ACCESS_KEY || '';
    settingsObj['rustfs_secret_key'] = hasRustFsSecret ? MASKED_SECRET : '';
    settingsObj['rustfs_bucket'] = settingsObj['rustfs_bucket'] || process.env.RUSTFS_BUCKET || 'masdika-cdn';
    settingsObj['rustfs_media_bucket'] = settingsObj['rustfs_media_bucket'] || process.env.RUSTFS_MEDIA_BUCKET || 'masdika-media';
    settingsObj['rustfs_ticket_bucket'] = settingsObj['rustfs_ticket_bucket'] || process.env.RUSTFS_TICKET_BUCKET || 'masdika-ticket';
    settingsObj['rustfs_enabled'] = settingsObj['rustfs_enabled'] ?? (process.env.RUSTFS_ENABLED ?? 'false');

    // Managed Database (Kubernetes API) Cluster Settings
    const hasKubeconfig = Boolean(settingsObj['managed_db_kubeconfig'] || process.env.MANAGED_DB_KUBECONFIG);
    const hasServiceToken = Boolean(settingsObj['managed_db_service_token'] || process.env.MANAGED_DB_SERVICE_TOKEN);
    settingsObj['managed_db_auth_mode'] = settingsObj['managed_db_auth_mode'] || 'KUBECONFIG';
    settingsObj['managed_db_api_server'] = settingsObj['managed_db_api_server'] || process.env.MANAGED_DB_API_SERVER || '';
    settingsObj['managed_db_kubeconfig'] = hasKubeconfig ? MASKED_SECRET : '';
    settingsObj['managed_db_service_token'] = hasServiceToken ? MASKED_SECRET : '';
    settingsObj['managed_db_skip_tls'] = settingsObj['managed_db_skip_tls'] ?? 'true';
    settingsObj['managed_db_ca_cert'] = settingsObj['managed_db_ca_cert'] || '';
    settingsObj['managed_db_public_domain'] = settingsObj['managed_db_public_domain'] || process.env.MANAGED_DB_PUBLIC_DOMAIN || '';
    settingsObj['managed_db_public_ip'] = settingsObj['managed_db_public_ip'] || process.env.MANAGED_DB_PUBLIC_IP || '';
    settingsObj['managed_db_pma_url'] = settingsObj['managed_db_pma_url'] || process.env.MANAGED_DB_PMA_URL || '';
    settingsObj['managed_db_pgadmin_url'] = settingsObj['managed_db_pgadmin_url'] || process.env.MANAGED_DB_PGADMIN_URL || '';
    settingsObj['managed_db_mongo_url'] = settingsObj['managed_db_mongo_url'] || process.env.MANAGED_DB_MONGO_URL || '';

    // Managed Apps (Kubernetes API) Cluster Settings
    const hasAppKubeconfig = Boolean(settingsObj['managed_app_kubeconfig'] || process.env.MANAGED_APP_KUBECONFIG);
    const hasAppServiceToken = Boolean(settingsObj['managed_app_service_token'] || process.env.MANAGED_APP_SERVICE_TOKEN);
    settingsObj['managed_app_auth_mode'] = settingsObj['managed_app_auth_mode'] || 'KUBECONFIG';
    settingsObj['managed_app_api_server'] = settingsObj['managed_app_api_server'] || process.env.MANAGED_APP_API_SERVER || '';
    settingsObj['managed_app_kubeconfig'] = hasAppKubeconfig ? MASKED_SECRET : '';
    settingsObj['managed_app_service_token'] = hasAppServiceToken ? MASKED_SECRET : '';
    settingsObj['managed_app_skip_tls'] = settingsObj['managed_app_skip_tls'] ?? 'true';
    settingsObj['managed_app_ca_cert'] = settingsObj['managed_app_ca_cert'] || '';
    settingsObj['managed_app_public_domain'] = settingsObj['managed_app_public_domain'] || process.env.MANAGED_APP_PUBLIC_DOMAIN || '';
    settingsObj['managed_app_public_ip'] = settingsObj['managed_app_public_ip'] || process.env.MANAGED_APP_PUBLIC_IP || '';

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

  if (auth.impersonatedBy) {
    return NextResponse.json({ error: 'System settings cannot be modified during an impersonation session.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, bio, twoFactorEnabled, disable2FACode, profileImage, cv_url, setup2FA, verify2FA, social_facebook, social_twitter, social_linkedin, social_instagram, social_github, contact_email, contact_location, contact_phone, hero_title, hero_description, hero_typing_text, meta_description, meta_description_blog, meta_description_portfolio, meta_description_services, meta_description_opportunities, meta_description_resume, meta_description_contact, meta_description_community, meta_description_events, meta_description_vacancies, maintenance_mode, maintenance_message, vps_enabled, k3s_enabled, cdn_enabled, promo_banner_image, promo_banner_url, promo_banner_active, tax_rate, rustfs_endpoint, rustfs_access_key, rustfs_secret_key, rustfs_bucket, rustfs_media_bucket, rustfs_ticket_bucket, rustfs_enabled, managed_db_auth_mode, managed_db_api_server, managed_db_kubeconfig, managed_db_service_token, managed_db_skip_tls, managed_db_ca_cert, managed_db_public_domain, managed_db_public_ip, managed_db_pma_url, managed_db_pgadmin_url, managed_db_mongo_url, managed_app_auth_mode, managed_app_api_server, managed_app_kubeconfig, managed_app_service_token, managed_app_skip_tls, managed_app_ca_cert, managed_app_public_domain, managed_app_public_ip } = body;

    if (tax_rate !== undefined) {
      const parsedTax = Number(tax_rate);
      if (!Number.isFinite(parsedTax) || parsedTax < 0 || parsedTax > 100) {
        return NextResponse.json({ error: 'Tax rate must be between 0 and 100.' }, { status: 400 });
      }
    }

    // Update user
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (user && (name !== undefined || email !== undefined)) {
      let nextEncryptedEmail: string | undefined;
      if (email !== undefined) {
        const normalizedEmail = String(email).toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
          return NextResponse.json({ error: 'Invalid email address format.' }, { status: 400 });
        }
        nextEncryptedEmail = encryptDeterministic(normalizedEmail);
        if (nextEncryptedEmail !== user.email) {
          const emailTaken = await prisma.user.findUnique({ where: { email: nextEncryptedEmail } });
          if (emailTaken && emailTaken.id !== user.id) {
            return NextResponse.json({ error: 'Email is already in use by another account.' }, { status: 400 });
          }
        }
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(name !== undefined && { name: encryptDeterministic(String(name).trim()) }),
          ...(nextEncryptedEmail !== undefined && { email: nextEncryptedEmail }),
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
    if (rustfs_secret_key !== undefined && rustfs_secret_key !== MASKED_SECRET) {
      settingsToUpdate.push({ key: 'rustfs_secret_key', value: String(rustfs_secret_key) });
    }
    if (rustfs_bucket !== undefined) settingsToUpdate.push({ key: 'rustfs_bucket', value: String(rustfs_bucket) });
    if (rustfs_media_bucket !== undefined) settingsToUpdate.push({ key: 'rustfs_media_bucket', value: String(rustfs_media_bucket) });
    if (rustfs_ticket_bucket !== undefined) settingsToUpdate.push({ key: 'rustfs_ticket_bucket', value: String(rustfs_ticket_bucket) });
    if (rustfs_enabled !== undefined) settingsToUpdate.push({ key: 'rustfs_enabled', value: String(rustfs_enabled) });

    // Managed Database (Kubernetes API) Cluster Settings
    if (managed_db_auth_mode !== undefined) settingsToUpdate.push({ key: 'managed_db_auth_mode', value: String(managed_db_auth_mode).trim() });
    if (managed_db_api_server !== undefined) settingsToUpdate.push({ key: 'managed_db_api_server', value: String(managed_db_api_server).trim() });
    if (managed_db_kubeconfig !== undefined && managed_db_kubeconfig !== MASKED_SECRET && String(managed_db_kubeconfig).trim() !== '') {
      settingsToUpdate.push({ key: 'managed_db_kubeconfig', value: encryptDeterministic(String(managed_db_kubeconfig).trim()) });
    }
    if (managed_db_service_token !== undefined && managed_db_service_token !== MASKED_SECRET && String(managed_db_service_token).trim() !== '') {
      settingsToUpdate.push({ key: 'managed_db_service_token', value: encryptDeterministic(String(managed_db_service_token).trim()) });
    }
    if (managed_db_skip_tls !== undefined) settingsToUpdate.push({ key: 'managed_db_skip_tls', value: String(managed_db_skip_tls) });
    if (managed_db_ca_cert !== undefined) settingsToUpdate.push({ key: 'managed_db_ca_cert', value: String(managed_db_ca_cert).trim() });
    if (managed_db_public_domain !== undefined) settingsToUpdate.push({ key: 'managed_db_public_domain', value: String(managed_db_public_domain).trim() });
    if (managed_db_public_ip !== undefined) settingsToUpdate.push({ key: 'managed_db_public_ip', value: String(managed_db_public_ip).trim() });
    if (managed_db_pma_url !== undefined) settingsToUpdate.push({ key: 'managed_db_pma_url', value: String(managed_db_pma_url).trim() });
    if (managed_db_pgadmin_url !== undefined) settingsToUpdate.push({ key: 'managed_db_pgadmin_url', value: String(managed_db_pgadmin_url).trim() });
    if (managed_db_mongo_url !== undefined) settingsToUpdate.push({ key: 'managed_db_mongo_url', value: String(managed_db_mongo_url).trim() });

    // Managed Apps (Kubernetes API) Cluster Settings
    if (managed_app_auth_mode !== undefined) settingsToUpdate.push({ key: 'managed_app_auth_mode', value: String(managed_app_auth_mode).trim() });
    if (managed_app_api_server !== undefined) settingsToUpdate.push({ key: 'managed_app_api_server', value: String(managed_app_api_server).trim() });
    if (managed_app_kubeconfig !== undefined && managed_app_kubeconfig !== MASKED_SECRET && String(managed_app_kubeconfig).trim() !== '') {
      settingsToUpdate.push({ key: 'managed_app_kubeconfig', value: encryptDeterministic(String(managed_app_kubeconfig).trim()) });
    }
    if (managed_app_service_token !== undefined && managed_app_service_token !== MASKED_SECRET && String(managed_app_service_token).trim() !== '') {
      settingsToUpdate.push({ key: 'managed_app_service_token', value: encryptDeterministic(String(managed_app_service_token).trim()) });
    }
    if (managed_app_skip_tls !== undefined) settingsToUpdate.push({ key: 'managed_app_skip_tls', value: String(managed_app_skip_tls) });
    if (managed_app_ca_cert !== undefined) settingsToUpdate.push({ key: 'managed_app_ca_cert', value: String(managed_app_ca_cert).trim() });
    if (managed_app_public_domain !== undefined) settingsToUpdate.push({ key: 'managed_app_public_domain', value: String(managed_app_public_domain).trim() });
    if (managed_app_public_ip !== undefined) settingsToUpdate.push({ key: 'managed_app_public_ip', value: String(managed_app_public_ip).trim() });

    for (const setting of settingsToUpdate) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      });
    }

    invalidateRustFSCache();
    invalidateK8sClusterConfigCache();
    await invalidatePublicSettingsCache();
    try {
      revalidatePath('/', 'layout');
    } catch {}

    // Update profile image
    if (profileImage !== undefined) {
      let finalImagePath = profileImage;
      
      const existingSetting = await prisma.setting.findUnique({ where: { key: 'profileImage' } });
      const oldImagePath = existingSetting?.value || '';

      if (profileImage.startsWith('data:image/')) {
        const matches = profileImage.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
        if (!matches || matches.length !== 3) {
          return NextResponse.json({ error: 'Format gambar profil tidak didukung (hanya JPG, PNG, WebP, GIF).' }, { status: 400 });
        }
        const buffer = Buffer.from(matches[2], 'base64');
        if (buffer.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: 'Ukuran gambar profil maksimal 5MB.' }, { status: 400 });
        }

        const { validateRealImageBuffer } = await import('@/lib/upload-security');
        const imgCheck = await validateRealImageBuffer(buffer, { maxWidth: 8000, maxHeight: 8000 });
        if (!imgCheck.valid) {
          return NextResponse.json({ error: imgCheck.error || 'File gambar profil tidak valid.' }, { status: 400 });
        }

        const fileName = `avatar-${Date.now()}.webp`;
        const uploadDir = getUploadsDir('avatars');

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);

        // Optimize image using sharp (dynamic import to fix Turbopack build error)
        const sharpModule = await import('sharp');
        const sharp = sharpModule.default || sharpModule;

        const optimizedBuffer = await sharp(buffer, { failOn: 'error' })
          .rotate()
          .resize(800, undefined, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .webp({ quality: 80 })
          .toBuffer();

        fs.writeFileSync(filePath, optimizedBuffer, { mode: 0o644 });

        try {
          const { uploadPublicUploadToRustFS } = await import('@/lib/rustfs');
          await uploadPublicUploadToRustFS(`avatars/${fileName}`, optimizedBuffer, 'image/webp');
        } catch (rustErr) {
          console.error('[Admin Profile Image] RustFS upload error:', rustErr);
        }

        finalImagePath = `/uploads/avatars/${fileName}`;
      } else if (profileImage !== '' && !profileImage.startsWith('/uploads/') && !profileImage.startsWith('https://')) {
        return NextResponse.json({ error: 'URL gambar profil tidak valid.' }, { status: 400 });
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
          try {
            const { deletePublicUploadFromRustFS } = await import('@/lib/rustfs');
            await deletePublicUploadFromRustFS(`avatars/${safeFilename}`);
          } catch {}
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
      const existingEnabled = await prisma.setting.findUnique({ where: { key: 'twoFactorEnabled' } });
      if (existingEnabled?.value === 'true') {
        return NextResponse.json({ error: '2FA is already enabled. Disable it first before generating a new secret.' }, { status: 400 });
      }
      const secret = generateSecret();
      await prisma.setting.upsert({
        where: { key: 'twoFactorSecret' },
        update: { value: secret },
        create: { key: 'twoFactorSecret', value: secret }
      });
      const issuer = `${process.env.SMTP_FROM_NAME || 'Masdika.ID'} Admin`;
      const accountName = email || decryptDeterministic(user?.email) || 'admin@masdika.dev';
      const otpauthUrl = generateURI({
        issuer,
        label: accountName,
        secret
      });
      return NextResponse.json({ success: true, otpauthUrl, secret });
    }

    // Handle 2FA Verify
    if (verify2FA) {
      if (!(await checkRateLimit('ADMIN_2FA_SETTINGS', String(auth.userId), 8, 300))) {
        return NextResponse.json({ error: 'Too many verification attempts. Please wait a few minutes.' }, { status: 429 });
      }
      const secretSetting = await prisma.setting.findUnique({ where: { key: 'twoFactorSecret' } });
      if (!secretSetting) return NextResponse.json({ error: 'No secret found' }, { status: 400 });
      
      try {
        const tokenString = String(verify2FA).trim();
        if (!/^\d{6}$/.test(tokenString)) {
          return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }
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

    // Handle 2FA Disable (requires valid TOTP code if 2FA is currently active)
    if (twoFactorEnabled === false) {
      const existingEnabled = await prisma.setting.findUnique({ where: { key: 'twoFactorEnabled' } });
      if (existingEnabled?.value === 'true') {
        if (!(await checkRateLimit('ADMIN_2FA_SETTINGS', String(auth.userId), 8, 300))) {
          return NextResponse.json({ error: 'Too many verification attempts. Please wait a few minutes.' }, { status: 429 });
        }
        const tokenString = typeof disable2FACode === 'string' || typeof disable2FACode === 'number' ? String(disable2FACode).trim() : '';
        if (!/^\d{6}$/.test(tokenString)) {
          return NextResponse.json({ error: 'A valid 6-digit authenticator code is required to disable 2FA.' }, { status: 400 });
        }
        const secretSetting = await prisma.setting.findUnique({ where: { key: 'twoFactorSecret' } });
        if (!secretSetting?.value) {
          return NextResponse.json({ error: '2FA secret not found.' }, { status: 400 });
        }
        const verifyRes = await verify({ token: tokenString, secret: secretSetting.value });
        if (!verifyRes.valid) {
          return NextResponse.json({ error: 'Invalid 2FA verification code.' }, { status: 400 });
        }
        await prisma.setting.upsert({
          where: { key: 'twoFactorEnabled' },
          update: { value: 'false' },
          create: { key: 'twoFactorEnabled', value: 'false' }
        });
        await prisma.setting.deleteMany({ where: { key: 'twoFactorSecret' } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
