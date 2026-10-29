import { prisma } from "@/lib/prisma";
import { getCachedData } from "@/lib/cache";
import { PortfolioClient } from "./PortfolioClient";
import { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Portfolio - Projects & Engineering Work",
  description: "Explore enterprise cloud infrastructure, Kubernetes deployments, and automated CI/CD systems built by Masdika.",
  openGraph: {
    images: ["/og-image.webp"],
  },
};

const fetchProjects = () =>
  prisma.project.findMany({
    where: {
      status: "COMPLETED",
    },
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
  });

export default async function PortfolioPage() {
  const projects = await getCachedData("portfolio:list:all", 300, fetchProjects).catch(() => []);

  return <PortfolioClient initialProjects={projects} />;
}
