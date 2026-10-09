import { Metadata } from 'next';

import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  let description = "My professional experience, education, and certifications.";
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_resume' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching resume meta description:", error);
  }

  const title = 'Resume & Experience';
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
