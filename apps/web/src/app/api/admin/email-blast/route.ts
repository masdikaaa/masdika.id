import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import { createEmailBlastTransporter, getEmailBlastSmtpSettings } from '@/lib/email-blast-smtp';
import { getTransporter, logEmailRecord } from '@/lib/email';

const escapeHtml = (value: string) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Strip CR/LF and quotes so admin-entered sender values can't inject mail headers
const sanitizeHeader = (value: string) => String(value ?? '').replace(/[\r\n"<>]/g, '').trim();

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const {
      targetType = 'all',
      selectedUserIds = [],
      customEmails = '',
      subject,
      htmlContent,
      senderName,
      senderEmail,
      isTest = false,
      testEmail
    } = body;

    if (!subject || !htmlContent || typeof subject !== 'string' || typeof htmlContent !== 'string') {
      return NextResponse.json({ error: 'Subject and email content are required' }, { status: 400 });
    }

    const smtpConfig = await getEmailBlastSmtpSettings();
    const blastTransporter = await createEmailBlastTransporter();
    // The dedicated blast transporter is a fresh pool per request and must be closed;
    // the shared system transporter must stay open.
    const isDedicatedTransporter = blastTransporter !== getTransporter();

    const fromName = sanitizeHeader(senderName || smtpConfig.fromName || process.env.SMTP_FROM_NAME || 'Masdika.ID');
    const fromEmail = sanitizeHeader(senderEmail || smtpConfig.fromEmail || 'info@masdika.id');
    const safeSubject = String(subject).replace(/[\r\n]+/g, ' ').trim();
    const from = { name: fromName, address: fromEmail };

    // The shared system transporter already logs every email (SENT + FAILED);
    // log manually only for the dedicated blast transporter.
    const logSent = async (to: string, html: string, status: 'SENT' | 'FAILED' = 'SENT', error?: string) => {
      if (!isDedicatedTransporter) return;
      await logEmailRecord({ to, subject: safeSubject, html, type: 'blast', status, error }).catch(() => {});
    };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
    const currentYear = new Date().getFullYear().toString();

    // If it's a test email
    const ensureFontWrapper = (content: string) => {
      if (content.includes('<html') || content.includes('font-family:')) {
        return content;
      }
      return `<div style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #1e293b; line-height: 1.65;">${content}</div>`;
    };

    if (isTest) {
      const targetTestEmail = testEmail || auth.user?.email || 'admin@masdika.id';
      const cleanTestEmail = decryptDeterministic(targetTestEmail);

      const personalizedHtml = ensureFontWrapper(htmlContent
        .replace(/{name}/g, 'Admin (Test)')
        .replace(/{email}/g, escapeHtml(cleanTestEmail))
        .replace(/{app_url}/g, appUrl)
        .replace(/{year}/g, currentYear));

      try {
        await blastTransporter.sendMail({
          from,
          to: cleanTestEmail,
          subject: `[TEST] ${safeSubject}`,
          html: personalizedHtml
        });
      } finally {
        if (isDedicatedTransporter) blastTransporter.close();
      }

      return NextResponse.json({
        success: true,
        message: `Test email successfully sent to ${cleanTestEmail}`,
        sentCount: 1,
        failedCount: 0
      });
    }

    // Resolve target audience
    let recipients: { id?: number; email: string; name: string }[] = [];

    if (targetType === 'all') {
      const users = await prisma.user.findMany({
        where: { role: 'USER', isSuspended: false },
        select: { id: true, email: true, name: true }
      });
      recipients = users.map(u => ({
        id: u.id,
        email: decryptDeterministic(u.email),
        name: decryptDeterministic(u.name)
      }));
    } else if (targetType === 'vps') {
      const users = await prisma.user.findMany({
        where: {
          role: 'USER',
          isSuspended: false,
          vpsServices: { some: {} }
        },
        select: { id: true, email: true, name: true }
      });
      recipients = users.map(u => ({
        id: u.id,
        email: decryptDeterministic(u.email),
        name: decryptDeterministic(u.name)
      }));
    } else if (targetType === 'selected') {
      const ids = Array.isArray(selectedUserIds)
        ? selectedUserIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isInteger(v) && v > 0)
        : [];
      if (ids.length === 0) {
        return NextResponse.json({ error: 'No customers selected' }, { status: 400 });
      }
      const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, email: true, name: true }
      });
      recipients = users.map(u => ({
        id: u.id,
        email: decryptDeterministic(u.email),
        name: decryptDeterministic(u.name)
      }));
    } else if (targetType === 'custom') {
      const rawList = String(customEmails || '')
        .split(/[\n,;]+/)
        .map((e: string) => e.trim())
        .filter((e: string) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

      // Remove duplicates
      const uniqueEmails = Array.from(new Set(rawList)) as string[];
      recipients = uniqueEmails.map(email => ({
        email,
        name: email.split('@')[0]
      }));
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipient found for the selected target' }, { status: 400 });
    }

    let sentCount = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];

    // Send in chunks of 5
    const CHUNK_SIZE = 5;
    try {
      for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
        const chunk = recipients.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (recipient) => {
            const personalizedHtml = ensureFontWrapper(htmlContent
              .replace(/{name}/g, escapeHtml(recipient.name || 'Valued Customer'))
              .replace(/{email}/g, escapeHtml(recipient.email))
              .replace(/{app_url}/g, appUrl)
              .replace(/{year}/g, currentYear));
            try {
              await blastTransporter.sendMail({
                from,
                to: recipient.email,
                subject: safeSubject,
                html: personalizedHtml
              });

              sentCount++;
              await logSent(recipient.email, personalizedHtml);
            } catch (err: any) {
              console.error(`Failed to send blast to ${recipient.email}:`, err);
              failedCount++;
              failedEmails.push(recipient.email);
              await logSent(recipient.email, personalizedHtml, 'FAILED', err?.message);
            }
          })
        );
      }
    } finally {
      if (isDedicatedTransporter) blastTransporter.close();
    }

    return NextResponse.json({
      success: true,
      message: `Email blast completed: ${sentCount} sent, ${failedCount} failed`,
      sentCount,
      failedCount,
      failedEmails
    });
  } catch (error: any) {
    console.error('Email Blast Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process email blast' }, { status: 500 });
  }
}
