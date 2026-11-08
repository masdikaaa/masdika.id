import { Metadata } from 'next';

const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.masdika.id';
const siteUrl = rawSiteUrl.replace(/^["']|["']$/g, '').trim();

export const metadata: Metadata = {
  title: {
    absolute: 'Live Cyber Threat Map - Real-Time Attack Intelligence',
  },
  description:
    'Monitor real-time cyber attacks, DDoS mitigations, and automated security probe incidents targeting Masdika Sidoarjo Edge Datacenter and global infrastructure in real-time.',
  alternates: {
    canonical: `${siteUrl}/threat-map`,
  },
  openGraph: {
    title: 'Live Cyber Threat Map - Real-Time Attack Intelligence',
    description:
      'Monitor real-time cyber attacks, DDoS mitigations, and automated security probe incidents targeting Masdika Sidoarjo Edge Datacenter and global infrastructure in real-time.',
    url: `${siteUrl}/threat-map`,
    siteName: 'Masdika',
    images: [
      {
        url: '/images/brand/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Live Cyber Threat Map - Real-Time Attack Intelligence',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Cyber Threat Map - Real-Time Attack Intelligence',
    description:
      'Monitor real-time cyber attacks, DDoS mitigations, and automated security probe incidents targeting Masdika Sidoarjo Edge Datacenter and global infrastructure in real-time.',
    images: ['/images/brand/og-image.webp'],
  },
};

export default function ThreatMapLayout({ children }: { children: React.ReactNode }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${siteUrl}/threat-map#webpage`,
    url: `${siteUrl}/threat-map`,
    name: 'Live Cyber Threat Map - Real-Time Attack Intelligence',
    description:
      'Real-time interactive cyber threat intelligence map visualizing incoming security probes and DDoS mitigation across Masdika infrastructure.',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'Masdika',
      url: siteUrl,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Threat Map',
          item: `${siteUrl}/threat-map`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />
      {children}
    </>
  );
}
