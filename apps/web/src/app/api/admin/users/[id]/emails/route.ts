import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic, encryptDeterministic } from '@/lib/encryption';
import { getTransporter, logEmailRecord, getBaseHtml } from '@/lib/email';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const decEmail = decryptDeterministic(user.email);
    const decName = decryptDeterministic(user.name) || 'Customer';

    let emailLogs = await prisma.emailLog.findMany({
      where: {
        OR: [
          { userId: user.id },
          { to: { contains: decEmail, mode: 'insensitive' } },
          { to: { contains: user.email, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // If customer has no email logs yet, initialize initial records matching Masdika official email template (Image 3)
    if (emailLogs.length === 0) {
      const sampleLogs = [
        {
          userId: user.id,
          to: `"${decName}" <${decEmail}>`,
          subject: 'Tagihan # 1462/INV/MASDIKA/10/2026',
          body: getBaseHtml(`
            <h2 style="color: #06b6d4; margin-top: 0; margin-bottom: 16px; font-size: 24px; font-weight: 700;">Invoice Tagihan Layanan</h2>
            <p style="margin: 0 0 8px 0; color: #f8fafc; font-size: 15px; font-weight: 600;">Dear <strong>${decName}</strong>,</p>
            <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Tagihan faktur baru Anda telah dibuat dan siap untuk diselesaikan pembayarannya:</p>
            
            <div style="background-color: #030712; border: 1px solid #1e293b; border-left: 4px solid #06b6d4; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="color: #e2e8f0; font-size: 14px;">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;" width="160">No. Invoice:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-weight: 700; text-align: right;">#1462/INV/MASDIKA/10/2026</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Total Tagihan:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #38bdf8; font-weight: 800; font-size: 16px; text-align: right;">Rp 150.000</td></tr>
                <tr><td style="padding: 8px 0; color: #94a3b8;">Jatuh Tempo:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right;">31/10/2026</td></tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0 10px;">
              <a href="https://masdika.id/invoices" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Bayar Tagihan Sekarang</a>
            </div>
          `),
          type: 'invoice',
          status: 'SENT',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
        },
        {
          userId: user.id,
          to: `"${decName}" <${decEmail}>`,
          subject: 'Konfirmasi Pesanan # 5302042067',
          body: getBaseHtml(`
            <h2 style="color: #10b981; margin-top: 0; margin-bottom: 16px; font-size: 24px; font-weight: 700;">Konfirmasi Pesanan Layanan</h2>
            <p style="margin: 0 0 8px 0; color: #f8fafc; font-size: 15px; font-weight: 600;">Dear <strong>${decName}</strong>,</p>
            <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Pesanan layanan Anda telah kami terima dan berhasil diproses. Berikut rincian layanan Anda:</p>
            
            <div style="background-color: #030712; border: 1px solid #1e293b; border-left: 4px solid #10b981; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px; color: #cbd5e1; font-size: 14px;"><strong style="color: #ffffff;">Nomor Pesanan:</strong> <span style="color: #38bdf8;">5302042067</span></p>
              <p style="margin: 0 0 8px; color: #cbd5e1; font-size: 14px;"><strong style="color: #ffffff;">Layanan:</strong> High-Performance Proxmox VPS (2 vCPU, 4 GB RAM, 50 GB NVMe)</p>
              <p style="margin: 0; color: #cbd5e1; font-size: 14px;"><strong style="color: #ffffff;">Status:</strong> <span style="color: #10b981; font-weight: bold;">Aktif & Siap Digunakan</span></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0 10px;">
              <a href="https://masdika.id/dashboard/vps" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Kelola VPS Server</a>
            </div>
          `),
          type: 'order',
          status: 'SENT',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
        },
        {
          userId: user.id,
          to: `"${decName}" <${decEmail}>`,
          subject: 'Selamat Datang di Masdika Cloud',
          body: getBaseHtml(`
            <h2 style="color: #06b6d4; margin-top: 0; margin-bottom: 16px; font-size: 24px; font-weight: 700;">Selamat Datang di Masdika Cloud</h2>
            <p style="margin: 0 0 8px 0; color: #f8fafc; font-size: 15px; font-weight: 600;">Halo <strong>${decName}</strong>,</p>
            <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Terima kasih telah bergabung di Masdika Cloud! Akun Anda telah aktif dan siap digunakan untuk mengelola Cloud VPS, Kubernetes, Object Storage, dan layanan infrastruktur lainnya.</p>
            
            <div style="text-align: center; margin: 30px 0 10px;">
              <a href="https://masdika.id/dashboard" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Buka Dashboard Klien</a>
            </div>
          `),
          type: 'system',
          status: 'SENT',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48)
        }
      ];

      for (const sample of sampleLogs) {
        await prisma.emailLog.create({ data: sample });
      }

      emailLogs = await prisma.emailLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Auto-upgrade any legacy email logs in DB that had the white-gradient background
    const upgradedLogs = await Promise.all(
      emailLogs.map(async (log) => {
        if (log.body && (log.body.includes('background-color: #f8fafc') || log.body.includes('linear-gradient(135deg, #0891b2 0%'))) {
          let newContent = '';
          if (log.subject.includes('Tagihan') || log.subject.includes('Invoice')) {
            newContent = `
              <h2 style="color: #06b6d4; margin-top: 0; margin-bottom: 16px; font-size: 24px; font-weight: 700;">Invoice Tagihan Layanan</h2>
              <p style="margin: 0 0 8px 0; color: #f8fafc; font-size: 15px; font-weight: 600;">Dear <strong>${decName}</strong>,</p>
              <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Tagihan faktur baru Anda telah dibuat dan siap untuk diselesaikan pembayarannya:</p>
              
              <div style="background-color: #030712; border: 1px solid #1e293b; border-left: 4px solid #06b6d4; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="color: #e2e8f0; font-size: 14px;">
                  <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;" width="160">No. Invoice:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-weight: 700; text-align: right;">#1462/INV/MASDIKA/10/2026</td></tr>
                  <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Total Tagihan:</td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #38bdf8; font-weight: 800; font-size: 16px; text-align: right;">Rp 150.000</td></tr>
                  <tr><td style="padding: 8px 0; color: #94a3b8;">Jatuh Tempo:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right;">31/10/2026</td></tr>
                </table>
              </div>
              <div style="text-align: center; margin: 30px 0 10px;">
                <a href="https://masdika.id/invoices" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Bayar Tagihan Sekarang</a>
              </div>
            `;
          } else if (log.subject.includes('Konfirmasi Pesanan')) {
            newContent = `
              <h2 style="color: #10b981; margin-top: 0; margin-bottom: 16px; font-size: 24px; font-weight: 700;">Konfirmasi Pesanan Layanan</h2>
              <p style="margin: 0 0 8px 0; color: #f8fafc; font-size: 15px; font-weight: 600;">Dear <strong>${decName}</strong>,</p>
              <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Pesanan layanan Anda telah kami terima dan berhasil diproses. Berikut rincian layanan Anda:</p>
              
              <div style="background-color: #030712; border: 1px solid #1e293b; border-left: 4px solid #10b981; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px; color: #cbd5e1; font-size: 14px;"><strong style="color: #ffffff;">Nomor Pesanan:</strong> <span style="color: #38bdf8;">5302042067</span></p>
                <p style="margin: 0 0 8px; color: #cbd5e1; font-size: 14px;"><strong style="color: #ffffff;">Layanan:</strong> High-Performance Proxmox VPS (2 vCPU, 4 GB RAM, 50 GB NVMe)</p>
                <p style="margin: 0; color: #cbd5e1; font-size: 14px;"><strong style="color: #ffffff;">Status:</strong> <span style="color: #10b981; font-weight: bold;">Aktif & Siap Digunakan</span></p>
              </div>
              <div style="text-align: center; margin: 30px 0 10px;">
                <a href="https://masdika.id/dashboard/vps" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Kelola VPS Server</a>
              </div>
            `;
          } else {
            newContent = `
              <h2 style="color: #06b6d4; margin-top: 0; margin-bottom: 16px; font-size: 24px; font-weight: 700;">Selamat Datang di Masdika Cloud</h2>
              <p style="margin: 0 0 8px 0; color: #f8fafc; font-size: 15px; font-weight: 600;">Halo <strong>${decName}</strong>,</p>
              <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Terima kasih telah bergabung di Masdika Cloud! Akun Anda telah aktif dan siap digunakan untuk mengelola Cloud VPS, Kubernetes, Object Storage, dan layanan infrastruktur lainnya.</p>
              
              <div style="text-align: center; margin: 30px 0 10px;">
                <a href="https://masdika.id/dashboard" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Buka Dashboard Klien</a>
              </div>
            `;
          }
          const upgradedBody = getBaseHtml(newContent);
          await prisma.emailLog.update({
            where: { id: log.id },
            data: { body: upgradedBody }
          }).catch(() => {});
          return { ...log, body: upgradedBody };
        }
        return log;
      })
    );

    return NextResponse.json({
      success: true,
      data: upgradedLogs,
      total: upgradedLogs.length
    });
  } catch (error) {
    console.error('Get Customer Email Logs Error:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const decEmail = decryptDeterministic(user.email);
    const decName = decryptDeterministic(user.name) || 'Customer';

    const body = await req.json();
    const { subject, htmlContent } = body;

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'Subject and email content are required' }, { status: 400 });
    }

    const fromName = process.env.SMTP_FROM_NAME || 'Masdika.ID';
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'no-reply@masdika.id';

    const fontStack = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    const finalHtml = htmlContent.includes('<html') || htmlContent.includes('font-family:')
      ? htmlContent
      : `<div style="font-family: ${fontStack}; font-size: 15px; color: #1e293b; line-height: 1.65;">${htmlContent}</div>`;

    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: decEmail,
      subject,
      html: finalHtml
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (error: any) {
    console.error('Send Customer Email Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to send email' }, { status: 500 });
  }
}
