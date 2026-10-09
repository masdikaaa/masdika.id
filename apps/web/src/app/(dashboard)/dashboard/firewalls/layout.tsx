import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cloud Firewalls',
  description: 'Manage inbound and outbound traffic rules across your VPS instances securely from one place.',
  openGraph: {
    title: 'Cloud Firewalls',
    description: 'Manage inbound and outbound traffic rules across your VPS instances securely from one place.',
    url: 'https://masdika.com/dashboard/firewalls',
  }
};

export default function FirewallsIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
