import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new Masdika account to start managing your services and cloud infrastructure.',
  openGraph: {
    title: 'Register',
    description: 'Create a new Masdika account to start managing your services and cloud infrastructure.',
    images: [OG_IMAGE_PATH],
  }
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
