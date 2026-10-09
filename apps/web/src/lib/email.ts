import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'no-reply@masdika.id';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Masdika.ID';

let transporterInstance: nodemailer.Transporter | null = null;

// Create a transporter config based on .env
const getTransporter = () => {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      pool: true, // Use connection pooling to prevent overload during concurrent checkouts
      maxConnections: 5, // Maximum 5 simultaneous connections to SMTP
      maxMessages: 100, // Send up to 100 messages per connection
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_PORT === '465', 
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }
  return transporterInstance;
};

export const sendTicketCreatedEmail = async (email: string, userName: string, ticketId: string, subject: string, isAdminEmail: boolean) => {
  const decEmail = decryptDeterministic(email);
  const decName = decryptDeterministic(userName);
  
  const content = isAdminEmail ? `
    <h2 style="color: #06b6d4; margin-bottom: 20px;">New Support Ticket</h2>
    <p>A new support ticket has been opened by <strong>${decName}</strong>.</p>
    <p><strong>Ticket ID:</strong> #${ticketId}<br/>
    <strong>Subject:</strong> ${subject}</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/admin/tickets/${ticketId}" style="background-color: #06b6d4; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">View Ticket</a>
    </div>
  ` : `
    <h2 style="color: #06b6d4; margin-bottom: 20px;">Support Ticket Opened</h2>
    <p>Hello <strong>${decName}</strong>,</p>
    <p>We have received your support ticket (<strong>#${ticketId}</strong>). Our team will review it and get back to you shortly.</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/tickets/${ticketId}" style="background-color: #06b6d4; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">View Ticket</a>
    </div>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: decEmail,
    subject: `[Ticket #${ticketId}] ${subject}`,
    html: getBaseHtml(content),
  });
};

export const sendTicketReplyEmail = async (email: string, userName: string, ticketId: string, subject: string, isAdminEmail: boolean) => {
  const decEmail = decryptDeterministic(email);
  const decName = decryptDeterministic(userName);
  
  const content = isAdminEmail ? `
    <h2 style="color: #06b6d4; margin-bottom: 20px;">Customer Replied to Ticket</h2>
    <p><strong>${decName}</strong> has replied to ticket <strong>#${ticketId}</strong>.</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/admin/tickets/${ticketId}" style="background-color: #06b6d4; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">View Reply</a>
    </div>
  ` : `
    <h2 style="color: #06b6d4; margin-bottom: 20px;">New Reply to Your Ticket</h2>
    <p>Hello <strong>${decName}</strong>,</p>
    <p>Our support team has replied to your ticket (<strong>#${ticketId}</strong>).</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/tickets/${ticketId}" style="background-color: #06b6d4; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">View Reply</a>
    </div>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: decEmail,
    subject: `[Ticket #${ticketId}] New Reply: ${subject}`,
    html: getBaseHtml(content),
  });
};

export const sendBillingReminderEmail = async (email: string, userName: string, planName: string, serviceName: string, expiresAt: Date) => {
  const dateStr = expiresAt.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  const content = `
    <h2 style="color: #06b6d4; margin-bottom: 20px;">Subscription Expiring Tomorrow!</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>This is a quick reminder that your subscription for <strong>${planName} (${serviceName.replace('_', ' ')})</strong> is set to expire tomorrow on <strong>${dateStr}</strong>.</p>
    <p>To ensure uninterrupted access to your services, please log in to your dashboard and complete your renewal payment.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/billing" style="background-color: #06b6d4; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Renew Subscription Now</a>
    </div>
    <p>If you have already paid, please ignore this email. Otherwise, failure to pay will result in temporary suspension of your service.</p>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `Action Required: Your ${serviceName.replace('_', ' ')} Subscription Expires Tomorrow`,
    html: getBaseHtml(content),
  });
};

export const sendPaygSuspendedEmail = async (email: string, userName: string, planName: string, serviceName: string) => {
  const content = `
    <h2 style="color: #ef4444; margin-bottom: 20px;">Service Suspended: Insufficient Balance</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your "Pay as You Go" subscription for <strong>${planName} (${serviceName.replace('_', ' ')})</strong> has been suspended because your account balance is insufficient for the next hourly billing cycle.</p>
    <p>To reactivate your service, please top up your account balance immediately.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/billing/topup" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Top Up Balance</a>
    </div>
    <p>Once you have sufficient balance, your service will automatically resume at the next billing cycle, or you can reactivate it manually in the dashboard.</p>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `[Service Suspended] Insufficient Balance for ${planName}`,
    html: getBaseHtml(content),
  });
};

export const sendRenewalInvoiceEmail = async (email: string, userName: string, planName: string, serviceName: string, expiresAt: Date, invoiceNumber: string, amount: number) => {
  const dateStr = expiresAt.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  
  const content = `
    <h2 style="color: #06b6d4; margin-bottom: 20px;">Renewal Invoice Generated</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your subscription for <strong>${planName} (${serviceName.replace('_', ' ')})</strong> is due for renewal on <strong>${dateStr}</strong>.</p>
    <p>We have automatically generated a renewal invoice for you (<strong>#${invoiceNumber}</strong>). Please complete the payment of <strong>${formattedAmount}</strong> to avoid any interruption to your service.</p>
    <div style="background-color: #0a1f33; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #1e293b;">
      <h3 style="color: #60a5fa; margin-top: 0; margin-bottom: 15px; font-size: 16px;">Invoice Details</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="color: #e2e8f0; font-family: monospace; font-size: 14px;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;" width="180"><strong>Invoice Number:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">${invoiceNumber}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;"><strong>Due Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">${dateStr}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Amount:</strong></td><td style="padding: 8px 0; color: #34d399; font-weight: bold;">${formattedAmount}</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/billing" style="background-color: #06b6d4; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Pay Invoice Now</a>
    </div>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `Renewal Invoice #${invoiceNumber} - ${serviceName.replace('_', ' ')}`,
    html: getBaseHtml(content),
  });
};


export const sendSuspensionEmail = async (email: string, userName: string, planName: string, serviceName: string) => {
  const content = `
    <h2 style="color: #ef4444; margin-bottom: 20px;">Service Suspended</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your subscription for <strong>${planName} (${serviceName.replace('_', ' ')})</strong> has expired and your service has been automatically suspended.</p>
    <p>During suspension, your service access is disabled. To reactivate your service, you must complete your payment. Please note that a late fee of <strong>Rp 15.000</strong> will be applied upon reactivation.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/billing" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Reactivate Service</a>
    </div>
    <p>If payment is not received within 3 days, your service data will be permanently terminated.</p>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `Notice: Your ${serviceName.replace('_', ' ')} Service has been Suspended`,
    html: getBaseHtml(content),
  });
};

export const sendTerminationEmail = async (email: string, userName: string, planName: string, serviceName: string) => {
  const content = `
    <h2 style="color: #7f1d1d; margin-bottom: 20px;">Service Terminated</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>As we did not receive payment within the 3-day suspension grace period, your subscription for <strong>${planName} (${serviceName.replace('_', ' ')})</strong> has been formally terminated.</p>
    <p>Any associated service limits have been permanently revoked. If you wish to use our services again, you will need to purchase a new subscription.</p>
    <p>Thank you for having used our services.</p>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `Notice: Your ${serviceName.replace('_', ' ')} Service has been Terminated`,
    html: getBaseHtml(content),
  });
};


export const sendSuspensionWarningEmail = async (email: string, userName: string, planName: string, serviceName: string) => {
  const content = `
    <h2 style="color: #f59e0b; margin-bottom: 20px;">Notice: Upcoming Suspension</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>This is a reminder that your subscription for <strong>${planName} (${serviceName.replace('_', ' ')})</strong> will expire in <strong>1 day</strong>.</p>
    <p>Please ensure you have sufficient balance or complete your pending invoice payment to avoid service interruption and late fees.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/billing" style="background-color: #f59e0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Pay Now</a>
    </div>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `Notice: Your ${serviceName.replace('_', ' ')} will be Suspended Tomorrow`,
    html: getBaseHtml(content),
  });
};

export const sendReactivatedEmail = async (email: string, userName: string, planName: string, serviceName: string) => {
  const content = `
    <h2 style="color: #10b981; margin-bottom: 20px;">Service Reactivated! 🎉</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Great news! We have received your payment and your subscription for <strong>${planName} (${serviceName.replace('_', ' ')})</strong> has been successfully reactivated.</p>
    <p>Your server is now starting up and will be fully operational shortly.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/vps" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Dashboard</a>
    </div>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `Success: Your ${serviceName.replace('_', ' ')} has been Reactivated`,
    html: getBaseHtml(content),
  });
};

export const sendVpsProvisionedEmail = async (email: string, userName: string, hostname: string, ipAddress: string, rootPassword: string, vpsUsername: string = "root", isKubernetes: boolean = false, clusterId?: number) => {
  const content = isKubernetes ? `
    <h2 style="color: #06b6d4; margin-bottom: 20px;">Your Kubernetes Node is Ready! 🚀</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your new Kubernetes node (<strong>${hostname}</strong>) has been successfully provisioned and is now online.</p>
    <div style="background-color: #0a1f33; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #1e293b;">
      <h3 style="color: #60a5fa; margin-top: 0; margin-bottom: 15px; font-size: 16px;">Node Details</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="color: #e2e8f0; font-family: monospace; font-size: 14px;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;" width="180"><strong>Hostname:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">${hostname}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;"><strong>IP Address:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">${ipAddress}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;"><strong>Username:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">${vpsUsername}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Password:</strong></td><td style="padding: 8px 0;">${rootPassword}</td></tr>
      </table>
    </div>
    <p>Please visit your dashboard to download your kube config file for remote access.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/k3s${clusterId ? '/' + clusterId : ''}" style="background-color: #06b6d4; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Dashboard</a>
    </div>
  ` : `
    <h2 style="color: #06b6d4; margin-bottom: 20px;">Your VPS is Ready! 🚀</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your new VPS (<strong>${hostname}</strong>) has been successfully provisioned and is now online.</p>
    <div style="background-color: #0a1f33; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #1e293b;">
      <h3 style="color: #60a5fa; margin-top: 0; margin-bottom: 15px; font-size: 16px;">Server Credentials</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="color: #e2e8f0; font-family: monospace; font-size: 14px;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;" width="180"><strong>Hostname:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">${hostname}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;"><strong>IP Address:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">${ipAddress}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;"><strong>Username:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">${vpsUsername}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Password:</strong></td><td style="padding: 8px 0;">${rootPassword}</td></tr>
      </table>
    </div>
    <p>Please store these credentials securely. For security reasons, this is the only time the password will be sent to you in plain text.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/vps" style="background-color: #06b6d4; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Dashboard</a>
    </div>
  `;
  
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: isKubernetes ? `Your Kubernetes Node is Ready - ${hostname}` : `Your VPS is Ready - ${hostname}`,
    html: getBaseHtml(content),
  });
};

const getBaseHtml = (content: string, location: string = 'Surabaya, Indonesia', showUnsubscribe: boolean = false) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Email from ${FROM_NAME}</title>
  <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    /* Reset Styles */
    body { margin: 0; padding: 0; min-width: 100%; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #020617; color: #ffffff; }
    table { border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    img { border: 0; }
    a { color: #06b6d4; text-decoration: none; }
    p { margin: 0 0 15px 0; line-height: 1.6; color: #d1d5db; font-size: 16px; }
    h2, h3 { margin: 0 0 15px 0; color: #ffffff; font-weight: bold; }
    
    /* Responsive Styles */
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 !important; }
      .content-wrapper { padding: 20px !important; }
      .header img { max-width: 100% !important; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, h2, h3 { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #020617;">
  <!-- 100% wrapper table -->
  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#020617" style="background-color: #020617;">
    <tr>
      <td align="center" style="padding: 40px 15px;">
        <!--[if mso]>
        <table width="600" border="0" cellpadding="0" cellspacing="0" align="center">
          <tr>
            <td>
        <![endif]-->
        
        <!-- Max-width container table -->
        <table class="container" width="100%" max-width="600" border="0" cellpadding="0" cellspacing="0" align="center" style="max-width: 600px; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b;">
          
          <!-- Header -->
          <tr>
            <td class="header" align="center" style="padding: 0; border-bottom: none; border-top-left-radius: 16px; border-top-right-radius: 16px; overflow: hidden; background-color: #0f172a;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/logo-email.png?v=2" alt="Header Banner" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border-top-left-radius: 16px; border-top-right-radius: 16px;" loading="lazy" decoding="async" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content-wrapper" style="padding: 40px 40px 20px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; border-top: 1px solid #1e293b; background-color: #020617; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280;">&copy; ${new Date().getFullYear()} ${FROM_NAME}. All Rights Reserved.</p>
              <p style="margin: 0 0 15px 0; font-size: 13px; color: #6b7280;">${location}</p>
              ${showUnsubscribe ? `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/unsubscribe" style="font-size: 13px; color: #6b7280; text-decoration: underline;">Unsubscribe from Newsletter</a>` : ''}
            </td>
          </tr>
          
        </table>
        
        <!--[if mso]>
            </td>
          </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Helper for bulletproof buttons
const getButtonHtml = (text: string, url: string) => `
<table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 25px auto;">
  <tr>
    <td align="center" bgcolor="#06b6d4" style="border-radius: 50px;">
      <a href="${url}" target="_blank" style="font-size: 16px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 14px 32px; border: 1px solid #06b6d4; display: inline-block; border-radius: 50px; font-weight: bold; background-color: #06b6d4;">${text}</a>
    </td>
  </tr>
</table>
`;

async function getLocationSetting() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'contact_location' } });
    return setting?.value || 'Surabaya, Indonesia';
  } catch (error) {
    return 'Surabaya, Indonesia';
  }
}

export async function sendNewsletterEmail(emails: string[], postTitle: string, postSlug: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Newsletter email not sent.");
      return;
  }
  
  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const postUrl = `${baseUrl}/blog/${postSlug}`;
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">New Article Published!</h2>
    <p>Hi there,</p>
    <p>I just published a new article on my blog that you might find interesting:</p>
    
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="background-color: #020617; padding: 20px; border-radius: 8px; border: 1px solid #1e293b;">
          <h3 style="margin: 0; color: #ffffff; font-size: 18px;">${postTitle}</h3>
        </td>
      </tr>
    </table>
    
    <p>Click the button below to read the full article.</p>
    
    ${getButtonHtml("Read Article", postUrl)}
    
    <p style="margin-top: 30px; font-size: 14px;">Thanks for subscribing to my updates!</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    bcc: emails, // Use BCC for bulk to protect privacy
    subject: `New Post: ${postTitle}`,
    html: getBaseHtml(content, location, true),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending newsletter email:", error);
  }
}

export async function sendCommentReplyEmail(toEmail: string, userName: string, replierName: string, postTitle: string, postSlug: string, replyContent: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Reply email not sent.");
      return;
  }

  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const postUrl = `${baseUrl}/blog/${postSlug}`;
  const location = await getLocationSetting();

  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">New Reply to Your Comment</h2>
    <p>Hi ${userName},</p>
    <p><strong>${replierName}</strong> just replied to your comment on the article <strong>"${postTitle}"</strong>:</p>
    
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="background-color: #020617; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4;">
          <p style="margin: 0; font-style: italic; color: #a1a1aa;">"${replyContent}"</p>
        </td>
      </tr>
    </table>
    
    <p>Click the button below to view the conversation.</p>
    
    ${getButtonHtml("View Comment", postUrl)}
  `;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `${replierName} Replied to Your Comment`,
    html: getBaseHtml(content, location),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending reply email:", error);
  }
}

export async function sendForgotPasswordEmail(toEmail: string, resetLink: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Forgot password email not sent.");
      return;
  }

  const transporter = getTransporter();
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Password Reset Request</h2>
    <p>We received a request to reset your password for your ${FROM_NAME} Admin account.</p>
    <p>Click the button below to set a new password. This link will expire in 1 hour.</p>
    
    ${getButtonHtml("Reset Password", resetLink)}
    
    <p style="margin-top: 35px; font-size: 14px; color: #9ca3af;">If you didn't request this, you can safely ignore this email.</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Security" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Reset Your Password`,
    html: getBaseHtml(content, location),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending forgot password email:", error);
  }
}

export async function sendCommentVerificationEmail(toEmail: string, verificationLink: string, postTitle: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Verification email not sent.");
      return;
  }

  const transporter = getTransporter();
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Verify Your Comment</h2>
    <p>Thank you for leaving a comment on <strong>"${postTitle}"</strong>.</p>
    <p>To prevent spam, we require you to verify your email address before your comment is published.</p>
    
    ${getButtonHtml("Verify Comment", verificationLink)}
    
    <p style="margin-top: 35px; font-size: 14px; color: #9ca3af;">If you didn't leave this comment, you can safely ignore this email.</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Security" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Verify Your Comment on ${FROM_NAME}`,
    html: getBaseHtml(content, location),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
}

export async function sendNewsletterWelcomeEmail(toEmail: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Welcome email not sent.");
      return;
  }

  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Welcome to the Newsletter!</h2>
    <p>Hi there,</p>
    <p>Thank you for subscribing to my newsletter. I'm excited to share my latest thoughts, tutorials, and insights on Cloud Infrastructure, DevOps, and Linux with you!</p>
    
    ${getButtonHtml("Read Latest Articles", `${baseUrl}/blog`)}
    
    <p style="margin-top: 35px; font-size: 14px; color: #9ca3af;">Stay tuned for the next update!</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Welcome to ${FROM_NAME} Newsletter!`,
    html: getBaseHtml(content, location, true),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
}

export async function sendAdminCommunityNotificationEmail(groupName: string, groupLink: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Admin community notification email not sent.");
      return;
  }

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser || !adminUser.email) return;

  const adminEmail = decryptDeterministic(adminUser.email);
  const adminName = adminUser.name ? decryptDeterministic(adminUser.name) : 'Admin';

  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const communityUrl = `${baseUrl}/admin/community`;
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">New Community Group Submitted</h2>
    <p>Hi ${adminName},</p>
    <p>A new WhatsApp group link has been submitted and is waiting for your review.</p>
    
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="background-color: #020617; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4;">
          <h3 style="margin: 0; color: #ffffff; font-size: 16px;">${groupName}</h3>
          <p style="margin: 5px 0 0 0; color: #a1a1aa; font-size: 14px;">${groupLink}</p>
        </td>
      </tr>
    </table>
    
    <p>Please review and publish the group from your admin panel.</p>
    
    ${getButtonHtml("Review Group", communityUrl)}
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Notifications" <${FROM_EMAIL}>`,
    to: adminEmail,
    subject: `New Community Group: ${groupName}`,
    html: getBaseHtml(content, location),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending admin community notification email:", error);
  }
}

type ChatTranscriptMessage = {
  role: 'user' | 'model';
  content: string;
  createdAt: Date;
  isAdmin?: boolean;
};

export async function sendChatTranscriptEmail(
  toEmail: string,
  userName: string,
  messages: ChatTranscriptMessage[],
  sessionDate: Date
) {
  if (!process.env.SMTP_HOST) {
    console.warn("SMTP_HOST is not set. Chat transcript email not sent.");
    return;
  }

  const transporter = getTransporter();
  const location = await getLocationSetting();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';

  // Format session date
  const dateFormatted = sessionDate.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = sessionDate.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

  // Calculate duration
  const lastMessageTime = messages.length > 0 ? messages[messages.length - 1].createdAt : sessionDate;
  const durationMs = new Date(lastMessageTime).getTime() - new Date(sessionDate).getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  const durationStr = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)} hours ${durationMinutes % 60} mins`
    : `${durationMinutes} mins`;

  // Build chat messages HTML
  const messagesHtml = messages.map(msg => {
    // Escape HTML in content
    const escapedContent = msg.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const msgTime = new Date(msg.createdAt).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (msg.role === 'user') {
      return `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
          <tr>
            <td width="20%" style="vertical-align: top;">&nbsp;</td>
            <td width="80%" style="text-align: right;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin-left: auto;">
                <tr>
                  <td style="background-color: #2563eb; padding: 12px 16px; border-radius: 16px 16px 4px 16px; max-width: 350px;">
                    <p style="margin: 0; color: #ffffff; font-size: 14px; line-height: 1.5; text-align: left;">${escapedContent}</p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: right; padding-top: 4px;">
                    <p style="margin: 0; font-size: 11px; color: #6b7280;">${msgTime}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    } else {
      return `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
          <tr>
            <td width="80%" style="vertical-align: top;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #0f172a; padding: 12px 16px; border-radius: 16px 16px 16px 4px; border: 1px solid #1e293b; max-width: 350px;">
                    <p style="margin: 0 0 2px 0; font-size: 11px; color: #06b6d4; font-weight: bold;">
                      ${msg.isAdmin ? 'MASDIKA SUPPORT' : 'AI Assistant'}
                    </p>
                    <p style="margin: 0; color: #d1d5db; font-size: 14px; line-height: 1.5;">${escapedContent}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 4px;">
                    <p style="margin: 0; font-size: 11px; color: #6b7280;">${msgTime}</p>
                  </td>
                </tr>
              </table>
            </td>
            <td width="20%">&nbsp;</td>
          </tr>
        </table>
      `;
    }
  }).join('');

  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Your Chat Transcript</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for using our AI Assistant. Here is the full transcript of your conversation:</p>
    
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="background-color: #020617; padding: 16px; border-radius: 8px; border: 1px solid #1e293b;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom: 8px;">
                <p style="margin: 0; font-size: 13px; color: #9ca3af;">📅 <strong style="color: #d1d5db;">${dateFormatted}</strong>, ${timeFormatted}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px;">
                <p style="margin: 0; font-size: 13px; color: #9ca3af;">💬 <strong style="color: #d1d5db;">${messages.length} messages</strong> &nbsp;|&nbsp; ⏱️ <strong style="color: #d1d5db;">${durationStr}</strong></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #020617; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;">
          ${messagesHtml}
        </td>
      </tr>
    </table>

    <p style="margin-top: 30px; font-size: 14px;">If you have any further questions, please don't hesitate to contact us!</p>
    
    ${getButtonHtml("Visit Website", baseUrl)}
  `;

  const mailOptions = {
    from: `"${FROM_NAME} AI Assistant" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `AI Assistant Chat Transcript - ${dateFormatted}`,
    html: getBaseHtml(content, location),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending chat transcript email:", error);
  }
}

export async function sendContactVerificationEmail(toEmail: string, userName: string, otp: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Contact verification email not sent.");
      return;
  }

  const transporter = getTransporter();
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Verify Your Contact Request</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for reaching out. To ensure you're a real human and to finalize your message, please verify your email address by entering the 6-digit code below into the contact form:</p>
    
    <div style="background-color: #020617; padding: 20px; border-radius: 8px; border: 1px solid #1e293b; text-align: center; margin: 30px 0;">
      <h1 style="color: #06b6d4; font-size: 40px; letter-spacing: 8px; margin: 0;">${otp}</h1>
    </div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #9ca3af;">This code will expire in 10 minutes.</p>
    <p style="font-size: 14px; color: #9ca3af;">If you didn't send this message, you can safely ignore this email.</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Security" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Verification Code: ${otp}`,
    html: getBaseHtml(content, location),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending contact verification email:", error);
  }
}

export async function sendChatVerificationEmail(toEmail: string, userName: string, otp: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Chat verification email not sent.");
      return;
  }

  const transporter = getTransporter();
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Verify Your Email Address</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for initiating a chat with the AI Assistant. To continue, please verify your email address by entering the 6-digit code below into the chat widget:</p>
    
    <div style="background-color: #020617; padding: 20px; border-radius: 8px; border: 1px solid #1e293b; text-align: center; margin: 30px 0;">
      <h1 style="color: #06b6d4; font-size: 40px; letter-spacing: 8px; margin: 0;">${otp}</h1>
    </div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #9ca3af;">This code will expire in 10 minutes.</p>
    <p style="font-size: 14px; color: #9ca3af;">If you didn't request this, you can safely ignore this email.</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Security" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Your Chat Verification Code: ${otp}`,
    html: getBaseHtml(content, location),
    priority: 'high' as const,
    headers: { 'X-Priority': '1 (Highest)' }
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending chat verification email:", error);
  }
}

export async function sendAdminNotificationEmail(title: string, message: string, detailLink: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Admin notification email not sent.");
      return;
  }

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser || !adminUser.email) return;

  const adminEmail = decryptDeterministic(adminUser.email);
  const adminName = adminUser.name ? decryptDeterministic(adminUser.name) : 'Admin';

  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">New Admin Notification</h2>
    <p>Hi ${adminName},</p>
    <p><strong>${title}</strong></p>
    <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="white-space: pre-wrap; margin: 0; color: #e2e8f0;">${message}</p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <a href="${baseUrl}${detailLink}" style="background-color: #06b6d4; color: #020617; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Details</a>
    </div>
  `;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: adminEmail,
    subject: `Admin Notification: ${title}`,
    html: getBaseHtml(content, location),
  });
}

export async function sendPasswordChangeOtpEmail(toEmail: string, userName: string, otp: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Password change OTP email not sent.");
      return;
  }

  const transporter = getTransporter();
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Password Change Request</h2>
    <p>Hi ${userName},</p>
    <p>We received a request to change the password for your ${FROM_NAME} account.</p>
    <p>To authorize this change, please enter the following 6-digit verification code:</p>
    
    <div style="background-color: #020617; padding: 20px; border-radius: 8px; border: 1px solid #1e293b; text-align: center; margin: 30px 0;">
      <h1 style="color: #06b6d4; font-size: 40px; letter-spacing: 8px; margin: 0;">${otp}</h1>
    </div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #9ca3af;">This code will expire in 10 minutes.</p>
    <p style="font-size: 14px; color: #9ca3af;">If you didn't request a password change, please ignore this email and consider securing your account.</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Security" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Your Password Change Verification Code: ${otp}`,
    html: getBaseHtml(content, location),
    priority: 'high' as const,
    headers: { 'X-Priority': '1 (Highest)' }
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending password change OTP email:", error);
  }
}

export async function sendRegistrationOtpEmail(toEmail: string, userName: string, otp: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Registration OTP email not sent.");
      return;
  }

  const transporter = getTransporter();
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Welcome to ${FROM_NAME}!</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for registering. To complete your account creation, please verify your email address by entering the following 6-digit verification code:</p>
    
    <div style="background-color: #020617; padding: 20px; border-radius: 8px; border: 1px solid #1e293b; text-align: center; margin: 30px 0;">
      <h1 style="color: #06b6d4; font-size: 40px; letter-spacing: 8px; margin: 0;">${otp}</h1>
    </div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #9ca3af;">This code will expire in 10 minutes.</p>
    <p style="font-size: 14px; color: #9ca3af;">If you didn't request this, please ignore this email.</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Security" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Your Registration Verification Code: ${otp}`,
    html: getBaseHtml(content, location),
    priority: 'high' as const,
    headers: { 'X-Priority': '1 (Highest)' }
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending registration OTP email:", error);
  }
}

export async function sendEmailChangeOtpEmail(toEmail: string, userName: string, otp: string, newEmail: string) {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Email change OTP email not sent.");
      return;
  }

  const transporter = getTransporter();
  const location = await getLocationSetting();
  
  const content = `
    <h2 style="color: #ffffff; margin-top: 0; font-size: 24px;">Email Change Request</h2>
    <p>Hi ${userName},</p>
    <p>We received a request to change the email address for your ${FROM_NAME} account to <strong>${newEmail}</strong>.</p>
    <p>To authorize this change, please enter the following 6-digit verification code:</p>
    
    <div style="background-color: #020617; padding: 20px; border-radius: 8px; border: 1px solid #1e293b; text-align: center; margin: 30px 0;">
      <h1 style="color: #06b6d4; font-size: 40px; letter-spacing: 8px; margin: 0;">${otp}</h1>
    </div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #9ca3af;">This code will expire in 10 minutes.</p>
    <p style="font-size: 14px; color: #9ca3af;">If you didn't request an email change, please ignore this email and consider securing your account.</p>
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Security" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Your Email Change Verification Code: ${otp}`,
    html: getBaseHtml(content, location),
    priority: 'high' as const,
    headers: { 'X-Priority': '1 (Highest)' }
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email change OTP email:", error);
  }
}

// ─── ORDER / BILLING NOTIFICATION EMAILS ──────────────────────────────────────

/**
 * Notify admin when a new order (checkout or top-up) comes in.
 */
export async function sendAdminNewOrderEmail(orderDetails: {
  customerName: string;
  customerEmail: string;
  type: 'SUBSCRIPTION' | 'TOP_UP';
  planName?: string;
  serviceName?: string;
  amount: number;
  paymentMethod: string;
  invoiceNumber: string;
}) {
  if (!process.env.SMTP_HOST) return;

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser || !adminUser.email) return;

  const adminEmail = decryptDeterministic(adminUser.email);
  const adminName = adminUser.name ? decryptDeterministic(adminUser.name) : 'Admin';

  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const location = await getLocationSetting();
  const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(orderDetails.amount);

  const isTopUp = orderDetails.type === 'TOP_UP';
  const title = isTopUp ? '💰 New Top Up Order' : '🛒 New Subscription Order';
  const desc = isTopUp
    ? `<strong>${orderDetails.customerName}</strong> has submitted a balance top-up of <strong>${amountStr}</strong>.`
    : `<strong>${orderDetails.customerName}</strong> has ordered <strong>${orderDetails.planName} (${orderDetails.serviceName?.replace('_', ' ')})</strong> for <strong>${amountStr}</strong>.`;

  const content = `
    <h2 style="color: #06b6d4; margin-top: 0; font-size: 24px;">${title}</h2>
    <p>Hi ${adminName},</p>
    <p>${desc}</p>
    
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="background-color: #020617; padding: 20px; border-radius: 8px; border: 1px solid #1e293b;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px;">Invoice</td><td style="padding: 6px 0; color: #ffffff; font-size: 14px; font-weight: bold; text-align: right;">${orderDetails.invoiceNumber}</td></tr>
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px;">Customer</td><td style="padding: 6px 0; color: #ffffff; font-size: 14px; text-align: right;">${orderDetails.customerName}</td></tr>
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px;">Email</td><td style="padding: 6px 0; color: #06b6d4; font-size: 14px; text-align: right;">${orderDetails.customerEmail}</td></tr>
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px;">Payment Method</td><td style="padding: 6px 0; color: #ffffff; font-size: 14px; text-align: right;">${orderDetails.paymentMethod}</td></tr>
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px; border-top: 1px solid #1e293b;">Amount</td><td style="padding: 6px 0; color: #10b981; font-size: 18px; font-weight: bold; text-align: right; border-top: 1px solid #1e293b;">${amountStr}</td></tr>
          </table>
        </td>
      </tr>
    </table>
    
    ${getButtonHtml("View in Admin Panel", `${baseUrl}/admin/invoices`)}
  `;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME} Notifications" <${FROM_EMAIL}>`,
      to: adminEmail,
      subject: `${isTopUp ? 'New Top Up' : 'New Order'}: ${orderDetails.customerName} - ${amountStr}`,
      html: getBaseHtml(content, location),
    });
  } catch (error) {
    console.error("Error sending admin new order email:", error);
  }
}

/**
 * Send invoice/billing email to customer when an invoice is created.
 */
export async function sendCustomerInvoiceEmail(details: {
  toEmail: string;
  customerName: string;
  type: 'SUBSCRIPTION' | 'TOP_UP';
  planName?: string;
  serviceName?: string;
  amount: number;
  paymentMethod: string;
  invoiceNumber: string;
  paymentUrl?: string | null;
}) {
  if (!process.env.SMTP_HOST) return;

  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const location = await getLocationSetting();
  const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(details.amount);

  const isTopUp = details.type === 'TOP_UP';
  const title = isTopUp ? 'Balance Top Up Invoice' : 'Subscription Invoice';
  const productDesc = isTopUp ? 'Account Balance Top Up' : `${details.planName} (${details.serviceName?.replace('_', ' ')})`;

  const content = `
    <h2 style="color: #06b6d4; margin-top: 0; font-size: 24px;">📋 ${title}</h2>
    <p>Hello <strong>${details.customerName}</strong>,</p>
    <p>Thank you for your order. Here are the details of your invoice:</p>
    
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="background-color: #020617; padding: 20px; border-radius: 8px; border: 1px solid #1e293b;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px;">Invoice Number</td><td style="padding: 6px 0; color: #ffffff; font-size: 14px; font-weight: bold; text-align: right;">${details.invoiceNumber}</td></tr>
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px;">Product</td><td style="padding: 6px 0; color: #ffffff; font-size: 14px; text-align: right;">${productDesc}</td></tr>
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px;">Payment Method</td><td style="padding: 6px 0; color: #ffffff; font-size: 14px; text-align: right;">${details.paymentMethod}</td></tr>
            <tr><td style="padding: 6px 0; color: #9ca3af; font-size: 14px; border-top: 1px solid #1e293b;">Total Amount</td><td style="padding: 6px 0; color: #f59e0b; font-size: 18px; font-weight: bold; text-align: right; border-top: 1px solid #1e293b;">${amountStr}</td></tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p>Please complete your payment as soon as possible to activate your service.</p>
    
    ${details.paymentUrl ? getButtonHtml("Complete Payment", details.paymentUrl) : getButtonHtml("View Billing", `${baseUrl}/dashboard/billing`)}
    
    <p style="margin-top: 30px; font-size: 14px; color: #9ca3af;">If you did not make this order, please contact our support team immediately.</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME} Billing" <${FROM_EMAIL}>`,
      to: details.toEmail,
      subject: `Invoice ${details.invoiceNumber} - ${amountStr}`,
      html: getBaseHtml(content, location),
    });
  } catch (error) {
    console.error("Error sending customer invoice email:", error);
  }
}

/**
 * Send payment success confirmation with service usage guide.
 */
export async function sendCustomerPaymentSuccessEmail(details: {
  toEmail: string;
  customerName: string;
  type: 'SUBSCRIPTION' | 'TOP_UP';
  planName?: string;
  serviceName?: string;
  amount: number;
  invoiceNumber: string;
  expiresAt?: Date;
}) {
  if (!process.env.SMTP_HOST) return;

  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  const location = await getLocationSetting();
  const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(details.amount);

  const isTopUp = details.type === 'TOP_UP';

  let serviceGuide = '';
  if (!isTopUp && details.serviceName) {
    const expiryStr = details.expiresAt
      ? details.expiresAt.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';

    serviceGuide = `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="background-color: #020617; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 8px 0; color: #10b981; font-size: 16px;">✅ Service Activated</h3>
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr><td style="padding: 4px 0; color: #9ca3af; font-size: 13px;">Plan</td><td style="padding: 4px 0; color: #ffffff; font-size: 13px; text-align: right;">${details.planName}</td></tr>
            <tr><td style="padding: 4px 0; color: #9ca3af; font-size: 13px;">Service</td><td style="padding: 4px 0; color: #06b6d4; font-size: 13px; text-align: right;">${details.serviceName?.replace('_', ' ')}</td></tr>
            <tr><td style="padding: 4px 0; color: #9ca3af; font-size: 13px;">Expires</td><td style="padding: 4px 0; color: #f59e0b; font-size: 13px; text-align: right;">${expiryStr}</td></tr>
          </table>
        </td>
      </tr>
    </table>
    ${getServiceUsageGuide(details.serviceName, baseUrl)}
    `;
  }

  const content = `
    <h2 style="color: #10b981; margin-top: 0; font-size: 24px;">✅ Payment Successful!</h2>
    <p>Hello <strong>${details.customerName}</strong>,</p>
    <p>We have successfully received your payment of <strong style="color: #10b981;">${amountStr}</strong> for invoice <strong>${details.invoiceNumber}</strong>.</p>
    ${isTopUp ? '<p>Your account balance has been credited accordingly.</p>' : ''}
    ${serviceGuide}
    ${getButtonHtml("Go to Dashboard", `${baseUrl}/dashboard/billing`)}
    <p style="margin-top: 30px; font-size: 14px; color: #9ca3af;">Thank you for using our services!</p>
  `;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: details.toEmail,
      subject: `Payment Confirmed - ${details.invoiceNumber}`,
      html: getBaseHtml(content, location),
    });
  } catch (error) {
    console.error("Error sending customer payment success email:", error);
  }
}

/**
 * Generate service-specific usage guide HTML.
 */
function getServiceUsageGuide(serviceName: string, baseUrl: string): string {
  const guides: Record<string, string> = {

    'SHORTENER': `
      <h3 style="color: #10b981; margin: 20px 0 10px 0; font-size: 16px;">🔗 Getting Started with URL Shortener</h3>
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
        <tr><td style="background-color: #020617; padding: 16px; border-radius: 8px; border: 1px solid #1e293b;">
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 1: Create Short Links</p>
          <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 13px;">Go to <a href="${baseUrl}/dashboard/shortener" style="color: #06b6d4;">Dashboard → URL Shortener</a> and paste your long URL. A random short alias will be generated automatically.</p>
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 2: Share Your Link</p>
          <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 13px;">Copy the shortened URL and share it anywhere - social media, emails, QR codes, etc.</p>
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 3: Track Analytics</p>
          <p style="margin: 0; color: #9ca3af; font-size: 13px;">View click statistics and analytics for each link directly from your dashboard.</p>
        </td></tr>
      </table>`,
    'API_HUB': `
      <h3 style="color: #a855f7; margin: 20px 0 10px 0; font-size: 16px;">⚡ Getting Started with API Hub</h3>
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
        <tr><td style="background-color: #020617; padding: 16px; border-radius: 8px; border: 1px solid #1e293b;">
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 1: Generate API Key</p>
          <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 13px;">Go to <a href="${baseUrl}/dashboard/api-keys" style="color: #06b6d4;">Dashboard → API Keys</a> and click <strong style="color: #ffffff;">"Generate New Key"</strong>.</p>
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 2: Use the API</p>
          <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 13px;">Include your API key in requests: <code style="background: #1e293b; color: #06b6d4; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Authorization: Bearer YOUR_API_KEY</code></p>
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 3: Explore Endpoints</p>
          <p style="margin: 0; color: #9ca3af; font-size: 13px;">Check the <a href="${baseUrl}/api-hub" style="color: #06b6d4;">API Hub page</a> for all available endpoints and documentation.</p>
        </td></tr>
      </table>`,
    'CDN': `
      <h3 style="color: #f59e0b; margin: 20px 0 10px 0; font-size: 16px;">🌐 Getting Started with CDN</h3>
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
        <tr><td style="background-color: #020617; padding: 16px; border-radius: 8px; border: 1px solid #1e293b;">
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 1: Upload Files</p>
          <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 13px;">Go to <a href="${baseUrl}/dashboard/cdn" style="color: #06b6d4;">Dashboard → CDN Files</a> and upload your files using drag & drop or the upload button.</p>
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 2: Copy CDN URL</p>
          <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 13px;">Each uploaded file gets a unique CDN URL. Copy it and use it in your applications, websites, or content.</p>
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">Step 3: API Upload</p>
          <p style="margin: 0; color: #9ca3af; font-size: 13px;">You can also upload via API: <code style="background: #1e293b; color: #06b6d4; padding: 2px 6px; border-radius: 4px; font-size: 12px;">POST /api/user/cdn/upload</code> with your API key.</p>
        </td></tr>
      </table>`,
  };

  return guides[serviceName] || '';
}

export const sendAdminServiceSuspendedEmail = async (customerName: string, customerEmail: string, serviceName: string, serviceType: string) => {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser || !adminUser.email) return;

  const content = `
    <h2 style="color: #f59e0b; margin-bottom: 20px;">Customer Service Suspended</h2>
    <p>Admin Notification:</p>
    <p>The following service has been automatically suspended due to non-payment:</p>
    <ul>
      <li><strong>Customer:</strong> ${customerName} (${customerEmail})</li>
      <li><strong>Service Type:</strong> ${serviceType}</li>
      <li><strong>Plan:</strong> ${serviceName.replace('_', ' ')}</li>
    </ul>
  `;

  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: decryptDeterministic(adminUser.email),
    subject: `[Admin] Service Suspended: ${customerName}`,
    html: getBaseHtml(content),
  });
};

export const sendAdminServiceReactivatedEmail = async (customerName: string, customerEmail: string, serviceName: string, serviceType: string) => {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser || !adminUser.email) return;

  const content = `
    <h2 style="color: #10b981; margin-bottom: 20px;">Customer Service Reactivated</h2>
    <p>Admin Notification:</p>
    <p>The following service has been reactivated after successful payment:</p>
    <ul>
      <li><strong>Customer:</strong> ${customerName} (${customerEmail})</li>
      <li><strong>Service Type:</strong> ${serviceType}</li>
      <li><strong>Plan:</strong> ${serviceName.replace('_', ' ')}</li>
    </ul>
  `;

  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: decryptDeterministic(adminUser.email),
    subject: `[Admin] Service Reactivated: ${customerName}`,
    html: getBaseHtml(content),
  });
};

export const sendCustomServiceSuspendEmailToAdmin = async (serviceName: string, customerName: string, customerEmail: string) => {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser || !adminUser.email) return;

  const content = `
    <h2 style="color: #f59e0b; margin-bottom: 20px;">Manual Suspension Required</h2>
    <p>Admin Notification:</p>
    <p>A Custom Service has reached its due date and needs to be manually suspended:</p>
    <ul>
      <li><strong>Customer:</strong> ${customerName} (${customerEmail})</li>
      <li><strong>Service:</strong> ${serviceName}</li>
      <li><strong>Action Required:</strong> Please manually disable/suspend this service.</li>
    </ul>
  `;

  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: decryptDeterministic(adminUser.email) || adminUser.email,
    subject: `[Admin Action Required] Suspend Custom Service for ${customerName}`,
    html: getBaseHtml(content),
  });
};

export const sendCustomServiceTerminateEmailToAdmin = async (serviceName: string, customerName: string, customerEmail: string) => {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser || !adminUser.email) return;

  const content = `
    <h2 style="color: #ef4444; margin-bottom: 20px;">Manual Termination Required</h2>
    <p>Admin Notification:</p>
    <p>A Custom Service has been overdue for 3 days and needs to be manually terminated:</p>
    <ul>
      <li><strong>Customer:</strong> ${customerName} (${customerEmail})</li>
      <li><strong>Service:</strong> ${serviceName}</li>
      <li><strong>Action Required:</strong> Please manually terminate/destroy this service.</li>
    </ul>
  `;

  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: decryptDeterministic(adminUser.email) || adminUser.email,
    subject: `[Admin Action Required] Terminate Custom Service for ${customerName}`,
    html: getBaseHtml(content),
  });
};

export const sendResourceAlertEmail = async (emails: string[], hostname: string, metric: string, usage: number, threshold: number) => {
  if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST is not set. Resource Alert email not sent.");
      return;
  }
  
  const transporter = getTransporter();
  const location = await getLocationSetting();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id';
  
  let color = "#ef4444"; // Red for high usage
  let icon = "⚠️";
  
  const content = `
    <h2 style="color: ${color}; margin-top: 0; font-size: 24px;">${icon} Resource Alert: ${hostname}</h2>
    <p>This is an automated alert from your monitoring system.</p>
    <p>The <strong>${metric}</strong> usage on your instance <strong>${hostname}</strong> has crossed the alert threshold.</p>
    
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="background-color: #020617; padding: 20px; border-radius: 8px; border-left: 4px solid ${color};">
          <p style="margin: 0; color: #ffffff; font-size: 16px;"><strong>Metric:</strong> ${metric}</p>
          <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 16px;"><strong>Current Usage:</strong> ${usage.toFixed(2)}%</p>
          <p style="margin: 5px 0 0 0; color: #a1a1aa; font-size: 14px;"><strong>Threshold:</strong> ${threshold}%</p>
        </td>
      </tr>
    </table>
    
    <p>Please log in to your dashboard to review your instance performance or consider upgrading your plan if this usage is expected.</p>
    
    ${getButtonHtml("View Dashboard", baseUrl + "/dashboard/vps")}
  `;

  const mailOptions = {
    from: `"${FROM_NAME} Alerts" <${FROM_EMAIL}>`,
    bcc: emails, // Use BCC since there can be multiple subscribers
    subject: `[Alert] ${hostname} ${metric} Usage High (${usage.toFixed(0)}%)`,
    html: getBaseHtml(content, location),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending resource alert email:", error);
  }
};

export const sendVpcDeletedEmail = async (email: string, userName: string, vpcName: string, cidr: string) => {
  const decEmail = decryptDeterministic(email);
  const decName = decryptDeterministic(userName);
  const content = `
    <h2 style="color: #ef4444; margin-bottom: 20px;">VPC Network Auto-Deleted</h2>
    <p>Hi <strong>${decName}</strong>,</p>
    <p>We noticed that your VPC Network <strong>${vpcName}</strong> (${cidr}) has not been used or assigned to any VPS for the last 3 days.</p>
    <p>To ensure optimal resource availability for all users, this unused VPC network has been automatically deleted.</p>
    <p>You can always create a new VPC Network at any time when you need to deploy new services.</p>
    
    <div style="margin-top: 30px; text-align: center;">
      <a href="https://masdika.id/dashboard/vpc" style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to VPC Dashboard</a>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: decEmail,
    subject: `Notice: Unused VPC Network Deleted - ${vpcName}`,
    html: getBaseHtml(content),
  });
};

export const sendCloudflareCleanupEmail = async (email: string, userName: string, domainName: string, reason: string) => {
  const decEmail = decryptDeterministic(email);
  const decName = decryptDeterministic(userName);
  const content = `
    <h2 style="color: #f59e0b; margin-bottom: 20px;">Automated Cloudflare Cleanup</h2>
    <p>Hi <strong>${decName}</strong>,</p>
    <p>We are writing to inform you that your domain <strong>${domainName}</strong> has been automatically removed from our system.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>This automated cleanup helps keep our infrastructure clean and prevents unused domains from cluttering your dashboard.</p>
    
    <div style="margin-top: 30px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masdika.id'}/dashboard/cloudflared" style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: decEmail,
    subject: `Notice: Automated Cleanup for Domain ${domainName}`,
    html: getBaseHtml(content),
  });
};
