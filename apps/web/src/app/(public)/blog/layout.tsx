import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';

import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  let description = "Read the latest articles on cloud engineering, devops, and tech.";
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_blog' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching blog meta description:", error);
  }

  const title = 'Blog & Articles';
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
