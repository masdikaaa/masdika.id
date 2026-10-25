import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getEmailBlastSmtpSettings, saveEmailBlastSmtpSettings } from '@/lib/email-blast-smtp';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const config = await getEmailBlastSmtpSettings();
    return NextResponse.json({
      success: true,
      settings: {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        hasPassword: Boolean(config.pass),
        isConfigured: config.isConfigured
      }
    });
  } catch (error: any) {
    console.error('Error fetching email blast SMTP settings:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const {
      host = '',
      port = 465,
      secure = true,
      user = '',
      pass,
      fromName = 'Masdika.ID',
      fromEmail = 'info@masdika.id'
    } = body;

    const parsedPort = parseInt(String(port), 10) || 465;
    const cleanHost = String(host).trim();
    const cleanUser = String(user).trim();
    const newPass = pass ? String(pass).trim() : '';

    // If the server/account changes and no new password is given, never reuse the old
    // password against the new server — clear it so the admin must re-enter it.
    const existing = await getEmailBlastSmtpSettings();
    const targetChanged = cleanHost.toLowerCase() !== (existing.host || '').toLowerCase() || cleanUser !== existing.user;
    const clearPassword = targetChanged && !newPass && Boolean(existing.pass);

    await saveEmailBlastSmtpSettings({
      host: cleanHost,
      port: parsedPort,
      secure: Boolean(secure),
      user: cleanUser,
      pass: newPass || undefined,
      clearPassword,
      fromName: String(fromName).trim() || 'Masdika.ID',
      fromEmail: String(fromEmail).trim() || 'info@masdika.id'
    });

    return NextResponse.json({
      success: true,
      message: 'Email Blast SMTP settings successfully saved'
    });
  } catch (error: any) {
    console.error('Error saving email blast SMTP settings:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save settings' }, { status: 500 });
  }
}
