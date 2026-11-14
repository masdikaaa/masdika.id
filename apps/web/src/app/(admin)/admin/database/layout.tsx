import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Managed Databases | Admin Panel',
  description: 'Manage customer MySQL and PostgreSQL database instances, telemetry, and Kubernetes cluster status.',
};

export default function AdminDatabaseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
