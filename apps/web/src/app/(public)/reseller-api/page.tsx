import { Metadata } from 'next';
import ResellerApiClient from './ResellerApiClient';

export const metadata: Metadata = {
  title: 'Reseller API - White-Label VPS Provisioning',
  description: 'Start your own cloud hosting company with Masdika\'s white-label Reseller API. Provision and manage high-performance Virtual Machines programmatically.',
  openGraph: {
    title: 'Reseller API - White-Label VPS Provisioning',
    description: 'Start your own cloud hosting company with Masdika\'s white-label Reseller API. Provision and manage high-performance Virtual Machines programmatically.',
    url: 'https://masdika.id/reseller-api',
    siteName: 'Masdika',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Masdika Reseller API',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function ResellerApiPage() {
  return <ResellerApiClient />;
}
