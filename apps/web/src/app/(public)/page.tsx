import { Metadata } from "next";
import { getPublicSettings } from "@/lib/settings";
import { getCachedData } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { HomeClient } from "./HomeClient";
import { getFreshOgImagePath } from "@/lib/og-image";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata(): Promise<Metadata> {
  const ogImageUrl = getFreshOgImagePath();
  const title = "Masdika - Cloud & DevOps Portfolio, VPS, Apps & AI Cloud";
  let description = "Portfolio of Masdika, Cloud & DevOps Engineer, offering Cloud VPS, Managed Databases, Managed Apps, Object Storage, File CDN, and AI Gateway services.";

  try {
    const metaDescSetting = await getCachedData('setting:meta_description', 3600, () =>
      prisma.setting.findUnique({ where: { key: 'meta_description' } })
    );
    if (metaDescSetting?.value?.trim()) {
      description = metaDescSetting.value.trim();
    }
  } catch (error) {
    console.error("Failed to fetch homepage meta_description:", error);
  }

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: "https://www.masdika.id",
    },
    openGraph: {
      title,
      description,
      url: "https://www.masdika.id",
      siteName: "Masdika",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

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
