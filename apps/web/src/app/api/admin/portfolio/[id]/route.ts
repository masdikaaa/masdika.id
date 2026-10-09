import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { deleteLocalFile } from '@/lib/file-utils';
import { requireAuth } from '@/lib/auth-middleware';
import { slugify } from '@/lib/slugify';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const project = await prisma.project.findUnique({
      where: { id: parsedId },
      include: { category: true }
    });
    
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
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
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();
    const { 
      title, description, image, techStack, content, status, categoryName,
      client, timeline, role, challenge, solution, testimonial, testimonialAuthor, keyResults,
      projectUrl
    } = body;

    let categoryId = undefined;
    if (categoryName) {
      let category = await prisma.projectCategory.findFirst({
        where: { name: categoryName }
      });
      if (!category) {
        category = await prisma.projectCategory.create({ data: { name: categoryName } });
      }
      categoryId = category.id;
    }

    const existingProject = await prisma.project.findUnique({
      where: { id: parsedId }
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If image changed and old image is a local upload, delete the old image file
    if (image !== undefined && existingProject.image && existingProject.image !== image && existingProject.image.startsWith('/uploads/')) {
      const oldFilename = existingProject.image.split('/uploads/')[1];
      if (oldFilename) {
        const safeFilename = path.basename(oldFilename);
        const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    const project = await prisma.project.update({
      where: { id: parsedId },
      data: {
        ...(title && { 
          title, 
          slug: slugify(title)
        }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(techStack !== undefined && { techStack }),
        ...(content !== undefined && { content }),
        ...(client !== undefined && { client }),
        ...(timeline !== undefined && { timeline }),
        ...(role !== undefined && { role }),
        ...(challenge !== undefined && { challenge }),
        ...(solution !== undefined && { solution }),
        ...(testimonial !== undefined && { testimonial }),
        ...(testimonialAuthor !== undefined && { testimonialAuthor }),
        ...(keyResults !== undefined && { keyResults }),
        ...(projectUrl !== undefined && { projectUrl }),
        ...(status !== undefined && { status }),
        ...(categoryId !== undefined && { categoryId }),
      }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const project = await prisma.project.findUnique({
      where: { id: parsedId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If project has a local image upload, delete it
    if (project.image) {
      deleteLocalFile(project.image);
    }

    await prisma.project.delete({
      where: { id: parsedId }
    });

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
