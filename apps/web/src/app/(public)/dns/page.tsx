import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import { type DnsStatsSnapshot, getDnsdistStats, getPdnsPublicInfo } from "@/lib/powerdns";
import DnsPublicClient from "./DnsPublicClient";

export const dynamic = "force-dynamic";

const DNS_TITLE = "DNS Services - SafeDNS Public Resolver, DoH & Authoritative DNS";
const DNS_DESCRIPTION =
  "Fast, filtered SafeDNS Public Resolver with DNS-over-HTTPS (DoH) and instant-propagation Authoritative DNS with DNSSEC on Masdika Cloud.";

export const metadata: Metadata = {
  title: {
    absolute: DNS_TITLE,
  },
  description: DNS_DESCRIPTION,
  keywords: [
    "Masdika DNS",
    "DNS Services Indonesia",
    "SafeDNS Indonesia",
    "Public DNS Resolver Indonesia",
    "DNS over HTTPS Indonesia",
    "DoH Resolver",
    "Authoritative DNS",
    "DNSSEC Hosting",
    "PowerDNS Indonesia",
    "dns1.masdika.id",
    "ns1.masdika.id",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://www.masdika.id/dns",
  },
  openGraph: {
    title: DNS_TITLE,
    description: DNS_DESCRIPTION,
    url: "https://www.masdika.id/dns",
    siteName: "Masdika",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Masdika DNS Services - SafeDNS Public Resolver & Authoritative DNS",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: DNS_TITLE,
    description: DNS_DESCRIPTION,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://www.masdika.id/dns#webpage",
        url: "https://www.masdika.id/dns",
        name: DNS_TITLE,
        description: DNS_DESCRIPTION,
        isPartOf: { "@id": "https://www.masdika.id/#website" },
      },
      {
        "@type": "Service",
        name: "Masdika DNS Services",
        serviceType: "SafeDNS Public Resolver, DNS-over-HTTPS (DoH) & Authoritative DNS",
        provider: {
          "@type": "Organization",
          name: "Masdika Cloud",
          url: "https://www.masdika.id",
        },
        areaServed: "ID",
        url: "https://www.masdika.id/dns",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.masdika.id" },
          { "@type": "ListItem", position: 2, name: "DNS Services", item: "https://www.masdika.id/dns" },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DnsPublicClient publicInfo={publicInfo} initialStats={initialStats} />
    </>
  );
}
