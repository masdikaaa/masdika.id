import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In to Your Masdika Cloud & AI Gateway Account',
  description: 'Sign in to your Masdika account to manage Cloud VPS, Managed Databases, Managed Apps, Object Storage, File CDN, and unified AI Gateway API keys securely.',
  openGraph: {
    title: 'Sign In to Your Masdika Cloud & AI Gateway Account',
    description: 'Sign in to your Masdika account to manage Cloud VPS, Managed Databases, Managed Apps, Object Storage, File CDN, and unified AI Gateway API keys securely.',
    images: [OG_IMAGE_PATH],
  }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
