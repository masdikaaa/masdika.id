import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Virtual Private Cloud',
  description: 'Manage your isolated private networks, subnets, and configure secure VPC peerings.',
  openGraph: {
    title: 'Virtual Private Cloud',
    description: 'Manage your isolated private networks, subnets, and configure secure VPC peerings.',
    url: 'https://masdika.com/dashboard/vpc',
  }
};

export default function VpcIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
