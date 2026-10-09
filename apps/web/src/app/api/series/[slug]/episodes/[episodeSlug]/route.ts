import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; episodeSlug: string }> }
) {
  try {
    const { slug, episodeSlug } = await params;

    // Single query: fetch series + all published episodes in one shot
    const series = await prisma.series.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        episodes: {
          where: { published: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            content: true,
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
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const episodeIdx = series.episodes.findIndex(e => e.slug === episodeSlug);
    if (episodeIdx === -1) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const episode = series.episodes[episodeIdx];
    const prev = episodeIdx > 0
      ? { id: series.episodes[episodeIdx - 1].id, slug: series.episodes[episodeIdx - 1].slug, title: series.episodes[episodeIdx - 1].title, order: series.episodes[episodeIdx - 1].order }
      : null;
    const next = episodeIdx < series.episodes.length - 1
      ? { id: series.episodes[episodeIdx + 1].id, slug: series.episodes[episodeIdx + 1].slug, title: series.episodes[episodeIdx + 1].title, order: series.episodes[episodeIdx + 1].order }
      : null;

    // Don't leak all episodes content — return only minimal prev/next info
    const { episodes: _, ...seriesForClient } = series;

    const settings = await prisma.setting.findMany({
      where: { key: 'profileImage' }
    });
    const profileImageSetting = settings.find(s => s.key === 'profileImage');

    const adminUser = await prisma.user.findFirst();
    let adminName = adminUser?.name || 'Admin';
    if (adminUser && adminUser.name) {
      try {
        const { decryptDeterministic } = await import('@/lib/encryption');
        adminName = decryptDeterministic(adminUser.name);
      } catch (e) {
        // Fallback if not encrypted
      }
    }

    return NextResponse.json({
      episode,
      series: seriesForClient,
      prev,
      next,
      totalEpisodes: series.episodes.length,
      adminName,
      adminImage: profileImageSetting?.value || null
    });
  } catch (error) {
    console.error('Error fetching episode:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
