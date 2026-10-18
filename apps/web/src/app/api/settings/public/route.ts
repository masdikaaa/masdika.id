import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedData } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const fetchSettings = () =>
  prisma.setting.findMany({
    where: {
      key: {
        in: [
          'social_github',
          'social_linkedin',
          'social_twitter',
          'social_instagram',
          'social_youtube',
          'site_name',
          'site_title',
          'site_description',
          'contact_email',
          'contact_location',
          'contact_phone',
          'hero_title',
          'hero_description',
          'hero_typing_text',
          'cv_url'
        ]
      }
    }
  });

export async function GET() {
  try {
    const settingsArray = await getCachedData('settings:public_list', 300, fetchSettings);

    const settings = settingsArray.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
