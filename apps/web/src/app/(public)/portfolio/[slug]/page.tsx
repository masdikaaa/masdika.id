import { prisma } from "@/lib/prisma";
import { getCachedData } from "@/lib/cache";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { PortfolioDetailContent } from "./PortfolioDetailContent";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const project = await getCachedData(`portfolio:${slug}`, 300, async () => {
      return prisma.project.findUnique({ 
        where: { slug },
        include: { category: true }
      });
    });
    
    if (!project) return { title: "Not Found" };
    
    const cleanDescription = (project.description || '').replace(/\r?\n|\r/g, ' ').trim();
    const metaDescription = cleanDescription.length > 160 ? cleanDescription.substring(0, 160) + "..." : cleanDescription;

    return {
      title: project.title,
      description: metaDescription,
      openGraph: {
        title: project.title,
        description: metaDescription,
        images: project.image ? [{ url: project.image }] : [],
      },
      twitter: {
        title: project.title,
        description: metaDescription,
        images: project.image ? [project.image] : [],
      }
    };
  } catch (error) {
    return { title: "Portfolio" };
  }
}

export default async function PortfolioDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const project = await getCachedData(`portfolio:${slug}`, 300, async () => {
    return prisma.project.findUnique({
      where: { slug },
      include: { category: true }
    });
  });

  if (!project) {
    notFound();
  }

  // Parse Key Results from "Title|Description\nTitle|Description" format
  let keyResultsParsed: Array<{ title: string, desc: string }> = [];
  if (project.keyResults) {
    keyResultsParsed = project.keyResults.split('\n').filter(Boolean).map(line => {
      const [title, desc] = line.split('|');
      return { title: title?.trim() || '', desc: desc?.trim() || '' };
    }).filter(kr => kr.title);
  }

  // Parse Tech Stack from comma separated
  let techStackParsed: string[] = [];
  if (project.techStack) {
    techStackParsed = project.techStack.split(',').map(s => s.trim()).filter(Boolean);
  }

  return (
    <PortfolioDetailContent 
      project={project} 
      keyResultsParsed={keyResultsParsed} 
      techStackParsed={techStackParsed} 
    />
  );
}
