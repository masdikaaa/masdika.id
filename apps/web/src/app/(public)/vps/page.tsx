import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import VpsClient from "./VpsClient";
import { getCachedData } from "@/lib/cache";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Cloud VPS Indonesia - High Performance Compute & Pure NVMe",
  description: "Deploy scalable, lightning-fast Cloud VPS in Indonesia powered by enterprise Intel Xeon, pure NVMe SSD storage, sub-20ms IIX low latency, and hourly pay-as-you-go billing.",
  keywords: [
    "Cloud VPS Indonesia",
    "VPS Murah Indonesia",
    "High Performance Compute",
    "NVMe VPS",
    "Pay As You Go VPS",
    "KVM VPS Indonesia",
    "Masdika VPS",
    "Cloud Server Indonesia",
    "Low Latency VPS"
  ],
  alternates: {
    canonical: "https://www.masdika.id/vps",
  },
  openGraph: {
    title: "Cloud VPS Indonesia - High Performance Compute & Pure NVMe | Masdika",
    description: "Deploy scalable, lightning-fast Cloud VPS in Indonesia powered by enterprise Intel Xeon, pure NVMe SSD storage, sub-20ms IIX low latency, and hourly pay-as-you-go billing.",
    url: "https://www.masdika.id/vps",
    siteName: "Masdika",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Masdika Cloud VPS",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud VPS Indonesia - High Performance Compute & Pure NVMe | Masdika",
    description: "Deploy scalable, lightning-fast Cloud VPS in Indonesia powered by enterprise Intel Xeon, pure NVMe SSD storage, sub-20ms IIX low latency, and hourly pay-as-you-go billing.",
    images: ["/og-image.webp"],
  },
};

export default async function VpsLandingPage() {
  const { pricing, isVpsEnabled } = await getCachedData('pricing:vps_page', 300, async () => {
    const pricingData = await prisma.vpsPricing.findMany();
    const map = pricingData.reduce((acc, curr) => {
      acc[curr.key] = curr.pricePerHour;
      return acc;
    }, {} as Record<string, number>);

    const vpsEnabledSetting = await prisma.setting.findUnique({ where: { key: 'vps_enabled' } });
    return {
      pricing: map,
      isVpsEnabled: vpsEnabledSetting?.value !== 'false',
    };
  });

  const safePricing = {
    vcpu: pricing.vcpu || 100,
    ram: pricing.ram || 50,
    disk: pricing.disk || 10,
    diskSsd: pricing.diskSsd || pricing.disk || 15,
    ipv4: pricing.ipv4 || 50,
    backup: pricing.backup || 10,
    bandwidth: pricing.bandwidth !== undefined ? pricing.bandwidth : Math.ceil(50000 / 730),
  };

  return <VpsClient safePricing={safePricing} isVpsEnabled={isVpsEnabled} />;
}
