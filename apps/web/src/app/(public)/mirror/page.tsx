import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import MirrorClient from "./MirrorClient";

export const metadata: Metadata = {
  title: {
    absolute: "Linux & BSD Repository Mirror",
  },
  description:
    "High-speed, GPG-verified Linux & BSD package cache and direct ISO mirror in Indonesia. Free public access at mirror.masdika.id.",
  keywords: [
    "Linux Mirror Indonesia",
    "BSD Mirror Indonesia",
    "ISO Mirror Indonesia",
    "Package Cache Mirror",
    "Proxmox Mirror Indonesia",
    "Ubuntu Mirror Indonesia",
    "Debian Mirror Indonesia",
    "Arch Linux Mirror Indonesia",
    "Masdika Linux Mirror",
  ],
  alternates: {
    canonical: "https://www.masdika.id/mirror",
  },
  openGraph: {
    title: "Linux & BSD Repository Mirror",
    description:
      "High-speed, GPG-verified Linux & BSD package cache and direct ISO mirror in Indonesia. Free public access at mirror.masdika.id.",
    url: "https://www.masdika.id/mirror",
    siteName: "Masdika",
    images: [{ url: `https://www.masdika.id${OG_IMAGE_PATH}`, width: 1200, height: 630, alt: "Masdika Linux & BSD Repository Mirror" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linux & BSD Repository Mirror",
    description:
      "High-speed, GPG-verified Linux & BSD package cache and direct ISO mirror in Indonesia. Free public access at mirror.masdika.id.",
    images: [`https://www.masdika.id${OG_IMAGE_PATH}`],
  },
};

export default function MirrorPage() {
  return <MirrorClient />;
}
