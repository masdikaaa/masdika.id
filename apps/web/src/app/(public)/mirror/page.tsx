import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import MirrorClient from "./MirrorClient";

export const metadata: Metadata = {
  title: {
    absolute: "Linux & BSD Repository Mirror - Ubuntu, Debian, RHEL, Arch, Kali, BSD",
  },
  description:
    "Fast GPG-verified Linux & BSD package mirror and ISO downloads at mirror.masdika.id: Ubuntu, Debian 11-14, Kali, Parrot OS, Linux Mint, AlmaLinux, Rocky, CentOS Stream, EPEL, Arch, Alpine, FreeBSD, and OpenBSD.",
  keywords: [
    "Linux Mirror Indonesia",
    "Ubuntu Mirror Indonesia",
    "Debian Mirror Indonesia",
    "Kali Linux Mirror",
    "Parrot OS Mirror",
    "Linux Mint Mirror",
    "AlmaLinux Mirror",
    "Rocky Linux Mirror",
    "CentOS Stream Mirror",
    "EPEL Mirror",
    "Arch Linux Mirror Indonesia",
    "Alpine Linux Mirror",
    "FreeBSD Mirror",
    "OpenBSD Mirror",
    "Masdika Linux Mirror",
  ],
  alternates: {
    canonical: "https://www.masdika.id/mirror",
  },
  openGraph: {
    title: "Linux & BSD Repository Mirror - Ubuntu, Debian, RHEL, Arch, Kali, BSD",
    description:
      "Fast GPG-verified package cache and direct ISO mirror for Ubuntu, Debian 11-14, Kali, Parrot OS, Linux Mint, AlmaLinux, Rocky, CentOS Stream, EPEL, Arch, Alpine, FreeBSD, and OpenBSD.",
    url: "https://www.masdika.id/mirror",
    siteName: "Masdika",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "Masdika Linux & BSD Repository Mirror" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linux & BSD Repository Mirror - Ubuntu, Debian, RHEL, Arch, Kali, BSD",
    description:
      "Fast GPG-verified package cache and direct ISO mirror for Ubuntu, Debian 11-14, Kali, Parrot OS, Linux Mint, AlmaLinux, Rocky, CentOS Stream, EPEL, Arch, Alpine, FreeBSD, and OpenBSD.",
    images: [OG_IMAGE_PATH],
  },
};

export default function MirrorPage() {
  return <MirrorClient />;
}
