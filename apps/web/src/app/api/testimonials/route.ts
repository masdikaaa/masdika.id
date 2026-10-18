import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedData } from "@/lib/cache";

export const dynamic = 'force-dynamic';

const fetchTestimonials = () =>
  prisma.testimonial.findMany({
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' }
    ]
  });

export async function GET() {
  try {
    const testimonials = await getCachedData('testimonials:list', 300, fetchTestimonials);
    return NextResponse.json(testimonials, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}