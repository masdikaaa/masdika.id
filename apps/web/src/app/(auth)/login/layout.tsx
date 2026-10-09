import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Masdika account to access your personalized dashboard and manage your services.',
  openGraph: {
    title: 'Login',
    description: 'Sign in to your Masdika account to access your personalized dashboard and manage your services.',
    images: ['/og-image.webp'],
  }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
