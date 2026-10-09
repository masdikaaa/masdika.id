import { Metadata } from 'next';

import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  let description = "Join our tech community and discover amazing WhatsApp and Telegram groups.";
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_community' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching community meta description:", error);
  }

  const title = 'Community Groups';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/og-image.webp'],
    },
    twitter: {
      title,
      description,
      images: ['/og-image.webp'],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
