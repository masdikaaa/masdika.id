import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import MirrorClient from "./MirrorClient";

export const metadata: Metadata = {
  title: {
    absolute: "Linux Repository & ISO Mirror - Ubuntu, Debian, AlmaLinux, Rocky, Alpine",
  },
  description:
    "High-speed Linux repository cache and ISO mirror at mirror.masdika.id for Ubuntu, Debian, AlmaLinux, Rocky Linux, and Alpine Linux.",
  alternates: {
    canonical: "https://www.masdika.id/mirror",
  },
  openGraph: {
    title: "Linux Repository & ISO Mirror - Ubuntu, Debian, AlmaLinux, Rocky, Alpine",
    description:
      "High-speed Linux repository cache and ISO mirror at mirror.masdika.id for Ubuntu, Debian, AlmaLinux, Rocky Linux, and Alpine Linux.",
    url: "https://www.masdika.id/mirror",
    siteName: "Masdika",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "Masdika Linux Repository Mirror" }],
    locale: "en_US",
    type: "website",
  },
};

export default function MirrorPage() {
  return <MirrorClient />;
}
