import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Masdika account to access your personalized dashboard and manage your services.',
  openGraph: {
    title: 'Login',
    description: 'Sign in to your Masdika account to access your personalized dashboard and manage your services.',
    images: [OG_IMAGE_PATH],
  }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
