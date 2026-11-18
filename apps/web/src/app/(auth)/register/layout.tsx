import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create a Masdika Cloud & AI Gateway Account Today',
  description: 'Create a free Masdika account to deploy Cloud VPS, Managed Databases, Managed Apps, Object Storage, File CDN, and unified AI Gateway APIs with PAYG billing.',
  openGraph: {
    title: 'Create a Masdika Cloud & AI Gateway Account Today',
    description: 'Create a free Masdika account to deploy Cloud VPS, Managed Databases, Managed Apps, Object Storage, File CDN, and unified AI Gateway APIs with PAYG billing.',
    images: [OG_IMAGE_PATH],
  }
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
