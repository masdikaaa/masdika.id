import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tags | Admin Panel',
  description: 'Manage Tags in the Masdika Admin Panel.',
  openGraph: {
    title: 'Masdika Admin Panel',
    description: 'Manage Tags in the Masdika Admin Panel.',
    images: ['/og-admin.jpg'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
