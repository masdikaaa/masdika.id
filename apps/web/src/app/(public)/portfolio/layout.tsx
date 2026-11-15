import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  let description = "Check out my recent projects and portfolio in cloud architecture and development.";
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_portfolio' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching portfolio meta description:", error);
  }

  const title = 'Portfolio & Projects';
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
