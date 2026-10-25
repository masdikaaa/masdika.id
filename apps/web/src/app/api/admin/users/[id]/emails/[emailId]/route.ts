import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; emailId: string }> }
) {
  const params = await props.params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const emailId = parseInt(params.emailId);
    const userId = parseInt(params.id);
    if (isNaN(emailId) || isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid email ID' }, { status: 400 });
    }

    const result = await prisma.emailLog.deleteMany({
      where: { id: emailId, OR: [{ userId }, { userId: null }] }
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Email log deleted successfully' });
  } catch (error) {
    console.error('Delete Email Log Error:', error);
    return NextResponse.json({ error: 'Failed to delete email log' }, { status: 500 });
  }
}
