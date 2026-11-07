import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import K3sClient from "./K3sClient";
import { getCachedData } from "@/lib/cache";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Managed Kubernetes (K3s) Indonesia - High Availability Clusters",
  description: "Deploy production-ready Managed K3s Kubernetes clusters in seconds with automated control plane, private VPC VLAN networking, and Enterprise SSD worker nodes in Indonesia.",
  keywords: [
    "Managed Kubernetes",
    "Managed K3s Indonesia",
    "Kubernetes Murah",
    "K3s Cluster Indonesia",
    "Cloud Kubernetes",
    "Container Hosting",
    "Masdika Kubernetes",
    "High Availability Kubernetes"
  ],
  alternates: {
    canonical: "https://www.masdika.id/k3s",
  },
  openGraph: {
    title: "Managed Kubernetes (K3s) Indonesia - High Availability Clusters | Masdika",
    description: "Deploy production-ready Managed K3s Kubernetes clusters in seconds with automated control plane, private VPC VLAN networking, and Enterprise SSD worker nodes in Indonesia.",
    url: "https://www.masdika.id/k3s",
    siteName: "Masdika",
    images: [
      {
        url: "/images/brand/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Masdika Managed Kubernetes K3s",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Managed Kubernetes (K3s) Indonesia - High Availability Clusters | Masdika",
    description: "Deploy production-ready Managed K3s Kubernetes clusters in seconds with automated control plane, private VPC VLAN networking, and Enterprise SSD worker nodes in Indonesia.",
    images: ["/images/brand/og-image.webp"],
  },
};

export default async function K3sLandingPage() {
  const { pricing, isK3sEnabled } = await getCachedData('pricing:k3s_page', 300, async () => {
    const pricingData = await prisma.vpsPricing.findMany();
    const map = pricingData.reduce((acc, curr) => {
      acc[curr.key] = curr.pricePerHour;
      return acc;
    }, {} as Record<string, number>);

    const k3sEnabledSetting = await prisma.setting.findUnique({ where: { key: 'k3s_enabled' } });
    return {
      pricing: map,
      isK3sEnabled: k3sEnabledSetting?.value !== 'false',
    };
  });

  const safePricing = {
    vcpu: pricing.vcpu || 100,
    ram: pricing.ram || 50,
    disk: pricing.disk || 10,
    ipv4: pricing.ipv4 || 50,
    backup: pricing.backup || 10,
    bandwidth: pricing.bandwidth !== undefined ? pricing.bandwidth : Math.ceil(50000 / 730),
  };

  return <K3sClient safePricing={safePricing} isK3sEnabled={isK3sEnabled} />;
}
