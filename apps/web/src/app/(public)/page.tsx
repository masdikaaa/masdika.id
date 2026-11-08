import { Metadata } from "next";
import { getPublicSettings } from "@/lib/settings";
import { getCachedData } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { HomeClient } from "./HomeClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: {
    absolute: "Masdika | Cloud & DevOps Engineer",
  },
  description: "Portfolio of Masdika, Cloud & DevOps Engineer. Discover enterprise infrastructure projects, high-performance Cloud VPS hosting, Managed Kubernetes, and scalable cloud solutions.",
  alternates: {
    canonical: "https://www.masdika.id",
  },
  openGraph: {
    title: "Masdika | Cloud & DevOps Engineer",
    description: "Portfolio of Masdika, Cloud & DevOps Engineer. Discover enterprise infrastructure projects, high-performance Cloud VPS hosting, Managed Kubernetes, and scalable cloud solutions.",
    url: "https://www.masdika.id",
    siteName: "Masdika",
    images: [
      {
        url: "/images/brand/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Masdika | Cloud & DevOps Engineer",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Masdika | Cloud & DevOps Engineer",
    description: "Portfolio of Masdika, Cloud & DevOps Engineer. Discover enterprise infrastructure projects, high-performance Cloud VPS hosting, Managed Kubernetes, and scalable cloud solutions.",
    images: ["/images/brand/og-image.webp"],
  },
};

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
    take: 3,
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
