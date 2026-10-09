import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new Masdika account to start managing your services and cloud infrastructure.',
  openGraph: {
    title: 'Register',
    description: 'Create a new Masdika account to start managing your services and cloud infrastructure.',
    images: ['/og-image.webp'],
  }
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
