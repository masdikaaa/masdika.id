import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import { type DnsStatsSnapshot, getDnsdistStats, getPdnsPublicInfo } from "@/lib/powerdns";
import DnsPublicClient from "./DnsPublicClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Masdika DNS - SafeDNS Public Resolver, DoH & Authoritative DNS",
  },
  description:
    "Fast, filtered SafeDNS Public Resolver with DNS-over-HTTPS (DoH) and instant-propagation Authoritative DNS with DNSSEC on Masdika Cloud.",
  keywords: [
    "Masdika DNS",
    "SafeDNS Indonesia",
    "DNS over HTTPS Indonesia",
    "DoH Resolver",
    "Authoritative DNS",
    "DNSSEC Hosting",
    "PowerDNS Indonesia",
  ],
  alternates: {
    canonical: "https://www.masdika.id/dns",
  },
  openGraph: {
    title: "Masdika DNS - SafeDNS Public Resolver, DoH & Authoritative DNS",
    description:
      "Fast, filtered SafeDNS Public Resolver with DNS-over-HTTPS (DoH) and instant-propagation Authoritative DNS with DNSSEC.",
    url: "https://www.masdika.id/dns",
    siteName: "Masdika",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "Masdika DNS Services" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Masdika DNS - SafeDNS Public Resolver, DoH & Authoritative DNS",
    description:
      "Fast, filtered SafeDNS Public Resolver with DNS-over-HTTPS (DoH) and instant-propagation Authoritative DNS with DNSSEC.",
    images: [OG_IMAGE_PATH],
  },
};

export default async function DnsPublicPage() {
  const [publicInfo, rawStats] = await Promise.all([
    getPdnsPublicInfo().catch(() => ({
      enabled: false,
      configured: false,
      nameservers: ["ns1.masdika.id", "ns2.masdika.id"],
      resolver: "dns1.masdika.id",
      publicIp: "103.247.10.61",
    })),
    getDnsdistStats().catch((): DnsStatsSnapshot => ({ available: false })),
  ]);

  const { reason: _reason, ...initialStats } = rawStats;

  return <DnsPublicClient publicInfo={publicInfo} initialStats={initialStats} />;
}
