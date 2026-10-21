import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCommentReplyEmail } from '@/lib/email';
import { encryptDeterministic, decryptDeterministic } from '@/lib/encryption';
import { requireAuth } from '@/lib/auth-middleware';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.comment.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const resolvedParams = await params;
    const parentId = parseInt(resolvedParams.id);
    if (isNaN(parentId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      include: { blogPost: true }
    });

    if (!parentComment) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { id: 'asc' },
    });
    const adminName = adminUser ? adminUser.name : encryptDeterministic('Admin');
    const adminEmail = adminUser ? adminUser.email : encryptDeterministic('admin@masdika.com');

    // Create reply
    const reply = await prisma.comment.create({
      data: {
        name: adminName,
        email: adminEmail,
        content: encryptDeterministic(content),
        isAdmin: true,
        blogPostId: parentComment.blogPostId,
        parentId: parentId
      }
    });

    const decryptedAdminName = adminUser ? decryptDeterministic(adminUser.name) : 'Admin';

    // Send email notification to parent commenter
    sendCommentReplyEmail(
      decryptDeterministic(parentComment.email), 
      decryptDeterministic(parentComment.name), 
      decryptedAdminName,
      parentComment.blogPost.title, 
      parentComment.blogPost.slug, 
      content
    ).catch(console.error);

    return NextResponse.json({ message: 'Reply sent successfully', reply });
  } catch (error) {
    console.error('Reply comment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
