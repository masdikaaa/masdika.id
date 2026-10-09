
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order and payment for Masdika services.',
  openGraph: {
    title: 'Checkout',
    description: 'Complete your order and payment for Masdika services.',
    url: 'https://masdika.com/dashboard/checkout',
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
