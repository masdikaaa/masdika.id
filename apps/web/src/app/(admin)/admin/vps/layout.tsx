import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Proxmox VPS Management | Admin Panel',
  description: 'Manage Proxmox servers, VPS nodes, storage, IP pools, OS templates, and customer VPS instances.',
};

export default function AdminVpsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
