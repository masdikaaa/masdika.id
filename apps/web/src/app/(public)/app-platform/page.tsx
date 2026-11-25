import { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import AppPlatformClient from "./AppPlatformClient";
import { getDynamicAppPlatformPlans } from "@/lib/app-platform-plans-server";
import { isServiceEnabled } from "@/lib/service-availability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "App Platform - Git & Docker Container PaaS on Kubernetes | Masdika",
  },
  description:
    "Deploy web apps and APIs from Git repositories (BuildKit Dockerfile) or directly from Docker Registries (Docker Hub, GHCR). Includes Pre-Deploy release migrations, CI/CD webhooks, automated Let's Encrypt SSL, persistent storage, and live Linux PTY web shell.",
  keywords: [
    "App Platform Indonesia",
    "Git to Container PaaS",
    "Docker Registry Hosting",
    "GHCR Container Deploy",
    "Pre-Deploy Database Migration",
    "Kubernetes PaaS Indonesia",
    "BuildKit Container Build",
    "CI CD Auto Deploy",
    "Masdika App Platform",
  ],
  alternates: {
    canonical: "https://www.masdika.id/app-platform",
  },
  openGraph: {
    title: "App Platform - Git & Docker Container PaaS on Kubernetes | Masdika",
    description:
      "Deploy from Git (BuildKit Dockerfile) or directly from Docker Registries (Docker Hub, GHCR) with Pre-Deploy migrations, CI/CD webhooks, Let's Encrypt SSL, and live Linux PTY terminal.",
    url: "https://www.masdika.id/app-platform",
    siteName: "Masdika",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Masdika App Platform - Git & Docker Container PaaS",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "App Platform - Git & Docker Container PaaS on Kubernetes | Masdika",
    description:
      "Deploy from Git (BuildKit Dockerfile) or directly from Docker Registries (Docker Hub, GHCR) with Pre-Deploy migrations, CI/CD webhooks, Let's Encrypt SSL, and live Linux PTY terminal.",
    images: [OG_IMAGE_PATH],
  },
};

export default async function AppPlatformLandingPage() {
  const [plans, isAppPlatformEnabled] = await Promise.all([
    getDynamicAppPlatformPlans(),
    isServiceEnabled("app_platform_enabled"),
  ]);

  const prices = plans.map((p) => p.monthlyPrice).filter((p) => p > 0);
  const lowPrice = prices.length ? Math.min(...prices) : 20000;
  const highPrice = prices.length ? Math.max(...prices) : 375000;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": "https://www.masdika.id/app-platform#product",
        name: "Masdika App Platform - Git & Docker Container PaaS",
        sku: "MASDIKA-PAAS-ID",
        description:
          "Kubernetes Container PaaS powered by BuildKit and direct Docker Registry pulls. Deploy from GitHub, GitLab, Bitbucket, Docker Hub, or GHCR with Pre-Deploy release migrations, automated SSL, CI/CD webhooks, and live Linux PTY terminal.",
        category: "Cloud Computing > Platform as a Service",
        image: `https://www.masdika.id${OG_IMAGE_PATH}`,
        brand: { "@type": "Brand", name: "Masdika" },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "IDR",
          lowPrice: String(lowPrice),
          highPrice: String(highPrice),
          offerCount: String(plans.length),
          availability: "https://schema.org/InStock",
          priceValidUntil: "2027-12-31",
          url: "https://www.masdika.id/app-platform",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.masdika.id" },
          { "@type": "ListItem", position: 2, name: "App Platform", item: "https://www.masdika.id/app-platform" },
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
      <AppPlatformClient
        plans={plans}
        isAppPlatformEnabled={isAppPlatformEnabled}
      />
    </>
  );
}
