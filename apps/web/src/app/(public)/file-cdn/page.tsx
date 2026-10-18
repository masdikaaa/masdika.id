import { Metadata } from 'next';
import FileCdnClient from './FileCdnClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edge File CDN & Secure Temporary Storage - Masdika',
  description: 'Deliver media and share files securely with Masdika Edge CDN. Sub-15ms low latency across Indonesia, encrypted storage, and auto-expiring links.',
  openGraph: {
    title: 'Edge File CDN & Secure Temporary Storage - Masdika',
    description: 'Deliver media and share files securely with Masdika Edge CDN. Sub-15ms low latency across Indonesia, encrypted storage, and auto-expiring links.',
    url: 'https://masdika.id/file-cdn',
    siteName: 'Masdika',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Masdika Edge CDN',
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

