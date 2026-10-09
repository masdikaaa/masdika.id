import { requireAuth } from '@/lib/auth-middleware';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PromosClient from './PromosClient';

export default async function PromosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });

  if (auth.error || !auth.user) {
    redirect('/login');
  }

  const { page } = await searchParams;
  const currentPage = parseInt(page || '1');
  const itemsPerPage = 6;

  const [totalPromos, promos] = await Promise.all([
    prisma.promo.count({ where: { isActive: true } }),
    prisma.promo.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      include: {
        claims: {
          where: { userId: auth.user.id }
        }
      }
    })
  ]);

  const totalPages = Math.ceil(totalPromos / itemsPerPage);

  return (
    <PromosClient 
      promos={promos} 
      totalPages={totalPages} 
      currentPage={currentPage} 
    />
  );
}
