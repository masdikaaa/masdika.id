import { redirect } from 'next/navigation';
import { hasActiveSubscription } from '@/lib/subscription';
import { requireAuth } from '@/lib/auth-middleware';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Stats',
  description: 'View analytics and usage statistics for your API keys.',
  openGraph: {
    title: 'API Stats',
    description: 'View analytics and usage statistics for your API keys.',
    url: 'https://masdika.com/dashboard/api-stats',
  }
};


export default async function ApiStatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  
  if (auth.error) {
    redirect('/login');
  }

  const hasTiktok = await hasActiveSubscription(auth.userId!, 'TIKTOK');
  const hasSpotify = await hasActiveSubscription(auth.userId!, 'SPOTIFY');
  const hasCdn = await hasActiveSubscription(auth.userId!, 'CDN');
  const hasYoutube = await hasActiveSubscription(auth.userId!, 'YOUTUBE');
  const hasBlog = await hasActiveSubscription(auth.userId!, 'BLOG');
  
  if (!hasTiktok && !hasSpotify && !hasCdn && !hasYoutube && !hasBlog) {
    redirect('/dashboard/checkout?service=SPOTIFY');
  }

  return <>{children}</>;
}
