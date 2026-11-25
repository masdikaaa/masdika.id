import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Platform",
  description:
    "Deploy and manage containerized web apps & APIs from Git repositories or Docker Registries with Pre-Deploy release migrations, automated SSL, CI/CD, and persistent storage on Masdika Cloud.",
  openGraph: {
    title: "App Platform",
    description:
      "Deploy and manage containerized web apps & APIs from Git repositories or Docker Registries with Pre-Deploy release migrations, automated SSL, CI/CD, and persistent storage on Masdika Cloud.",
    url: "https://masdika.id/dashboard/app-platform",
  },
};

export default function AppPlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
