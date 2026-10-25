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

    const decEmail = (decryptDeterministic(user.email) || '').trim();

    // Match by userId, or by the exact recipient address (plain or "Name <email>" format).
    // A fuzzy `contains` would leak other customers' emails (e.g. "di@x.com" ⊂ "andi@x.com").
    const recipientFilters: any[] = [{ userId: user.id }];
    if (decEmail) {
      recipientFilters.push(
        { to: { equals: decEmail, mode: 'insensitive' } },
        { to: { contains: `<${decEmail}>`, mode: 'insensitive' } }
      );
    }

    const emailLogs = await prisma.emailLog.findMany({
      where: { OR: recipientFilters },
      orderBy: { createdAt: 'desc' }
    });

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
