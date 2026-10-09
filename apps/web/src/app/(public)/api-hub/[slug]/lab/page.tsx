import { Metadata } from 'next';
import ApiLabClient from './ApiLabClient';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.apiProject.findUnique({ where: { slug } });
  
  if (!project) return { title: 'API Not Found' };
  
  return {
    title: `${project.name} Lab - API Hub`,
    description: project.description,
    openGraph: {
      title: `${project.name} Lab - API Hub`,
      description: project.description,
      url: `/api-hub/${project.slug}/lab`,
      type: 'website',
      images: [
        {
          url: '/og-image.webp',
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.name} Lab - API Hub`,
      description: project.description,
      images: ['/og-image.webp'],
    }
  };
}

export default async function ApiLabPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const project = await prisma.apiProject.findUnique({ where: { slug } });

  if (!project) notFound();

  return <ApiLabClient project={project} />;
}
