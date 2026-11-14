import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Managed Applications | Admin Panel',
  description: 'Manage customer one-click applications, ingress routing, and Kubernetes pods across Masdika Cloud.',
};

export default function AdminAppsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
