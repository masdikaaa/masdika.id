import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affiliate System Management',
  description: 'Manage affiliate commission withdrawal requests from users.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
