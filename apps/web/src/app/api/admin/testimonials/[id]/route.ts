// Force Turbopack reload
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/auth-middleware';
import { deleteLocalFile } from '@/lib/file-utils';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const testimonial = await prisma.testimonial.findUnique({
      where: { id: parseInt(id) }
    });

    if (testimonial?.image) {
      deleteLocalFile(testimonial.image);
    }

    await prisma.testimonial.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.testimonial.findUnique({
      where: { id: parseInt(id) }
    });

    if (existing?.image && existing.image !== data.image) {
      deleteLocalFile(existing.image);
    }

    const updatedTestimonial = await prisma.testimonial.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        role: data.role,
        text: data.text,
        rating: data.rating,
        order: data.order,
        image: data.image
      }
    });

    return NextResponse.json(updatedTestimonial);
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
