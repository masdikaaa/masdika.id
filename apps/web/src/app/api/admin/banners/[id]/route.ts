import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    const bannerId = parseInt(id, 10);
    
    if (isNaN(bannerId)) {
      return NextResponse.json({ error: 'Invalid banner ID' }, { status: 400 });
    }

    const body = await req.json();
    const { title, imageUrl, actionUrl, isActive } = body;

    const banner = await prisma.banner.update({
      where: { id: bannerId },
      data: {
        title,
        imageUrl,
        actionUrl,
        isActive,
      },
    });

    return NextResponse.json(banner);
  } catch (error: any) {
    console.error('Error updating banner:', error);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    const bannerId = parseInt(id, 10);

    if (isNaN(bannerId)) {
      return NextResponse.json({ error: 'Invalid banner ID' }, { status: 400 });
    }

    await prisma.banner.delete({
      where: { id: bannerId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}
