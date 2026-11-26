import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";

export const metadata: Metadata = {
  title: {
    absolute: "Browse Repositories & ISO Releases - Masdika Linux Mirror",
  },
  description:
    "Browse package directories and download official ISO images directly from mirror.masdika.id.",
  openGraph: {
    title: "Browse Repositories & ISO Releases - Masdika Linux Mirror",
    description:
      "Browse package directories and download official ISO images directly from mirror.masdika.id.",
    url: "https://www.masdika.id/mirror/browse",
    siteName: "Masdika",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "Masdika Mirror Repository Browser" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Repositories & ISO Releases - Masdika Linux Mirror",
    description:
      "Browse package directories and download official ISO images directly from mirror.masdika.id.",
    images: [OG_IMAGE_PATH],
  },
};

export default function MirrorBrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
