import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedData } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const fetchProjects = (category: string | null) =>
  prisma.project.findMany({
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const cacheKey = `portfolio:list:${category || 'all'}`;

    const projects = await getCachedData(cacheKey, 300, () => fetchProjects(category));

    return NextResponse.json(projects, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching public projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
