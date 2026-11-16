import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Gateway Management',
  description: 'Manage upstream routing, profit markup, chat & image models, and customer AI balances.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
