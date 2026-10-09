import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [experiences, educations, linkedinSetting, cvSetting] = await Promise.all([
      prisma.experience.findMany({ orderBy: { order: 'asc' } }),
      prisma.education.findMany({ orderBy: { order: 'asc' } }),
      prisma.setting.findUnique({ where: { key: 'social_linkedin' } }),
      prisma.setting.findUnique({ where: { key: 'cv_url' } })
    ]);
    
    return NextResponse.json({ 
      experiences, 
      educations,
      linkedinUrl: linkedinSetting?.value || 'https://linkedin.com',
      cv_url: cvSetting?.value || null
    });
  } catch (error) {
    console.error('Error fetching resume data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
