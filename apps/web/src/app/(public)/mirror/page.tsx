import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import MirrorClient from "./MirrorClient";

export const metadata: Metadata = {
  title: {
    absolute: "Linux & BSD Repository Mirror - Ubuntu, Debian, AlmaLinux, Arch, FreeBSD",
  },
  description:
    "High-speed Linux and BSD repository cache and direct ISO mirror at mirror.masdika.id for Ubuntu, Debian, Kali, Parrot OS, Linux Mint, AlmaLinux, Rocky, CentOS Stream, EPEL, Arch, Alpine, FreeBSD, and OpenBSD.",
  keywords: [
    "Linux Mirror Indonesia",
    "Ubuntu Mirror Indonesia",
    "Debian Mirror Indonesia",
    "AlmaLinux Mirror",
    "Kali Linux Mirror",
    "Arch Linux Mirror Indonesia",
    "FreeBSD Mirror",
    "Masdika Linux Mirror",
  ],
  alternates: {
    canonical: "https://www.masdika.id/mirror",
  },
  openGraph: {
    title: "Linux & BSD Repository Mirror - Ubuntu, Debian, AlmaLinux, Arch, FreeBSD",
    description:
      "High-speed, GPG-verified package caching and direct ISO mirror at mirror.masdika.id for 13+ Linux and BSD distributions.",
    url: "https://www.masdika.id/mirror",
    siteName: "Masdika",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "Masdika Linux & BSD Repository Mirror" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linux & BSD Repository Mirror - Ubuntu, Debian, AlmaLinux, Arch, FreeBSD",
    description:
      "High-speed, GPG-verified package caching and direct ISO mirror at mirror.masdika.id for 13+ Linux and BSD distributions.",
    images: [OG_IMAGE_PATH],
  },
};

export default function MirrorPage() {
  return <MirrorClient />;
}
