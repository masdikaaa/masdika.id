import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedData } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const fetchPosts = async () => {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      image: true,
      createdAt: true,
      readTime: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }
    }
  });
  
  return posts.map(post => ({
    ...post,
    tags: post.tags.map(pt => pt.tag)
  }));
};

export async function GET(req: NextRequest) {
  try {
    const formattedPosts = await getCachedData('posts:list', 300, fetchPosts);

    return NextResponse.json(formattedPosts, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

