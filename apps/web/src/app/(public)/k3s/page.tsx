import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import K3sClient from "./K3sClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Managed Kubernetes (K3s) - High Availability Clusters",
  description: "Deploy lightweight, highly available managed Kubernetes clusters in seconds. We handle the control plane so you can focus on your apps.",
  openGraph: {
    images: ["/og-image.webp"],
  },
};

export default async function K3sLandingPage() {
  const pricingData = await prisma.vpsPricing.findMany();

  const pricing = pricingData.reduce((acc, curr) => {
    acc[curr.key] = curr.pricePerHour;
    return acc;
  }, {} as Record<string, number>);

  const k3sEnabledSetting = await prisma.setting.findUnique({ where: { key: 'k3s_enabled' } });
  const isK3sEnabled = k3sEnabledSetting?.value !== 'false';

  const safePricing = {
    vcpu: pricing.vcpu || 100,
    ram: pricing.ram || 50,
    disk: pricing.disk || 10,
    ipv4: pricing.ipv4 || 50,
    backup: pricing.backup || 10,
  };

  return <K3sClient safePricing={safePricing} isK3sEnabled={isK3sEnabled} />;
}
