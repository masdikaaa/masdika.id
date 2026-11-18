import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';

import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  let description = "Explore Masdika cloud services: High-Performance VPS, Managed Databases, Managed Applications, S3 Object Storage, File CDN, and unified AI Gateway APIs.";
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_services' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching services meta description:", error);
  }

  const title = 'Cloud VPS, Managed Databases, Apps & Storage Services';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
    twitter: {
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
