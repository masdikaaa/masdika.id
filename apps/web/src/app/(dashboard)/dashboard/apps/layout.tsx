import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Managed Apps',
  description: 'Deploy and manage one-click cloud applications with automated SSL and persistent storage on Masdika Cloud.',
  openGraph: {
    title: 'Managed Apps',
    description: 'Deploy and manage one-click cloud applications with automated SSL and persistent storage on Masdika Cloud.',
    url: 'https://masdika.com/dashboard/apps',
  },
};

export default function AppsIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
