import type { Metadata, ResolvingMetadata } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const auth = await requireAuth();

  let hostname = "Manage VPS";
  
  try {
    if (!auth.error && auth.userId) {
      const vps = await prisma.vpsService.findFirst({
        where: { id: parseInt(id), userId: auth.userId }
      });
      if (vps) {
        hostname = vps.hostname;
      }
    }
  } catch (error) {
    console.error("Error generating metadata for VPS:", error);
  }

  const title = `${hostname} - Cloud VPS`;
  const description = `Manage your Cloud VPS instance: ${hostname}. View metrics, manage backups, and upgrade resources effortlessly on Masdika.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: '/og-image.webp', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.webp'],
    }
  };
}

export default function VpsDetailLayout({ 
  children,
  params,
}: { 
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return <>{children}</>;
}
