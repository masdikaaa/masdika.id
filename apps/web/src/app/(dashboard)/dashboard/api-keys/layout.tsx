import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-middleware';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Keys',
  description: 'Manage your API keys for programmatic access to Masdika services.',
  openGraph: {
    title: 'API Keys',
    description: 'Manage your API keys for programmatic access to Masdika services.',
    url: 'https://masdika.com/dashboard/api-keys',
  }
};


export default async function ApiKeysLayout({
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
