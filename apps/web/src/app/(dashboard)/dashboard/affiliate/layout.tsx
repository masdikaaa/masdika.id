import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affiliate Program',
  description: 'Share your referral link and earn commissions for every new user you invite.',
  openGraph: {
    title: 'Affiliate Program',
    description: 'Share your referral link and earn commissions for every new user you invite.',
    url: 'https://masdika.com/dashboard/affiliate',
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
