import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Platform | Masdika Cloud",
  description:
    "Deploy web applications and APIs directly from Git repositories with automated SSL, CI/CD, and persistent storage on Masdika Cloud.",
  openGraph: {
    title: "App Platform | Masdika Cloud",
    description:
      "Deploy web applications and APIs directly from Git repositories with automated SSL, CI/CD, and persistent storage on Masdika Cloud.",
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
