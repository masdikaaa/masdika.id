import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Our commitment to protecting your privacy and personal data at Masdika Cloud.',
  openGraph: {
    title: 'Privacy Policy',
    description: 'Our commitment to protecting your privacy and personal data at Masdika Cloud.',
    images: [OG_IMAGE_PATH],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
