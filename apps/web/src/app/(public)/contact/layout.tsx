import { Metadata } from 'next';

import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  let description = "Get in touch with me for collaborations, inquiries, or just to say hi.";
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_contact' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching contact meta description:", error);
  }

  const title = 'Contact';
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
