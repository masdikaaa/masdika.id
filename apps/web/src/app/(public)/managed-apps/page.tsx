import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from "next";
import ManagedAppsClient from "./ManagedAppsClient";
import { MANAGED_APPS_CATALOG } from "@/lib/app-catalog";
import { getDynamicAppPlans } from "@/lib/app-plans-server";
import { isServiceEnabled } from "@/lib/service-availability";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: "Managed Applications - Kubernetes Production AI & Microservice Hosting",
  },
  description: "Deploy autonomous AI agents, multi-LLM gateways, and workflow engines (Hermes Agent, 9Router, n8n, OpenCode, OpenClaw, OmniRoute) in seconds. Powered by Kubernetes isolation, automated Let's Encrypt SSL, and sandboxed SSH terminal access.",
  keywords: [
    "Managed Applications",
    "Kubernetes App Hosting",
    "Hermes Agent Hosting",
    "9Router AI Gateway",
    "OmniRoute AI Gateway",
    "n8n Cloud Hosting",
    "OpenCode Developer Pod",
    "OpenClaw AI",
    "Autonomous AI Hosting",
    "Docker Microservices",
    "Container Hosting Indonesia",
    "Let's Encrypt SSL K8s",
    "Cloud Apps Sidoarjo"
  ],
  alternates: {
    canonical: "https://www.masdika.id/managed-apps",
  },
  openGraph: {
    title: "Managed Applications - Kubernetes Production AI & Microservice Hosting",
    description: "Deploy autonomous AI agents, multi-LLM gateways, and workflow engines (Hermes Agent, 9Router, n8n, OpenCode, OpenClaw, OmniRoute) in seconds. Powered by Kubernetes isolation, automated Let's Encrypt SSL, and sandboxed SSH terminal access.",
    url: "https://www.masdika.id/managed-apps",
    siteName: "Masdika",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Masdika Managed Applications - Kubernetes Production AI & Microservice Hosting",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Managed Applications - Kubernetes Production AI & Microservice Hosting",
    description: "Deploy autonomous AI agents, multi-LLM gateways, and workflow engines (Hermes Agent, 9Router, n8n, OpenCode, OpenClaw, OmniRoute) in seconds. Powered by Kubernetes isolation, automated Let's Encrypt SSL, and sandboxed SSH terminal access.",
    images: [OG_IMAGE_PATH],
  },
};

export default async function ManagedAppsLandingPage() {
  const appsJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": "https://www.masdika.id/managed-apps#product",
        "name": "Managed Applications - Kubernetes Production AI & Microservice Hosting",
        "sku": "MASDIKA-MAPP-ID",
        "mpn": "MAPP-K8S-01",
        "description": "High-Performance Managed Cloud Applications powered by Kubernetes, container isolation, automated Let's Encrypt SSL, and flexible monthly pricing starting from Rp 20.000 / month.",
        "category": "Cloud Computing > Managed Applications",
        "image": `https://www.masdika.id${OG_IMAGE_PATH}`,
        "brand": {
          "@type": "Brand",
          "name": "Masdika"
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "IDR",
          "lowPrice": "20000",
          "highPrice": "375000",
          "offerCount": "7",
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2027-12-31",
          "url": "https://www.masdika.id/managed-apps"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://www.masdika.id"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Managed Applications",
            "item": "https://www.masdika.id/managed-apps"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.masdika.id/managed-apps#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What applications are supported on Masdika Cloud Managed Apps?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We natively support NousResearch Hermes Agent (autonomous learning AI), 9Router (multi-LLM router & token optimizer), n8n (visual workflow automation canvas), OpenCode (sandboxed terminal developer environment), OpenClaw (multi-channel autonomous AI agent), and OmniRoute (cost-aware multi-provider AI gateway)."
            }
          },
          {
            "@type": "Question",
            "name": "How does SSL and domain routing work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "For web applications like 9Router, n8n, OpenClaw, and OmniRoute, each deployment receives an automated Let's Encrypt SSL certificate and an isolated subdomain (*.app.masdika.id) with zero manual DNS configuration required."
            }
          },
          {
            "@type": "Question",
            "name": "How do CLI and SSH applications work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "For terminal-focused AI tools like Hermes Agent and OpenCode, instances are provisioned with direct high-speed SSH access in a secure sandboxed environment. Package managers and network tunneling are restricted to guarantee zero abuse and 100% stable performance."
            }
          },
          {
            "@type": "Question",
            "name": "Can I scale compute resources without losing my data?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! With our Zero-Data-Loss dynamic Kubernetes scaling, you can upgrade or scale your vCPU and RAM flavors at any time while your persistent SSD volume remains completely intact."
            }
          }
        ]
      }
    ]
  };

  const [dynamicPlans, isAppEnabled] = await Promise.all([
    getDynamicAppPlans(),
    isServiceEnabled('managed_app_enabled'),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appsJsonLd) }}
      />
      <ManagedAppsClient
        catalog={MANAGED_APPS_CATALOG}
        plans={dynamicPlans}
        isAppEnabled={isAppEnabled}
      />
    </>
  );
}
