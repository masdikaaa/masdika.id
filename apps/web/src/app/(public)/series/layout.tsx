import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Series",
  description: "Structured learning series covering networking, cloud infrastructure, DevOps, and more. Step-by-step episodes to level up your tech skills.",
  openGraph: {
    title: "Learning Series",
    description: "Structured learning series covering networking, cloud infrastructure, DevOps, and more.",
    images: [{ url: "/images/brand/og-image.webp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learning Series",
    description: "Structured learning series covering networking, cloud infrastructure, DevOps, and more.",
    images: ["/images/brand/og-image.webp"],
  },
};

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
