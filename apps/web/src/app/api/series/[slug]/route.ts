import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedSeriesDetails = unstable_cache(
  async (slug: string) => {
    const series = await prisma.series.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        image: true,
        level: true,
        tags: true,
        published: true,
        createdAt: true,
        episodes: {
          where: { published: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            image: true,
            videoUrl: true,
            order: true,
            published: true,
            createdAt: true,
          },
        },
      },
    });

    if (!series || !series.published) {
      return null;
    }

    const settings = await prisma.setting.findMany({
      where: { key: 'profileImage' }
    });
    const profileImageSetting = settings.find(s => s.key === 'profileImage');

    const adminUser = await prisma.user.findFirst();
    let adminName = 'Admin';
    if (adminUser && adminUser.name) {
      try {
        adminName = decryptDeterministic(adminUser.name);
      } catch (e) {
        // Fallback
        adminName = adminUser.name;
      }
    }

    return {
      ...series,
      adminName,
      adminImage: profileImageSetting?.value || null
    };
  },
  ['series-details'],
  { revalidate: 60, tags: ['series'] }
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const data = await getCachedSeriesDetails(slug);

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
