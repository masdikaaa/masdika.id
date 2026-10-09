import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { deleteLocalFile } from '@/lib/file-utils';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { isPublished, name, link, image } = await req.json();
    const params = await context.params;
    const id = parseInt(params.id);

    const updateData: any = {};
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (name !== undefined) updateData.name = name;
    if (link !== undefined) updateData.link = link;
    if (image !== undefined) updateData.image = image;

    const group = await prisma.communityGroup.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, group });
  } catch (error) {
    console.error('Update community group error:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    // First, find the group to check if there is an image to delete from storage
    const group = await prisma.communityGroup.findUnique({ where: { id } });
    if (group?.image) {
      deleteLocalFile(group.image);
    }

    await prisma.communityGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete community group error:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
