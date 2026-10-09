import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Cloudflared Tunnels",
  description: "Add your domains, create tunnels, and securely expose your local services to the internet.",
  openGraph: {
    title: 'Cloudflared Tunnels',
    description: 'Add your domains, create tunnels, and securely expose your local services to the internet.',
    url: 'https://masdika.com/dashboard/cloudflared',
    siteName: 'Masdika',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Masdika Cloudflared Tunnels',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cloudflared Tunnels',
    description: 'Add your domains, create tunnels, and securely expose your local services to the internet.',
    images: ['/og-image.webp'],
  },
};

export default function CloudflaredLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
