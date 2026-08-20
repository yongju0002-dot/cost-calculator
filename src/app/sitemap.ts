import type { MetadataRoute } from 'next';
import { CATALOG } from '@/lib/market/catalog';
import { itemSlug } from '@/lib/market/slug';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // 시세는 매일 갱신되는 자료라, 품목마다 색인 가능한 페이지를 하나씩 넣는다.
  const priceItemUrls: MetadataRoute.Sitemap = CATALOG.map((item) => ({
    url: `${SITE_URL}/prices/${itemSlug(item)}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/calculator`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/guide`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/prices`, lastModified, changeFrequency: 'daily', priority: 0.8 },
    ...priceItemUrls,
    { url: `${SITE_URL}/menus`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/ingredients`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/preps`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/supplies`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.1 },
  ];
}
