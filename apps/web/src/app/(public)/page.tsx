import { Metadata } from "next";
import { getPublicSettings } from "@/lib/settings";
import { getCachedData } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { HomeClient } from "./HomeClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: "Masdika - Cloud VPS Murah Indonesia, High-Performance Compute & Kubernetes",
  description: "Deploy scalable, ultra-fast Cloud VPS murah Indonesia & Managed Kubernetes dengan pure NVMe SSD storage, sub-20ms latency, dan sistem hemat hourly pay-as-you-go.",
  keywords: [
    "VPS Murah",
    "VPS Murah Indonesia",
    "Sewa VPS Murah",
    "Cloud VPS Murah",
    "Cloud VPS Murah Indonesia",
    "Beli VPS Murah",
    "Cloud VPS Indonesia",
    "VPS Pay As You Go",
    "High Performance Compute",
    "Managed Kubernetes",
    "K3s",
    "NVMe VPS",
    "Cloud Infrastructure",
    "Masdika",
    "Masdika VPS",
    "KVM VPS"
  ],
  alternates: {
    canonical: "https://www.masdika.id",
  },
  openGraph: {
    title: "Masdika - Cloud VPS Murah Indonesia, High-Performance Compute & Kubernetes",
    description: "Deploy scalable, ultra-fast Cloud VPS murah Indonesia & Managed Kubernetes dengan pure NVMe SSD storage, sub-20ms latency, dan sistem hemat hourly pay-as-you-go.",
    url: "https://www.masdika.id",
    siteName: "Masdika",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Masdika - Cloud VPS Murah Indonesia & High-Performance Compute",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Masdika - Cloud VPS Murah Indonesia, High-Performance Compute & Kubernetes",
    description: "Deploy scalable, ultra-fast Cloud VPS murah Indonesia & Managed Kubernetes dengan pure NVMe SSD storage, sub-20ms latency, dan sistem hemat hourly pay-as-you-go.",
    images: ["/og-image.webp"],
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
