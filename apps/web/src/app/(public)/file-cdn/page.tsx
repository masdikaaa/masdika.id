import { Metadata } from 'next';
import FileCdnClient from './FileCdnClient';

export const metadata: Metadata = {
  title: 'CDN - Secure Temporary File Storage',
  description: 'Upload and share files securely up to 100MB with Masdika CDN. Fully encrypted storage with auto-expiring links for maximum privacy.',
  openGraph: {
    title: 'CDN - Secure Temporary File Storage',
    description: 'Upload and share files securely up to 100MB with Masdika CDN. Fully encrypted storage with auto-expiring links for maximum privacy.',
    url: 'https://masdika.id/file-cdn',
    siteName: 'Masdika',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Masdika CDN Secure Upload',
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

import { prisma } from '@/lib/prisma';

export default async function PublicUploadPage() {
  const settings = await prisma.setting.findMany();
  const getSetting = (key: string, defaultValue: string = "true") => {
    const s = settings.find(x => x.key === key);
    return s ? s.value : defaultValue;
  };
  const isEnabled = getSetting('cdn_enabled') !== 'false';

  return <FileCdnClient isEnabled={isEnabled} />;
}
