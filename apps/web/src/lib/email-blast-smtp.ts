import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic, encryptDeterministic } from '@/lib/encryption';
import { getTransporter } from '@/lib/email';

export interface EmailBlastSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  isConfigured: boolean;
}

export async function getEmailBlastSmtpSettings(): Promise<EmailBlastSmtpConfig> {
  const keys = [
    'email_blast_smtp_host',
    'email_blast_smtp_port',
    'email_blast_smtp_secure',
    'email_blast_smtp_user',
    'email_blast_smtp_pass',
    'email_blast_from_name',
    'email_blast_from_email'
  ];

  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } }
  });

  const map = new Map<string, string>();
  for (const s of settings) {
    map.set(s.key, s.value);
  }

  const host = map.get('email_blast_smtp_host') || '';
  const portStr = map.get('email_blast_smtp_port');
  const port = portStr ? parseInt(portStr, 10) : 465;
  const secure = map.get('email_blast_smtp_secure') ? map.get('email_blast_smtp_secure') === 'true' : port === 465;
  const user = map.get('email_blast_smtp_user') || '';
  const encryptedPass = map.get('email_blast_smtp_pass') || '';
  const pass = encryptedPass ? decryptDeterministic(encryptedPass) : '';
  const fromName = map.get('email_blast_from_name') || process.env.SMTP_FROM_NAME || 'Masdika.ID';
  const fromEmail = map.get('email_blast_from_email') || 'info@masdika.id';

  const isConfigured = Boolean(host && user);

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    fromEmail,
    isConfigured
  };
}

export async function saveEmailBlastSmtpSettings(data: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  fromName: string;
  fromEmail: string;
}) {
  const upserts = [
    prisma.setting.upsert({
      where: { key: 'email_blast_smtp_host' },
      update: { value: data.host.trim() },
      create: { key: 'email_blast_smtp_host', value: data.host.trim() }
    }),
    prisma.setting.upsert({
      where: { key: 'email_blast_smtp_port' },
      update: { value: String(data.port) },
      create: { key: 'email_blast_smtp_port', value: String(data.port) }
    }),
    prisma.setting.upsert({
      where: { key: 'email_blast_smtp_secure' },
      update: { value: String(data.secure) },
      create: { key: 'email_blast_smtp_secure', value: String(data.secure) }
    }),
    prisma.setting.upsert({
      where: { key: 'email_blast_smtp_user' },
      update: { value: data.user.trim() },
      create: { key: 'email_blast_smtp_user', value: data.user.trim() }
    }),
    prisma.setting.upsert({
      where: { key: 'email_blast_from_name' },
      update: { value: data.fromName.trim() },
      create: { key: 'email_blast_from_name', value: data.fromName.trim() }
    }),
    prisma.setting.upsert({
      where: { key: 'email_blast_from_email' },
      update: { value: data.fromEmail.trim() },
      create: { key: 'email_blast_from_email', value: data.fromEmail.trim() }
    })
  ];

  if (data.pass && data.pass.trim()) {
    const encrypted = encryptDeterministic(data.pass.trim());
    upserts.push(
      prisma.setting.upsert({
        where: { key: 'email_blast_smtp_pass' },
        update: { value: encrypted },
        create: { key: 'email_blast_smtp_pass', value: encrypted }
      })
    );
  }

  await prisma.$transaction(upserts);
}

export async function createEmailBlastTransporter() {
  const config = await getEmailBlastSmtpSettings();

  if (config.isConfigured && config.host && config.user && config.pass) {
    return nodemailer.createTransport({
      pool: true,
      maxConnections: 10,
      maxMessages: Infinity,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    });
  }

  // Fallback to default system transporter
  return getTransporter();
}
