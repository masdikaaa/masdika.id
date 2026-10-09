// Force Turbopack reload
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/auth-middleware';
import { deleteLocalFile } from '@/lib/file-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const data = await req.json();
    const newTestimonial = await prisma.testimonial.create({
      data: {
        name: data.name,
        role: data.role,
        text: data.text,
        rating: data.rating || 5,
        order: data.order || 0,
        image: data.image
      }
    });
    return NextResponse.json(newTestimonial);
  } catch (error) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const testimonialsToDelete = await prisma.testimonial.findMany({
      where: { id: { in: ids } }
    });

    testimonialsToDelete.forEach(t => {
      if (t.image) {
        deleteLocalFile(t.image);
      }
    });

    await prisma.testimonial.deleteMany({
      where: {
        id: { in: ids }
      }
    });
    return NextResponse.json({ message: "Testimonials deleted successfully" });
  } catch (error) {
    console.error('Error deleting testimonials:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
