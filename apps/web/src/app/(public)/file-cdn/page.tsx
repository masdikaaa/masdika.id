import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';
import FileCdnClient from './FileCdnClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: 'File CDN & Edge Asset Delivery - Masdika',
  },
  description: 'High-speed File CDN with AES-256 encrypted edge storage, instant delivery links, and REST API keys in Indonesia. Sub-15ms local IIX peering and Pay-As-You-Go billing.',
  keywords: [
    'File CDN Indonesia',
    'Edge CDN Storage',
    'Masdika File CDN',
    'CDN Asset Delivery',
    'Encrypted File Hosting',
    'REST API File Upload',
    'Cloud CDN Sidoarjo',
    'Pay As You Go CDN',
  ],
  alternates: {
    canonical: 'https://www.masdika.id/file-cdn',
  },
  openGraph: {
    title: 'File CDN & Edge Asset Delivery - Masdika',
    description: 'High-speed File CDN with AES-256 encrypted edge storage, instant delivery links, and REST API keys in Indonesia. Sub-15ms local IIX peering and Pay-As-You-Go billing.',
    url: 'https://www.masdika.id/file-cdn',
    siteName: 'Masdika',
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: 'Masdika File CDN & Edge Asset Delivery',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'File CDN & Edge Asset Delivery - Masdika',
    description: 'High-speed File CDN with AES-256 encrypted edge storage, instant delivery links, and REST API keys in Indonesia. Sub-15ms local IIX peering and Pay-As-You-Go billing.',
    images: [OG_IMAGE_PATH],
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

export default async function PublicUploadPage() {
  const [settings, rawPlans] = await Promise.all([
    prisma.setting.findMany().catch(() => []),
    prisma.plan.findMany({
      where: { service: 'CDN', isActive: true },
      orderBy: { price: 'asc' },
    }).catch(() => []),
  ]);

  const getSetting = (key: string, defaultValue: string = "true") => {
    const s = settings.find(x => x.key === key);
    return s ? s.value : defaultValue;
  };
  const isEnabled = getSetting('cdn_enabled') !== 'false';

  // Safe serialize plans for client component
  const initialPlans = rawPlans.map(p => ({
    id: p.id,
    name: p.name,
    service: p.service,
    description: p.description,
    price: p.price,
    hourlyPrice: p.hourlyPrice,
    limits: p.limits,
    isPopular: p.isPopular,
    isActive: p.isActive,
  }));

  return <FileCdnClient isEnabled={isEnabled} initialPlans={initialPlans} />;
}

