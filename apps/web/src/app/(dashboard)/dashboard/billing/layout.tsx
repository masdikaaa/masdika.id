
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing & Invoices',
  description: 'Manage your billing, invoices, and payment methods.',
  openGraph: {
    title: 'Billing & Invoices',
    description: 'Manage your billing, invoices, and payment methods.',
    url: 'https://masdika.com/dashboard/billing',
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
