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

  const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.masdika.id';
  const siteUrl = rawSiteUrl.replace(/^["']|["']$/g, '').trim();
  const title = 'Developer Community Groups';
  const ogImageUrl = '/images/brand/og-image.webp';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/community`,
      siteName: 'Masdika',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'Masdika Developer Community',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
