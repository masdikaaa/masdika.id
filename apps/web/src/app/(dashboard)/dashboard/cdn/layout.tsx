
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CDN Dashboard',
  description: 'Manage your CDN zones, caching, and custom domains.',
  openGraph: {
    title: 'CDN Dashboard',
    description: 'Manage your CDN zones, caching, and custom domains.',
    url: 'https://masdika.com/dashboard/cdn',
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
