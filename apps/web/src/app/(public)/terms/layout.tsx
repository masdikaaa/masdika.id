import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using Masdika Cloud services.',
  openGraph: {
    title: 'Terms of Service',
    description: 'Terms and conditions for using Masdika Cloud services.',
    images: ['/og-image.webp'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
