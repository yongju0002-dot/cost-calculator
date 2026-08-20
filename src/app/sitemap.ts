import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/calculator`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/guide`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/breakeven`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/menus`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/ingredients`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/preps`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/supplies`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.1 },
  ];
}
