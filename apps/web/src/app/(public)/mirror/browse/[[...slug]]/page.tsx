import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import MirrorBrowseClient from "./MirrorBrowseClient";

const SITE_URL = "https://www.masdika.id";

const ROOT_LABELS: Record<string, string> = {
  ubuntu: "Ubuntu",
  "ubuntu-releases": "Ubuntu ISO Releases",
  debian: "Debian",
  "debian-cd": "Debian ISO Releases",
  "debian-cd-testing": "Debian Testing ISO",
  "debian-cd-archive": "Debian Archive ISO",
  "debian-security": "Debian Security",
  proxmox: "Proxmox VE",
  kali: "Kali Linux",
  "kali-images": "Kali Linux ISO",
  parrot: "Parrot OS",
  linuxmint: "Linux Mint",
  "linuxmint-iso": "Linux Mint ISO",
  almalinux: "AlmaLinux",
  rocky: "Rocky Linux",
  "centos-stream": "CentOS Stream",
  epel: "EPEL (RHEL)",
  archlinux: "Arch Linux",
  alpine: "Alpine Linux",
  freebsd: "FreeBSD",
  "freebsd-pkg": "FreeBSD Packages",
  openbsd: "OpenBSD",
  mikrotik: "MikroTik RouterOS",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const segments = (slug ?? []).filter(Boolean);
  const subPath = segments.length > 0 ? `/${segments.join("/")}` : "";
  const fullUrl = `${SITE_URL}/mirror/browse${subPath}`;
  const ogImageUrl = `${SITE_URL}${OG_IMAGE_PATH}`;

  if (segments.length === 0) {
    const title = "Browse Repositories & ISO Releases - Masdika Mirror";
    const description =
      "Browse package directories, repository metadata, and direct ISO downloads across 23 Linux, BSD, Proxmox VE, and MikroTik roots on mirror.masdika.id.";
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: fullUrl },
      openGraph: {
        title,
        description,
        url: fullUrl,
        siteName: "Masdika",
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  }

  const rootSlug = segments[0].toLowerCase();
  const distroName = ROOT_LABELS[rootSlug] ?? segments[0];
  const title = `${distroName} (${subPath}) - Masdika Mirror`;
  const description = `Browse and download ${distroName} packages, GPG-verified repository metadata, and ISO images from ${subPath} on Masdika Mirror (mirror.masdika.id).`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: fullUrl },
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: "Masdika",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${distroName} Mirror - ${subPath}` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function MirrorBrowsePage() {
  return <MirrorBrowseClient />;
}
