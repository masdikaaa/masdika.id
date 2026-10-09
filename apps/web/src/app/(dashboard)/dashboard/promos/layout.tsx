import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Promo & Rewards',
  description: 'Discover our latest offers and announcements. Claim free rewards during special events before they expire!',
  openGraph: {
    title: 'Promo & Rewards',
    description: 'Discover our latest offers and announcements. Claim free rewards during special events before they expire!',
    url: 'https://masdika.com/dashboard/promos',
  }
};

export default function PromosIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
