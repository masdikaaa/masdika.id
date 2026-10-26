import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import ApiHubClient from './ApiHubClient';

export const metadata: Metadata = {
  title: 'API Hub - Discover Public REST APIs',
  description: 'Explore the Masdika API Hub directory. A powerful platform to browse, test, and integrate Public REST APIs for developers. Register today for free!',
  openGraph: {
    title: 'API Hub - Discover Public REST APIs',
    description: 'Explore the Masdika API Hub directory. A powerful platform to browse, test, and integrate Public REST APIs for developers. Register today for free!',
    url: 'https://masdika.id/api-hub',
    siteName: 'Masdika',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Masdika API Hub',
      },
    ],
    locale: 'en_US',
    type: 'website',
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

export default async function ApiHubPage() {
  const [projects, plans] = await Promise.all([
    prisma.apiProject.findMany({
      orderBy: { createdAt: 'desc' }
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    })
  ]);

  const apiPlans = plans.filter((p: any) => !['CDN', 'SHORTENER'].includes(p.service));

  return <ApiHubClient initialProjects={projects} initialPlans={apiPlans} />;
}
