import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { deleteLocalFile } from '@/lib/file-utils';
import fs from 'fs';
import path from 'path';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, content, type, isActive, imageUrl, actionUrl } = body;

    const oldAnnouncement = await prisma.announcement.findUnique({
      where: { id: parseInt(params.id) }
    });

    if (!oldAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Delete old image if it is being replaced
    if (imageUrl !== undefined && oldAnnouncement.imageUrl && oldAnnouncement.imageUrl !== imageUrl) {
      deleteLocalFile(oldAnnouncement.imageUrl);
    }

    const announcement = await prisma.announcement.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(actionUrl !== undefined && { actionUrl }),
      }
    });

    return NextResponse.json(announcement);
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const oldAnnouncement = await prisma.announcement.findUnique({
      where: { id: parseInt(params.id) }
    });

    if (oldAnnouncement?.imageUrl) {
      deleteLocalFile(oldAnnouncement.imageUrl);
    }

    await prisma.announcement.delete({
      where: { id: parseInt(params.id) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
