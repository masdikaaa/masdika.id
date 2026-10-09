import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { decryptDeterministic } from '@/lib/encryption';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const comments = await prisma.comment.findMany({
      include: {
        blogPost: {
          select: { title: true, slug: true }
        },
        parent: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const blockedUsers = await prisma.blockedUser.findMany();
    const blockedValues = new Set(blockedUsers.map(b => b.value));

    const commentsWithBlockStatus = comments.map(comment => {
      const emailDec = decryptDeterministic(comment.email);
      const ipDec = decryptDeterministic(comment.ipAddress);
      
      let parentDecrypted = comment.parent;
      if (parentDecrypted) {
        parentDecrypted = {
          ...parentDecrypted,
          name: decryptDeterministic(parentDecrypted.name),
          content: decryptDeterministic(parentDecrypted.content),
          email: decryptDeterministic(parentDecrypted.email),
          ipAddress: decryptDeterministic(parentDecrypted.ipAddress)
        };
      }

      return {
        ...comment,
        name: decryptDeterministic(comment.name),
        email: emailDec,
        content: decryptDeterministic(comment.content),
        ipAddress: ipDec,
        isBlocked: blockedValues.has(emailDec) || (ipDec && blockedValues.has(ipDec)),
        parent: parentDecrypted
      };
    });

    return NextResponse.json(commentsWithBlockStatus);
  } catch (error) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
