import { OG_IMAGE_PATH } from "@/lib/og-image";
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
        url: OG_IMAGE_PATH,
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
    images: [OG_IMAGE_PATH],
  },
};

export default function CloudflaredLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
