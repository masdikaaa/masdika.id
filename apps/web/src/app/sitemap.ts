import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.masdika.id';

  // Public routes to be indexed by Google
  const routes = [
    '',
    '/about',
    '/services',
    '/portfolio',
    '/blog',
    '/community',
    '/contact',
    '/api-hub',
    '/file-cdn',
    '/k3s',

    '/opportunities',
    '/privacy',
    '/resume',
    '/series',
    '/shortener',
    '/skills',
    '/sla',
    '/terms',
    '/vps',
    '/vacancies',
    '/events',
    '/login',
    '/register'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as any,
    priority: route === '' ? 1 : 0.8,
  }));

  return [...routes];
}
