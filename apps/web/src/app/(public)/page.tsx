import { getPublicSettings } from "@/lib/settings";
import { getCachedData } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { HomeClient } from "./HomeClient";

export const revalidate = 60;

const fetchProjects = () =>
  prisma.project.findMany({
    where: { status: "COMPLETED" },
    select: {
      id: true,
      title: true,
      slug: true,
      image: true,
      description: true,
      techStack: true,
      projectUrl: true,
      client: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

const fetchPosts = async () => {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 3,
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
};

const fetchTestimonials = () =>
  prisma.testimonial.findMany({
    orderBy: [
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });

export default async function HomePage() {
  const [settings, projects, posts, testimonials] = await Promise.all([
    getPublicSettings().catch(() => ({})),
    getCachedData("portfolio:list:home", 300, fetchProjects).catch(() => []),
    getCachedData("posts:list:home", 300, fetchPosts).catch(() => []),
    getCachedData("testimonials:list", 300, fetchTestimonials).catch(() => []),
  ]);

  return (
    <HomeClient
      initialSettings={settings}
      initialProjects={projects}
      initialPosts={posts}
      initialTestimonials={testimonials}
    />
  );
}
