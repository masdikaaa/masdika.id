
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Settings',
  description: 'Manage your account settings, profile, and security preferences.',
  openGraph: {
    title: 'Account Settings',
    description: 'Manage your account settings, profile, and security preferences.',
    url: 'https://masdika.com/dashboard/settings',
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
