import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Managed Database',
  description: 'Deploy and manage high-performance MySQL and PostgreSQL database clusters on Masdika Cloud.',
  openGraph: {
    title: 'Managed Database',
    description: 'Deploy and manage high-performance MySQL and PostgreSQL database clusters on Masdika Cloud.',
    url: 'https://masdika.com/dashboard/database',
  },
};

export default function DatabaseIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
