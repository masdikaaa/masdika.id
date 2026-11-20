import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Platform",
  description:
    "Deploy web applications and APIs directly from Git repositories with automated SSL, CI/CD, and containerized runtime on Masdika Cloud.",
  openGraph: {
    title: "App Platform",
    description:
      "Deploy web applications and APIs directly from Git repositories with automated SSL, CI/CD, and containerized runtime on Masdika Cloud.",
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
