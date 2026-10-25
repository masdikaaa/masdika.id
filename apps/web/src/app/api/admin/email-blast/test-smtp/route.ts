import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { requireAuth } from '@/lib/auth-middleware';
import { getEmailBlastSmtpSettings } from '@/lib/email-blast-smtp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json().catch(() => ({}));
    const savedConfig = await getEmailBlastSmtpSettings();

    const host = String(body.host || savedConfig.host || '').trim();
    const port = parseInt(String(body.port || savedConfig.port || '465'), 10);
    const secure = body.secure !== undefined ? Boolean(body.secure) : savedConfig.secure;
    const user = String(body.user || savedConfig.user || '').trim();
    // Only reuse the stored password for the stored host+user; otherwise a new password
    // must be typed. Prevents leaking the saved credential to an arbitrary SMTP server.
    const sameTarget = host.toLowerCase() === (savedConfig.host || '').toLowerCase() && user === savedConfig.user;
    const pass = body.pass ? String(body.pass).trim() : (sameTarget ? savedConfig.pass : '');

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return NextResponse.json({ error: 'Invalid SMTP port' }, { status: 400 });
    }

    if (!host || !user) {
      return NextResponse.json({
        error: 'SMTP Host and Username are required for connection test'
      }, { status: 400 });
    }

    if (!pass) {
      return NextResponse.json({
        error: 'SMTP Password is required for connection test'
      }, { status: 400 });
    }

    const startTime = Date.now();
    const testTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    });

    // Verify SMTP connection and authentication
    await testTransporter.verify();
    const latency = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Connection successful! Verified SMTP server at ${host}:${port} (${latency}ms)`,
      latency
    });
  } catch (error: any) {
    console.error('SMTP Connection Test Error:', error);
    let errorMessage = error?.message || 'SMTP connection failed';
    if (errorMessage.includes('EAUTH')) {
      errorMessage = 'Authentication failed: Invalid username or password.';
    } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ECONNREFUSED')) {
      errorMessage = `Connection timed out or refused. Check host and port.`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
