import { redirect } from 'next/navigation';

import { requireAuth } from '@/lib/auth-middleware';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'URL Shortener',
  description: 'Create, manage, and track your shortened URLs with ease.',
  openGraph: {
    title: 'URL Shortener',
    description: 'Create, manage, and track your shortened URLs with ease.',
    url: 'https://masdika.com/dashboard/shortener',
  }
};

export default async function ShortenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  
  if (auth.error) {
    redirect('/login');
  }

  return <>{children}</>;
}
