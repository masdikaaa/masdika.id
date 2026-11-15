import { OG_IMAGE_PATH } from "@/lib/og-image";
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const auth = await requireAuth();

  let dbName = 'Manage Database';

  try {
    const parsedId = parseInt(id, 10);
    if (!auth.error && auth.userId && !Number.isNaN(parsedId) && parsedId > 0) {
      const db = await prisma.databaseService.findFirst({
        where: { id: parsedId, userId: auth.userId },
        select: { name: true },
      });
      if (db?.name) {
        dbName = db.name;
      }
    }
  } catch (error) {
    console.error('Error generating metadata for Managed Database:', error);
  }

  const title = `${dbName} - Managed Database`;
  const description = `Manage your Managed Database instance: ${dbName}. View connection details, live telemetry, and scale resources on Masdika Cloud.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}

export default function DatabaseDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
