import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';
import { deleteLocalFile } from '@/lib/file-utils';

export async function DELETE() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const existingSetting = await prisma.setting.findUnique({ where: { key: 'profileImage' } });
    const oldImagePath = existingSetting?.value || '';

    if (oldImagePath) {
      deleteLocalFile(oldImagePath);
    }

    await prisma.setting.upsert({
      where: { key: 'profileImage' },
      update: { value: '' },
      create: { key: 'profileImage', value: '' }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
