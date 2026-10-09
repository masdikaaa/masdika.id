import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Lab',
  description: 'Interactive API testing environment for Masdika REST APIs',
};

export default function ApiLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
