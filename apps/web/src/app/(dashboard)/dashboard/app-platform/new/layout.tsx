import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deploy New App | App Platform",
  description:
    "Deploy a new containerized application from a Git repository (BuildKit Dockerfile) or directly from a Docker Registry (Docker Hub, GHCR) with Pre-Deploy release commands and automated SSL on Masdika Cloud.",
  openGraph: {
    title: "Deploy New App | App Platform",
    description:
      "Deploy a new containerized application from a Git repository (BuildKit Dockerfile) or directly from a Docker Registry (Docker Hub, GHCR) with Pre-Deploy release commands and automated SSL on Masdika Cloud.",
    url: "https://masdika.id/dashboard/app-platform/new",
  },
};

export default function NewAppPlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
