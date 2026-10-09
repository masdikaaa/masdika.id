import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reseller API',
  description: 'Integrate Masdika\'s powerful cloud infrastructure directly into your own platform. Provision, manage, and bill your own customers.',
  openGraph: {
    title: 'Reseller API',
    description: 'Integrate Masdika\'s powerful cloud infrastructure directly into your own platform. Provision, manage, and bill your own customers.',
    url: 'https://masdika.com/dashboard/reseller-api',
  }
};

export default function ResellerApiIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
