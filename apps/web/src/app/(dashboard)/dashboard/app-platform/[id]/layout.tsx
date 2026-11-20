import { OG_IMAGE_PATH } from "@/lib/og-image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const auth = await requireAuth();

  let appName = "Manage Application";

  try {
    const parsedId = parseInt(id, 10);
    if (!auth.error && auth.userId && !Number.isNaN(parsedId) && parsedId > 0) {
      const app = await prisma.appPlatformService.findFirst({
        where: { id: parsedId, userId: auth.userId },
        select: { name: true },
      });
      if (app?.name) {
        appName = app.name;
      }
    }
  } catch (error) {
    console.error("Error generating metadata for App Platform:", error);
  }

  const title = "App Platform";
  const description = `Manage your App Platform instance: ${appName}. View live build logs, container runtime, and deploy settings on Masdika Cloud.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}

export default function AppPlatformDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
