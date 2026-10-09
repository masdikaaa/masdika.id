import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const { suspend, reason } = body;

    const customService = await prisma.customService.findUnique({
      where: { id }
    });

    if (!customService) {
      return NextResponse.json({ error: "Custom service not found" }, { status: 404 });
    }

    const newStatus = suspend ? 'SUSPENDED' : 'ACTIVE';

    await prisma.customService.update({
      where: { id },
      data: {
        status: newStatus,
      }
    });

    return NextResponse.json({ success: true, message: `Custom service ${newStatus.toLowerCase()} successfully` });
  } catch (error) {
    console.error("Custom service status update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
