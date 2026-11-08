import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.masdika.id';

export const metadata: Metadata = {
  title: {
    absolute: 'Live Cyber Threat Map - Real-Time Attack Intelligence',
  },
  description:
    'Real-time interactive cyber threat intelligence map. Monitor live DDoS attacks, vulnerability probes, and malicious exploit vectors mitigated across Masdika Sidoarjo Edge Datacenter and global upstream networks.',
  alternates: {
    canonical: `${siteUrl}/threat-map`,
  },
  openGraph: {
    title: 'Live Cyber Threat Map - Real-Time Attack Intelligence | Masdika',
    description:
      'Monitor real-time cyber attacks, automated exploit probes, and global threat vectors mitigated by Masdika Edge Datacenter infrastructure.',
    url: `${siteUrl}/threat-map`,
    siteName: 'Masdika',
    images: ['/images/brand/og-image.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Cyber Threat Map - Real-Time Attack Intelligence | Masdika',
    description:
      'Monitor real-time cyber attacks, automated exploit probes, and global threat vectors mitigated by Masdika Edge Datacenter infrastructure.',
    images: ['/images/brand/og-image.webp'],
  },
};

export default function ThreatMapLayout({ children }: { children: React.ReactNode }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${siteUrl}/threat-map#webpage`,
    url: `${siteUrl}/threat-map`,
    name: 'Live Cyber Threat Map | Masdika',
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

