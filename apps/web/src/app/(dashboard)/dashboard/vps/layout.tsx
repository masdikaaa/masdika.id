import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cloud VPS',
  description: 'Manage your virtual private servers, power states, and view resource usage.',
  openGraph: {
    title: 'Cloud VPS',
    description: 'Manage your virtual private servers, power states, and view resource usage.',
    url: 'https://masdika.com/dashboard/vps',
  }
};

export default function VpsIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
