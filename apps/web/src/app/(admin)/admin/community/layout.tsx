import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community | Admin Panel',
  description: 'Manage Community in the Masdika Admin Panel.',
  openGraph: {
    title: 'Masdika Admin Panel',
    description: 'Manage Community in the Masdika Admin Panel.',
    images: ['/og-admin.jpg'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
