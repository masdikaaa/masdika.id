import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.masdika.id';

  // Public routes to be indexed by Google
  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/vps', priority: 0.95, changeFrequency: 'daily' },
    { path: '/app-catalog', priority: 0.95, changeFrequency: 'daily' },
    { path: '/services', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/blog', priority: 0.8, changeFrequency: 'daily' },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/portfolio', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/community', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/api-hub', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/file-cdn', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/series', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/skills', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/sla', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' },
  ].map((item) => ({
    url: `${baseUrl}${item.path}`,
    lastModified: new Date().toISOString(),
    changeFrequency: item.changeFrequency as any,
    priority: item.priority,
  }));

  return [...routes];
}
