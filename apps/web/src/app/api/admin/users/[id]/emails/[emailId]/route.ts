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
    if (isNaN(emailId)) {
      return NextResponse.json({ error: 'Invalid email ID' }, { status: 400 });
    }

    await prisma.emailLog.delete({
      where: { id: emailId }
    });

    return NextResponse.json({ success: true, message: 'Email log deleted successfully' });
  } catch (error) {
    console.error('Delete Email Log Error:', error);
    return NextResponse.json({ error: 'Failed to delete email log' }, { status: 500 });
  }
}
