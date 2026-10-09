import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const params = await props.params;
    const { id } = params;
    
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Ensure the short link belongs to the user or user is ADMIN
    const shortLink = await prisma.shortLink.findUnique({
      where: { id: parsedId }
    });

    if (!shortLink) {
      return NextResponse.json({ error: "Short link not found" }, { status: 404 });
    }

    if (shortLink.userId !== auth.userId && auth.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.shortLink.delete({
      where: { id: parsedId }
    });

    return NextResponse.json({ message: "Short link deleted successfully" });
  } catch (error) {
    console.error("Shortener API Delete Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
