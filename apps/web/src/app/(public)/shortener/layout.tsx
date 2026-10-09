import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'URL Shortener - Manage Custom Links',
  description: 'Create, manage, and track short custom URLs with Masdika URL Shortener. Featuring click analytics, secure root domains, and full privacy.',
  openGraph: {
    title: 'URL Shortener - Manage Custom Links',
    description: 'Create, manage, and track short custom URLs with Masdika URL Shortener. Featuring click analytics, secure root domains, and full privacy.',
    url: 'https://masdika.id/shortener',
    siteName: 'Masdika',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Masdika URL Shortener',
      },
    ],
    locale: 'en_US',
    type: 'website',
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
};

export default function ShortenerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
