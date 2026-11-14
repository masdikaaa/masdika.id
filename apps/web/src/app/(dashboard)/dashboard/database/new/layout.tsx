import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deploy Database - Managed Database',
  description: 'Provision a new dedicated MySQL or PostgreSQL database instance on Masdika Cloud.',
  openGraph: {
    title: 'Deploy Database - Managed Database',
    description: 'Provision a new dedicated MySQL or PostgreSQL database instance on Masdika Cloud.',
    url: 'https://masdika.com/dashboard/database/new',
  },
};

export default function NewDatabaseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
