import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const projects = await prisma.project.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { 
      title, description, image, techStack, content, status, categoryName,
      client, timeline, role, challenge, solution, testimonial, testimonialAuthor, keyResults,
      projectUrl
    } = body;

    let category = await prisma.projectCategory.findFirst({
      where: { name: categoryName || 'Uncategorized' }
    });

    if (!category) {
      category = await prisma.projectCategory.create({
        data: { name: categoryName || 'Uncategorized' }
      });
    }

    const slug = slugify(title);

    const project = await prisma.project.create({
      data: {
        title,
        slug,
        description,
        image: image || null,
        techStack: techStack || '[]',
        content: content || '',
        client: client || null,
        timeline: timeline || null,
        role: role || null,
        challenge: challenge || null,
        solution: solution || null,
        testimonial: testimonial || null,
        testimonialAuthor: testimonialAuthor || null,
        keyResults: keyResults || null,
        projectUrl: projectUrl || null,
        status: status || 'COMPLETED',
        categoryId: category.id
      }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
