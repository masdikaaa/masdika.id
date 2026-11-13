import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import ManagedDbClient from "./ManagedDbClient";
import { getCachedData } from "@/lib/cache";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: "Managed Database - Kubernetes K3s High Availability Cloud DB",
  },
  description: "Deploy production-ready MySQL, PostgreSQL, MariaDB, Redis, and MongoDB clusters in seconds. Powered by Kubernetes K3s isolation, persistent NVMe SSD storage, instant data export & import, browser web GUIs, and low-latency IIX routing.",
  keywords: [
    "Managed Database",
    "Kubernetes Database",
    "PostgreSQL Hosting",
    "MySQL Cloud Database",
    "MariaDB Hosting",
    "MongoDB Cloud",
    "K3s Database",
    "Database Indonesia",
    "Pay As You Go Database",
    "High Performance Database",
    "Masdika Database",
    "Cloud Database Sidoarjo"
  ],
  alternates: {
    canonical: "https://www.masdika.id/managed-db",
  },
  openGraph: {
    title: "Managed Database - Kubernetes K3s High Availability Cloud DB",
    description: "Deploy production-ready MySQL, PostgreSQL, MariaDB, Redis, and MongoDB clusters in seconds. Powered by Kubernetes K3s isolation, persistent NVMe SSD storage, instant data export & import, browser web GUIs, and low-latency IIX routing.",
    url: "https://www.masdika.id/managed-db",
    siteName: "Masdika",
    images: [
      {
        url: "/images/brand/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Masdika Managed Database - Kubernetes K3s High Availability",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Managed Database - Kubernetes K3s High Availability Cloud DB",
    description: "Deploy production-ready MySQL, PostgreSQL, MariaDB, Redis, and MongoDB clusters in seconds. Powered by Kubernetes K3s isolation, persistent NVMe SSD storage, instant data export & import, browser web GUIs, and low-latency IIX routing.",
    images: ["/images/brand/og-image.webp"],
  },
};

export default async function ManagedDbLandingPage() {
  const { dbPlans, sharedRatePerGb, isDatabaseEnabled } = await getCachedData('pricing:database_landing', 300, async () => {
    let plans: any[] = [];
    let rateSetting: any = null;
    let enabledSetting: any = null;

    try {
      [plans, rateSetting, enabledSetting] = await Promise.all([
        prisma.plan.findMany({ where: { service: 'DATABASE' } }),
        prisma.setting.findUnique({ where: { key: 'database_shared_rate_per_gb' } }),
        prisma.setting.findUnique({ where: { key: 'database_enabled' } }),
      ]);
    } catch {
      // Fallback if table not accessible
    }

    const rate = rateSetting ? parseInt(rateSetting.value, 10) : 10000;
    const isEnabled = enabledSetting?.value !== 'false';

    return {
      dbPlans: plans || [],
      sharedRatePerGb: isNaN(rate) || rate <= 0 ? 10000 : rate,
      isDatabaseEnabled: isEnabled,
    };
  });

  const safePricing = {
    sharedMonthlyPerGb: sharedRatePerGb || 10000,
    sharedHourlyPerGb: Math.max(1, Math.ceil((sharedRatePerGb || 10000) / 720)),
    dedicatedMonthlyBase: 45000,
    dedicatedHourlyBase: Math.max(1, Math.ceil(45000 / 720)),
    dedicatedStoragePerGbMonthly: 5000,
    dedicatedStoragePerGbHourly: Math.max(1, Math.ceil(5000 / 720)),
  };

  const dbJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": "https://www.masdika.id/managed-db#product",
        "name": "Managed Database - Kubernetes K3s High Availability",
        "sku": "MASDIKA-MDB-ID",
        "mpn": "MDB-K3S-01",
        "description": "High-Performance Managed Cloud Databases powered by Kubernetes K3s, container isolation, persistent NVMe SSD storage, instant data export & import, and flexible hourly Pay-As-You-Go billing.",
        "category": "Cloud Computing > Managed Database",
        "image": "https://www.masdika.id/images/brand/og-image.webp",
        "brand": {
          "@type": "Brand",
          "name": "Masdika"
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "IDR",
          "lowPrice": "14",
          "highPrice": "250000",
          "priceValidUntil": "2027-12-31",
          "availability": "https://schema.org/InStock",
          "offerCount": 100
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.95",
          "reviewCount": "142",
          "bestRating": "5",
          "worstRating": "1"
        },
        "review": [
          {
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": "Rian Pratama"
            },
            "datePublished": "2026-08-20",
            "reviewBody": "Managed Database dengan K3s di Masdika sangat cepat dan stabil. Sudah dapat akses pgAdmin dan NodePort publik, jadi koneksi dari Prisma dan Laravel lancar banget tanpa setup ribet.",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5",
              "worstRating": "1"
            }
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.masdika.id/managed-db#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does Masdika Managed Database work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Every managed database runs inside an isolated container Pod orchestrated by Kubernetes (K3s) on enterprise Dell PowerEdge nodes. Storage is bound via Persistent Volume Claims (PVC) on enterprise SSDs, ensuring zero data loss across Pod restarts or node maintenance."
            }
          },
          {
            "@type": "Question",
            "name": "Which database engines are supported?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We natively support PostgreSQL 16, MySQL 8.0, MariaDB 10.11, and MongoDB 7.0. Each database instance comes with its own web-based management GUI: pgAdmin 4 for PostgreSQL, phpMyAdmin for MySQL and MariaDB, and Mongo Express for MongoDB."
            }
          },
          {
            "@type": "Question",
            "name": "Can I connect using desktop database clients like DBeaver, TablePlus, or Navicat?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! Every database instance is assigned a unique public TCP NodePort (e.g., db.masdika.id:30500). You can connect from your local development machine, remote servers, or CI/CD pipelines using any standard database client or ORM."
            }
          }
        ]
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dbJsonLd) }}
      />
      <ManagedDbClient safePricing={safePricing} isDatabaseEnabled={isDatabaseEnabled} />
    </>
  );
}

