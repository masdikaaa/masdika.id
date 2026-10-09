import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const opportunities = await prisma.opportunity.findMany({
      where: {
        OR: [
          { slug: null },
          // Re-generate slugs created from timestamp fallback
          { slug: { startsWith: 'opportunity-' } }
        ]
      }
    });

    let updated = 0;
    for (const opp of opportunities) {
      let baseSlug = slugify(opp.title);
      if (!baseSlug) baseSlug = `opportunity-${opp.id}`;

      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const existing = await prisma.opportunity.findUnique({ where: { slug } });
        if (!existing || existing.id === opp.id) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      await prisma.opportunity.update({
        where: { id: opp.id },
        data: { slug }
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Error migrating slugs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
