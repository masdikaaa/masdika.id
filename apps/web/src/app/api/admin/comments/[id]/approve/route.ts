import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    const comment = await prisma.comment.update({
      where: { id },
      data: {
        isVerified: true,
        verificationToken: null
      }
    });

    return NextResponse.json({ message: 'Comment approved successfully', comment });
  } catch (error) {
    console.error('Error approving comment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
