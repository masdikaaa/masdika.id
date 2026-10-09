import { requireAuth } from '@/lib/auth-middleware';
import { redirect } from 'next/navigation';
import DashboardLayoutClient from './DashboardLayoutClient';
import BlockedScreen from './BlockedScreen';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your API keys, subscriptions, and Masdika cloud services.',
  openGraph: {
    title: 'Dashboard',
    description: 'Manage your API keys, subscriptions, and Masdika cloud services.',
    url: 'https://masdika.com/dashboard',
    siteName: 'Masdika',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Masdika Cloud Services',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dashboard',
    description: 'Manage your API keys, subscriptions, and Masdika cloud services.',
    images: ['/og-image.webp'],
  },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });

  if (auth.error && !auth.isSuspended) {
    redirect('/login');
  }

  // Fetch user data
  const user = auth.user || await prisma.user.findUnique({
    where: { id: auth.userId },
  });

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'ADMIN') {
    redirect('/admin');
  }

  // Fetch maintenance settings
  const maintenanceModeSetting = await prisma.setting.findUnique({ where: { key: 'maintenance_mode' } });
  const maintenanceMessageSetting = await prisma.setting.findUnique({ where: { key: 'maintenance_message' } });
  
  // Fetch active promos
  const promos = await prisma.promo.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  const isMaintenanceMode = maintenanceModeSetting?.value === "true";
  const maintenanceMessage = maintenanceMessageSetting?.value || "We are currently performing scheduled maintenance. Please check back soon.";

  const isSuspended = auth.isSuspended;
  const isMaintenanceBlocked = isMaintenanceMode && user.role !== 'ADMIN';
  const isBlocked = isSuspended || isMaintenanceBlocked;

  const blockTitle = isSuspended ? "Account Suspended" : "Maintenance Mode";
  const blockDesc = isSuspended 
    ? "Your access to the Masdika Customer Panel has been restricted by the administrator. All active services and API access are temporarily halted."
    : "The Masdika Customer Panel is currently undergoing scheduled maintenance. Our engineers are working hard to improve your experience.";
  const blockReasonTitle = isSuspended ? "Reason for suspension" : "Status Message";
  const blockReason = isSuspended ? auth.error : maintenanceMessage;
  
  const colors = isSuspended ? {
    glow: "bg-red-500/10", border: "border-red-500/20", shadow: "shadow-red-900/20", accent: "via-red-500",
    iconBg: "from-red-500/10 to-red-600/20 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]", iconText: "text-red-500", ping: "bg-red-500/20",
    reasonBorder: "border-red-500/10", reasonTitle: "text-red-400/80"
  } : {
    glow: "bg-amber-500/10", border: "border-amber-500/20", shadow: "shadow-amber-900/20", accent: "via-amber-500",
    iconBg: "from-amber-500/10 to-amber-600/20 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]", iconText: "text-amber-500", ping: "bg-amber-500/20",
    reasonBorder: "border-amber-500/10", reasonTitle: "text-amber-400/80"
  };

  return (
    <DashboardLayoutClient 
      userName={decryptDeterministic(user.name) || "User"} 
      userEmail={decryptDeterministic(user.email) || ""}
      userImage={user.image}
      userBalance={user.balance}
      promos={promos}
    >
      {isBlocked ? (
        <BlockedScreen
          isSuspended={isSuspended}
          blockTitle={blockTitle}
          blockDesc={blockDesc}
          blockReasonTitle={blockReasonTitle}
          blockReason={blockReason}
        />
      ) : (
        children
      )}
    </DashboardLayoutClient>
  );
}
