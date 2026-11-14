import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deploy Application - Managed Apps',
  description: 'Deploy a new managed cloud application instance on Masdika Cloud.',
  openGraph: {
    title: 'Deploy Application - Managed Apps',
    description: 'Deploy a new managed cloud application instance on Masdika Cloud.',
    url: 'https://masdika.com/dashboard/apps/new',
  },
};

export default function NewAppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
