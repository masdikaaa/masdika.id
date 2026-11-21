import { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import AppPlatformClient from "./AppPlatformClient";
import { getDynamicAppPlatformPlans } from "@/lib/app-platform-plans-server";
import { isServiceEnabled } from "@/lib/service-availability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "App Platform - Git-to-Container PaaS & BuildKit Kubernetes Hosting",
  },
  description:
    "Deploy Laravel, Next.js, Node.js, Python, Go, or any Dockerfile directly from GitHub, GitLab, and Bitbucket. Powered by BuildKit, automated Let's Encrypt SSL, CI/CD webhooks, and live Linux PTY web shell.",
  keywords: [
    "App Platform Indonesia",
    "Git to Container PaaS",
    "Docker Hosting Indonesia",
    "Laravel Kubernetes Hosting",
    "Next.js PaaS Hosting",
    "BuildKit Container Build",
    "CI CD Auto Deploy",
    "Masdika App Platform",
  ],
  alternates: {
    canonical: "https://www.masdika.id/app-platform",
  },
  openGraph: {
    title: "App Platform - Git-to-Container PaaS & BuildKit Kubernetes Hosting",
    description:
      "Deploy any Git repository with Dockerfile via BuildKit in seconds. Automated CI/CD webhooks, Let's Encrypt SSL, and live Linux PTY terminal.",
    url: "https://www.masdika.id/app-platform",
    siteName: "Masdika",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Masdika App Platform - Git-to-Container PaaS",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "App Platform - Git-to-Container PaaS & BuildKit Kubernetes Hosting",
    description:
      "Deploy any Git repository with Dockerfile via BuildKit in seconds. Automated CI/CD webhooks, Let's Encrypt SSL, and live Linux PTY terminal.",
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
        name: "Masdika App Platform - Git-to-Container PaaS",
        sku: "MASDIKA-PAAS-ID",
        description:
          "Git-to-Container PaaS powered by BuildKit and Kubernetes. Deploy from GitHub, GitLab, or Bitbucket with automated SSL, CI/CD webhooks, and live Linux PTY terminal.",
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
