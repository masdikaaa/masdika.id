import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'App Catalog',
  description: 'Explore one-click cloud applications and pre-configured VPS templates on Masdika Cloud.',
  openGraph: {
    title: 'App Catalog',
    description: 'Explore one-click cloud applications and pre-configured VPS templates on Masdika Cloud.',
    url: 'https://masdika.com/dashboard/catalog-apps',
  },
};

export default function CatalogAppsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
