import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import VpsClient from "./VpsClient";
import { getCachedData } from "@/lib/cache";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Cloud VPS Murah Indonesia - High-Performance Compute & Pure NVMe | Masdika",
  description: "Sewa Cloud VPS murah Indonesia berkinerja tinggi didukung enterprise Intel Xeon, pure NVMe SSD, dan sistem hemat Pay-As-You-Go per jam. Latency super rendah <20ms IIX.",
  keywords: [
    "VPS Murah",
    "VPS Murah Indonesia",
    "Sewa VPS Murah",
    "Cloud VPS Murah",
    "Cloud VPS Murah Indonesia",
    "Beli VPS Murah",
    "VPS Pay As You Go",
    "Cloud VPS Indonesia",
    "High Performance Compute",
    "NVMe VPS",
    "KVM VPS Indonesia",
    "Masdika VPS",
    "Cloud Server Indonesia",
    "Low Latency VPS"
  ],
  alternates: {
    canonical: "https://www.masdika.id/vps",
  },
  openGraph: {
    title: "Cloud VPS Murah Indonesia - High-Performance Compute & Pure NVMe | Masdika",
    description: "Sewa Cloud VPS murah Indonesia berkinerja tinggi didukung enterprise Intel Xeon, pure NVMe SSD, dan sistem hemat Pay-As-You-Go per jam. Latency super rendah <20ms IIX.",
    url: "https://www.masdika.id/vps",
    siteName: "Masdika",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Masdika Cloud VPS Murah Indonesia",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud VPS Murah Indonesia - High-Performance Compute & Pure NVMe | Masdika",
    description: "Sewa Cloud VPS murah Indonesia berkinerja tinggi didukung enterprise Intel Xeon, pure NVMe SSD, dan sistem hemat Pay-As-You-Go per jam. Latency super rendah <20ms IIX.",
    images: ["/og-image.webp"],
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
        "name": "Cloud VPS Murah Indonesia - Masdika",
        "alternateName": [
          "VPS Murah Indonesia",
          "Cloud VPS Murah",
          "Sewa VPS Murah",
          "Masdika Cloud VPS",
          "KVM VPS Murah"
        ],
        "description": "Layanan Cloud VPS murah Indonesia berkinerja tinggi didukung prosesor enterprise Intel Xeon, penyimpanan pure NVMe SSD, virtualisasi KVM terisolasi, dan sistem hemat Pay-As-You-Go per jam.",
        "category": "Cloud Computing > Virtual Private Server > VPS Murah",
        "image": "https://www.masdika.id/og-image.webp",
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
            "name": "Apakah Masdika menyediakan Cloud VPS murah di Indonesia?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ya, Masdika menyediakan layanan Cloud VPS murah Indonesia berkualitas enterprise dengan sistem pembayaran hemat Pay-As-You-Go per jam, penyimpanan ultra-cepat Pure NVMe SSD, dan routing lokal IIX latensi di bawah 20ms."
            }
          },
          {
            "@type": "Question",
            "name": "Berapa harga sewa Cloud VPS murah di Masdika?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sewa VPS di Masdika dihitung transparan secara per jam (pay-as-you-go) mulai dari Rp 100/jam untuk vCPU, Rp 50/jam untuk RAM, dan Rp 15/jam untuk NVMe SSD. Anda hanya membayar apa yang Anda gunakan tanpa biaya kontrak bulanan yang mahal."
            }
          },
          {
            "@type": "Question",
            "name": "Apakah ada minimal deposit saldo untuk sewa VPS murah?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tidak ada komitmen besar. Anda bisa mulai membuat instance VPS hanya dengan mengisi saldo deposit minimal mulai Rp 10.000 melalui QRIS atau transfer bank instan."
            }
          },
          {
            "@type": "Question",
            "name": "Apa keunggulan VPS murah Masdika dibanding provider lain?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Meskipun harganya murah dan terjangkau, VPS Masdika menggunakan virtualisasi KVM murni tanpa overselling, prosesor enterprise Intel Xeon, proteksi Anti-DDoS otomatis, akses full root SSH, dan web console VNC."
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
