import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';
import ObjectStorageClient from './ObjectStorageClient';
import { prisma } from '@/lib/prisma';
import { ensureObjectStoragePlansExist } from '@/lib/object-storage-plans-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: 'S3-Compatible Object Storage - Masdika',
  },
  description: 'Scalable S3-compatible object storage backed by enterprise NVMe arrays in Indonesia. Isolated buckets, IAM access keys, presigned URLs, and zero-downtime upgrades.',
  keywords: [
    'Object Storage Indonesia',
    'S3 Compatible Storage',
    'Masdika Object Storage',
    'S3 Buckets Indonesia',
    'Cloud Storage Sidoarjo',
    'Presigned URLs S3',
    'IAM Access Keys',
    'Pay As You Go Storage',
  ],
  alternates: {
    canonical: 'https://www.masdika.id/object-storage',
  },
  openGraph: {
    title: 'S3-Compatible Object Storage - Masdika',
    description: 'Scalable S3-compatible object storage backed by enterprise NVMe arrays in Indonesia. Isolated buckets, IAM access keys, presigned URLs, and zero-downtime upgrades.',
    url: 'https://www.masdika.id/object-storage',
    siteName: 'Masdika',
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: 'Masdika S3-Compatible Object Storage',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'S3-Compatible Object Storage - Masdika',
    description: 'Scalable S3-compatible object storage backed by enterprise NVMe arrays in Indonesia. Isolated buckets, IAM access keys, presigned URLs, and zero-downtime upgrades.',
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

export default async function PublicObjectStoragePage() {
  await ensureObjectStoragePlansExist();

  const [settings, rawPlans] = await Promise.all([
    prisma.setting.findMany().catch(() => []),
    prisma.plan.findMany({
      where: { service: 'OBJECT_STORAGE', isActive: true },
      orderBy: { price: 'asc' },
    }).catch(() => []),
  ]);

  const getSetting = (key: string, defaultValue: string = "true") => {
    const s = settings.find(x => x.key === key);
    return s ? s.value : defaultValue;
  };
  const isEnabled = getSetting('customer_rustfs_enabled') !== 'false';

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

  return <ObjectStorageClient isEnabled={isEnabled} initialPlans={initialPlans} />;
}
