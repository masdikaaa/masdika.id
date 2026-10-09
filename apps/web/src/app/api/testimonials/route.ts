// Force Turbopack reload
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedTestimonials = unstable_cache(
  async () => {
    return prisma.testimonial.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  },
  ['testimonials-list'],
  { revalidate: 60, tags: ['testimonials'] }
);

export async function GET() {
  try {
    const testimonials = await getCachedTestimonials();
    return NextResponse.json(testimonials);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}