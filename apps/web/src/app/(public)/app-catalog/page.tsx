import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCachedData } from "@/lib/cache";
import AppCatalogClient from "./AppCatalogClient";
import { VPS_APPS } from "@/lib/vps-apps";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "App Catalog - 1-Click Cloud Applications & Stacks",
  },
  description:
    "Deploy scalable 1-Click Applications on Cloud VPS in seconds. Automated Cloud-Init deployment for aaPanel, Docker, WordPress, Coolify, Nextcloud, and enterprise developer stacks.",
  keywords: [
    "App Catalog",
    "1-Click App VPS",
    "aaPanel VPS",
    "Docker Cloud VPS",
    "WordPress VPS Indonesia",
    "Coolify VPS",
    "CloudPanel VPS",
    "Automated Cloud-Init",
    "Cloud Applications",
    "1-Click Deployment",
    "Masdika App Catalog",
  ],
  alternates: {
    canonical: "https://www.masdika.id/app-catalog",
  },
  openGraph: {
    title: "App Catalog - 1-Click Cloud Applications & Stacks",
    description:
      "Deploy scalable 1-Click Applications on Cloud VPS in seconds. Automated Cloud-Init deployment for aaPanel, Docker, WordPress, Coolify, Nextcloud, and enterprise developer stacks.",
    url: "https://www.masdika.id/app-catalog",
    siteName: "Masdika",
    images: [
      {
        url: "/images/brand/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Masdika App Catalog - 1-Click Cloud Stacks",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "App Catalog - 1-Click Cloud Applications & Stacks",
    description:
      "Deploy scalable 1-Click Applications on Cloud VPS in seconds. Automated Cloud-Init deployment for aaPanel, Docker, WordPress, Coolify, Nextcloud, and enterprise developer stacks.",
    images: ["/images/brand/og-image.webp"],
  },
};

export default async function AppCatalogLandingPage() {
  const { pricing } = await getCachedData("pricing:app_catalog_page", 300, async () => {
    const pricingData = await prisma.vpsPricing.findMany();
    const map = pricingData.reduce((acc, curr) => {
      acc[curr.key] = curr.pricePerHour;
      return acc;
    }, {} as Record<string, number>);

    return { pricing: map };
  });

  const appCatalogJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": "https://www.masdika.id/app-catalog#collection",
        "name": "1-Click App Catalog - Masdika Cloud",
        "description":
          "Curated collection of 1-Click pre-configured server applications and developer stacks ready for instant deployment on high-speed KVM Cloud VPS.",
        "url": "https://www.masdika.id/app-catalog",
        "isPartOf": {
          "@type": "WebSite",
          "name": "Masdika",
          "url": "https://www.masdika.id"
        },
        "hasPart": VPS_APPS.slice(0, 10).map((app) => ({
          "@type": "SoftwareApplication",
          "name": app.name,
          "applicationCategory": app.category,
          "operatingSystem": app.osBase,
          "description": app.description,
          "offers": {
            "@type": "Offer",
            "price": "100",
            "priceCurrency": "IDR",
            "availability": "https://schema.org/InStock"
          }
        }))
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appCatalogJsonLd) }}
      />
      <AppCatalogClient baseHourlyRate={pricing.vcpu || 100} />
    </>
  );
}

