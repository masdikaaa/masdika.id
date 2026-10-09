import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedProjects = unstable_cache(
  async (category: string | null) => {
    return prisma.project.findMany({
      where: {
        status: 'COMPLETED',
        ...(category && category !== 'All' ? { category: { name: category } } : {})
      },
      select: {
        id: true,
        title: true,
        slug: true,
        image: true,
        description: true,
        techStack: true,
        projectUrl: true,
        client: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },
  ['portfolio-list'],
  { revalidate: 60, tags: ['portfolio'] }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const projects = await getCachedProjects(category);

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching public projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
