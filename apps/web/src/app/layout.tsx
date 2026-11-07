import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Tracker } from "@/components/Tracker";
import { UserPresenceHeartbeat } from "@/components/UserPresenceHeartbeat";
import { prisma } from "@/lib/prisma";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from "next/script";
import { AIChatWrapper } from "@/components/AIChatWrapper";
import { InitialPreloader } from "@/components/ui/InitialPreloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

import { getCachedData } from '@/lib/cache';

const getCachedMetaDescription = () =>
  getCachedData('setting:meta_description', 3600, () =>
    prisma.setting.findUnique({ where: { key: 'meta_description' } })
  );

export async function generateMetadata(): Promise<Metadata> {
  let description = "Portfolio of Masdika, Cloud & DevOps Engineer. Discover enterprise infrastructure projects, high-performance Cloud VPS hosting, Managed Kubernetes, and scalable cloud solutions.";
  try {
    const metaDescSetting = await getCachedMetaDescription();
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Failed to fetch meta_description", error);
  }

  const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.masdika.id';
  const siteUrl = rawSiteUrl.replace(/^["']|["']$/g, '').trim();
  const timestamp = Date.now();
  const ogImageUrl = `/images/brand/og-image.webp?v=${timestamp}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: "%s | Masdika",
      default: "Masdika | Cloud & DevOps Engineer",
    },
    description,
    keywords: [
      "Masdika",
      "Cloud Engineer",
      "DevOps Engineer",
      "System Administrator",
      "Portfolio Masdika",
      "Cloud Infrastructure",
      "Linux Administrator",
      "Kubernetes Engineer",
      "Cloud VPS",
      "DevOps Indonesia",
      "Sidoarjo",
      "Surabaya"
    ],
    authors: [{ name: "Masdika", url: siteUrl }],
    creator: "Masdika",
    publisher: "Masdika",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: siteUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: "Masdika - Cloud VPS Indonesia, High-Performance Compute & Kubernetes",
      description,
      url: siteUrl,
      siteName: 'Masdika',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Masdika - High-Performance Cloud VPS & Infrastructure",
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: "summary_large_image",
      title: "Masdika - Cloud VPS Indonesia, High-Performance Compute & Kubernetes",
      description,
      images: [ogImageUrl],
      creator: "@masdikaid",
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/favicon.ico',
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("masdika-theme")?.value;
  const initialTheme = (themeCookie === "light" || themeCookie === "dark") ? themeCookie : "light";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased ${initialTheme}`}
      suppressHydrationWarning
    >
      <head>
        {/* Structured Data (Schema.org) for Google Knowledge Graph & AI Overview */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.masdika.id/#organization",
                  "name": "Masdika",
                  "alternateName": ["Masdika Cloud", "Masdika.ID", "Masdika VPS"],
                  "url": "https://www.masdika.id",
                  "logo": "https://www.masdika.id/favicon.ico",
                  "description": "Enterprise-grade Cloud VPS, High-Performance Compute, and Managed Kubernetes (K3s) hosting provider in Indonesia.",
                  "foundingLocation": {
                    "@type": "Place",
                    "name": "Sidoarjo, Indonesia"
                  },
                  "sameAs": [
                    "https://github.com/masdikaaa",
                    "https://youtube.com/@masdikaid"
                  ]
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.masdika.id/#website",
                  "url": "https://www.masdika.id",
                  "name": "Masdika",
                  "publisher": {
                    "@id": "https://www.masdika.id/#organization"
                  },
                  "inLanguage": "en-US",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://www.masdika.id/blog?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "Product",
                  "@id": "https://www.masdika.id/#cloud-vps",
                  "name": "Masdika Cloud VPS Murah Indonesia",
                  "alternateName": [
                    "VPS Murah Indonesia",
                    "Cloud VPS Murah",
                    "Sewa VPS Murah",
                    "Masdika Cloud VPS",
                    "KVM VPS Murah"
                  ],
                  "description": "Layanan Cloud VPS murah Indonesia berkinerja tinggi didukung prosesor enterprise Intel Xeon, enterprise SSD & HDD storage, KVM virtualization, dan sistem hemat Pay-As-You-Go per jam.",
                  "brand": {
                    "@id": "https://www.masdika.id/#organization"
                  },
                  "category": "Cloud Computing > Virtual Private Server > VPS Murah",
                  "offers": {
                    "@type": "AggregateOffer",
                    "priceCurrency": "IDR",
                    "lowPrice": "100",
                    "highPrice": "500000",
                    "priceValidUntil": "2027-12-31",
                    "offerCount": "100",
                    "availability": "https://schema.org/InStock"
                  }
                },
                {
                  "@type": "Product",
                  "@id": "https://www.masdika.id/#managed-k3s",
                  "name": "Masdika Managed Kubernetes (K3s)",
                  "description": "Production-grade Managed K3s Kubernetes clusters with automated master control-plane, private VPC VLAN networking, and instant worker scaling.",
                  "brand": {
                    "@id": "https://www.masdika.id/#organization"
                  },
                  "category": "Cloud Computing > Managed Kubernetes",
                  "offers": {
                    "@type": "AggregateOffer",
                    "priceCurrency": "IDR",
                    "lowPrice": "100",
                    "priceValidUntil": "2027-12-31",
                    "availability": "https://schema.org/InStock"
                  }
                }
              ]
            })
          }}
        />
        {/* Preconnect & DNS-Prefetch for high-frequency external endpoints */}
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
        <link rel="preconnect" href="https://challenges.cloudflare.com" crossOrigin="anonymous" />
        {/* Speculation Rules API: Native Chromium 0ms instant page navigation */}
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [
                {
                  source: "document",
                  where: {
                    and: [
                      { href_matches: "/*" },
                      { not: { href_matches: "/admin/*" } },
                      { not: { href_matches: "/dashboard/*" } },
                      { not: { href_matches: "/api/*" } },
                      { not: { href_matches: "/login" } },
                      { not: { href_matches: "/register" } },
                      { not: { selector_matches: "[data-no-prerender]" } },
                    ],
                  },
                  eagerness: "moderate",
                },
              ],
              prefetch: [
                {
                  source: "document",
                  where: {
                    and: [
                      { href_matches: "/*" },
                      { not: { href_matches: "/admin/*" } },
                      { not: { href_matches: "/dashboard/*" } },
                      { not: { href_matches: "/api/*" } },
                    ],
                  },
                  eagerness: "conservative",
                },
              ],
            }),
          }}
        />
        {/* Prevent stuck initial preloader on page refresh */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (sessionStorage.getItem('masdika-initial-loaded') === 'true') {
                    var s = document.createElement('style');
                    s.id = 'skip-preloader-style';
                    s.innerHTML = '#initial-preloader, .premium-fullscreen-loader { display: none !important; }';
                    document.head.appendChild(s);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('masdika-theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider initialTheme={initialTheme}>
          <InitialPreloader />
          <Tracker />
          <UserPresenceHeartbeat />
          <main className="flex-1 flex flex-col overflow-x-hidden">
            {children}
          </main>
          <AIChatWrapper />
          <Toaster
            theme="dark"
            position="top-right"
            richColors
            toastOptions={{
              style: {
                background: '#0f172a',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                color: '#e4e4e7',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
