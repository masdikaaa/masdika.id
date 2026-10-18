import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import VpsClient from "./VpsClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Cloud VPS - High Performance Compute",
  description: "Deploy scalable, lightning-fast cloud virtual private servers. Powered by Intel Xeon E5-2673v4, enterprise-grade storage, and KVM virtualization.",
  openGraph: {
    images: ["/og-image.webp"],
  },
};

export default async function VpsLandingPage() {
  const pricingData = await prisma.vpsPricing.findMany();

  const pricing = pricingData.reduce((acc, curr) => {
    acc[curr.key] = curr.pricePerHour;
    return acc;
  }, {} as Record<string, number>);

  const vpsEnabledSetting = await prisma.setting.findUnique({ where: { key: 'vps_enabled' } });
  const isVpsEnabled = vpsEnabledSetting?.value !== 'false';

  const safePricing = {
    vcpu: pricing.vcpu || 100,
    ram: pricing.ram || 50,
    disk: pricing.disk || 10,
    diskSsd: pricing.diskSsd || pricing.disk || 15,
    ipv4: pricing.ipv4 || 50,
    backup: pricing.backup || 10,
  };

  return <VpsClient safePricing={safePricing} isVpsEnabled={isVpsEnabled} />;
}
