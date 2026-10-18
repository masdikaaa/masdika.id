import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { BlogContent, BlogPostItem } from "./BlogContent";
import { getCachedData } from "@/lib/cache";

export const dynamic = 'force-dynamic';

async function fetchPosts(): Promise<BlogPostItem[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
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
            slug: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return posts.map((post) => ({
      ...post,
      createdAt: post.createdAt.toISOString(),
      tags: post.tags.map((pt) => pt.tag),
    }));
  } catch (error) {
    console.error("Error fetching blog posts for page:", error);
    return [];
  }
}

async function getPosts(): Promise<BlogPostItem[]> {
  return getCachedData('posts:blog_page', 300, fetchPosts);
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 items-center justify-center">
          <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      }
    >
      <BlogContent initialPosts={posts} />
    </Suspense>
  );
}
