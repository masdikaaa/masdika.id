import type { Metadata } from 'next';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminLayoutClient from './AdminLayoutClient';
import { decryptDeterministic } from '@/lib/encryption';

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Masdika centralized admin dashboard for managing servers, billing, users, and cloud resources.',
  openGraph: {
    title: 'Admin Panel',
    description: 'Masdika centralized admin dashboard for managing servers, billing, users, and cloud resources.',
    images: [{ url: '/og-image.webp', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Admin Panel',
    description: 'Masdika centralized admin dashboard for managing servers, billing, users, and cloud resources.',
    images: ['/og-image.webp'],
  }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();

  if (auth.error) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const profileImageSetting = await prisma.setting.findUnique({ where: { key: 'profileImage' } });

  return (
    <AdminLayoutClient 
      initialName={decryptDeterministic(user.name) || "Admin"}
      initialImage={profileImageSetting?.value || null}
    >
      {children}
    </AdminLayoutClient>
  );
}
