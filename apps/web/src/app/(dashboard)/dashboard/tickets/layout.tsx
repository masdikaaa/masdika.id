
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support Tickets',
  description: 'Get help and support from the Masdika team.',
  openGraph: {
    title: 'Support Tickets',
    description: 'Get help and support from the Masdika team.',
    url: 'https://masdika.com/dashboard/tickets',
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
