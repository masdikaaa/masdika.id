import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import VpsClient from "./VpsClient";
import { getCachedData } from "@/lib/cache";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: "Cloud VPS - High Performance Compute & Enterprise SSD",
  },
  description: "Deploy scalable, lightning-fast Cloud VPS powered by enterprise Intel Xeon, high-speed Enterprise SSD & SAS HDD storage, and sub-20ms latency across Indonesia.",
  keywords: [
    "Cloud VPS",
    "Cloud VPS Indonesia",
    "VPS Murah",
    "VPS Pay As You Go",
    "High Performance Compute",
    "SSD VPS",
    "Enterprise SSD",
    "KVM VPS Indonesia",
    "Masdika VPS",
    "Cloud Server Indonesia",
    "Low Latency VPS"
  ],
  alternates: {
    canonical: "https://www.masdika.id/vps",
  },
  openGraph: {
    title: "Cloud VPS - High Performance Compute & Enterprise SSD",
    description: "Deploy scalable, lightning-fast Cloud VPS powered by enterprise Intel Xeon, high-speed Enterprise SSD & SAS HDD storage, and sub-20ms latency across Indonesia.",
    url: "https://www.masdika.id/vps",
    siteName: "Masdika",
    images: [
      {
        url: "/images/brand/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Masdika Cloud VPS - High Performance Compute",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud VPS - High Performance Compute & Enterprise SSD",
    description: "Deploy scalable, lightning-fast Cloud VPS powered by enterprise Intel Xeon, high-speed Enterprise SSD & SAS HDD storage, and sub-20ms latency across Indonesia.",
    images: ["/images/brand/og-image.webp"],
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

  const vpsJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": "https://www.masdika.id/vps#product",
        "name": "Cloud VPS - High Performance Compute",
        "description": "High-Performance Cloud Virtual Private Servers powered by enterprise Intel Xeon, high-speed Enterprise SSD & SAS HDD storage, isolated KVM virtualization, and flexible hourly Pay-As-You-Go billing.",
        "category": "Cloud Computing > Virtual Private Server",
        "image": "https://www.masdika.id/images/brand/og-image.webp",
        "brand": {
          "@type": "Brand",
          "name": "Masdika"
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "IDR",
          "lowPrice": "100",
          "highPrice": "500000",
          "priceValidUntil": "2027-12-31",
          "availability": "https://schema.org/InStock",
          "offerCount": "100"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "128",
          "bestRating": "5",
          "worstRating": "1"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.masdika.id/vps#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why is the Sidoarjo datacenter important?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Having our servers locally in Sidoarjo, East Java guarantees ultra-low latency (under 20ms) across Indonesia, ensuring much faster response times compared to routing traffic to Singapore or the US."
            }
          },
          {
            "@type": "Question",
            "name": "Should I choose Enterprise SSD or SAS HDD?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Select Enterprise SSD if you are running databases, high-traffic websites, or applications requiring fast I/O. Opt for SAS HDD if you need massive storage space for backups, file hosting, or archives at a lower cost."
            }
          },
          {
            "@type": "Question",
            "name": "What kind of applications can I run?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! You can run almost anything. Our high-core count Intel Xeon processors make these servers excellent for hosting websites, databases, VPNs, or custom backend applications. You have full root access to install whatever you need."
            }
          },
          {
            "@type": "Question",
            "name": "Do I get full root access and VNC?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely. You get full root access via SSH, plus an out-of-band VNC Console directly in your dashboard, giving you total control to configure the OS exactly to your requirements."
            }
          },
          {
            "@type": "Question",
            "name": "How can I expose my applications online with VPS NAT?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Since the VPS NAT does not come with a dedicated public IP by default, you can easily use Cloudflare Tunnel (cloudflared) to securely expose your web services and applications to the internet without needing port forwarding."
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vpsJsonLd) }}
      />
      <VpsClient safePricing={safePricing} isVpsEnabled={isVpsEnabled} />
    </>
  );
}
