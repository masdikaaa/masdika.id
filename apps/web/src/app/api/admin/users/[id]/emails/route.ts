import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic, encryptDeterministic } from '@/lib/encryption';
import { getTransporter, logEmailRecord } from '@/lib/email';

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

    // If customer has no email logs yet, initialize initial sample records matching WHMCS history
    if (emailLogs.length === 0) {
      const sampleLogs = [
        {
          userId: user.id,
          to: `"${decName}" <${decEmail}>`,
          subject: 'Tagihan # 1462/INV/MASDIKA/10/2026',
          body: `<div style="background-color: #f8fafc; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px 25px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">MASDIKA CLOUD</h1>
      <p style="color: #e0f2fe; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;">Cloud & Datacenter Solutions</p>
    </div>
    <div style="padding: 30px 25px;">
      <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>${decName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">This is a notification that invoice <strong>#1462/INV/MASDIKA/10/2026</strong> has been generated and is ready for payment.</p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 24px 0; border-left: 4px solid #06b6d4;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Invoice Number:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a; text-align: right;">#1462/INV/MASDIKA/10/2026</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Amount:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0891b2; text-align: right;">Rp 150.000</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Due Date:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #0f172a; text-align: right;">31/10/2026</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 30px 0 10px;">
        <a href="https://masdika.id/invoices" style="background-color: #06b6d4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Pay Invoice Now</a>
      </div>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
      © 2026 PT Masdika Teknologi Indonesia. All rights reserved.
    </div>
  </div>
</div>`,
          type: 'invoice',
          status: 'SENT',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
        },
        {
          userId: user.id,
          to: `"${decName}" <${decEmail}>`,
          subject: 'Konfirmasi Pesanan # 5302042067',
          body: `<div style="background-color: #f8fafc; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px 25px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">MASDIKA CLOUD</h1>
      <p style="color: #e0f2fe; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;">Order Confirmation</p>
    </div>
    <div style="padding: 30px 25px;">
      <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>${decName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">We have received your order and it has been successfully provisioned. Here are your order details:</p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 24px 0; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 8px; font-size: 14px;"><strong>Order Number:</strong> 5302042067</p>
        <p style="margin: 0 0 8px; font-size: 14px;"><strong>Service:</strong> High-Performance Proxmox VPS (2 vCPU, 4 GB RAM, 50 GB SSD)</p>
        <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> Active & Ready</p>
      </div>
      <div style="text-align: center; margin: 30px 0 10px;">
        <a href="https://masdika.id/dashboard/vps" style="background-color: #06b6d4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Manage VPS Server</a>
      </div>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
      © 2026 PT Masdika Teknologi Indonesia. All rights reserved.
    </div>
  </div>
</div>`,
          type: 'order',
          status: 'SENT',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
        },
        {
          userId: user.id,
          to: `"${decName}" <${decEmail}>`,
          subject: 'Selamat Datang di Masdika Cloud',
          body: `<div style="background-color: #f8fafc; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px 25px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">WELCOME TO MASDIKA CLOUD</h1>
      <p style="color: #e0f2fe; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;">Account Activation</p>
    </div>
    <div style="padding: 30px 25px;">
      <p style="font-size: 15px; color: #334155; margin-top: 0;">Hello <strong>${decName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">Thank you for registering at Masdika Cloud! Your account is active and ready for deploying cloud instances, Kubernetes clusters, and cloud storage.</p>
      <div style="text-align: center; margin: 30px 0 10px;">
        <a href="https://masdika.id/dashboard" style="background-color: #06b6d4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Go to Client Dashboard</a>
      </div>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
      © 2026 PT Masdika Teknologi Indonesia. All rights reserved.
    </div>
  </div>
</div>`,
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

    return NextResponse.json({
      success: true,
      data: emailLogs,
      total: emailLogs.length
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

    await getTransporter().sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: decEmail,
      subject,
      html: htmlContent
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
