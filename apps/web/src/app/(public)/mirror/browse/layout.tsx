import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";

export const metadata: Metadata = {
  title: {
    absolute: "Browse Repositories & ISO Releases - Linux & BSD Mirror",
  },
  description:
    "Browse package directories and download official ISO images for Ubuntu, Debian, Kali, Parrot OS, Linux Mint, AlmaLinux, Rocky, CentOS Stream, Arch, Alpine, FreeBSD, and OpenBSD.",
  openGraph: {
    title: "Browse Repositories & ISO Releases - Linux & BSD Mirror",
    description:
      "Browse package directories and download official ISO images for Ubuntu, Debian 11-14, Kali, Parrot OS, Linux Mint, AlmaLinux, Rocky, CentOS Stream, Arch, Alpine, FreeBSD, and OpenBSD.",
    url: "https://www.masdika.id/mirror/browse",
    siteName: "Masdika",
    images: [{ url: `https://www.masdika.id${OG_IMAGE_PATH}`, width: 1200, height: 630, alt: "Masdika Mirror Repository Browser" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Repositories & ISO Releases - Linux & BSD Mirror",
    description:
      "Browse package directories and download official ISO images for Ubuntu, Debians, Kali, Parrot OS, Linux Mint, AlmaLinux, Rocky, CentOS Stream, Arch, Alpine, FreeBSD, and OpenBSD.",
    images: [`https://www.masdika.id${OG_IMAGE_PATH}`],
  },
};

export default function MirrorBrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
