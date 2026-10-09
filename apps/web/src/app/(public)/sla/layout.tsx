import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service Level Agreement',
  description: 'Our commitment to providing reliable, highly-available cloud services.',
  openGraph: {
    title: 'Service Level Agreement',
    description: 'Our commitment to providing reliable, highly-available cloud services.',
    images: ['/og-image.webp'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
