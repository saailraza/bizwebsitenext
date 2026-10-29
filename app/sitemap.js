import { ORIGIN } from '@/lib/site';
import { getRoutes, getLanding, getBlogs } from '@/lib/content';

export const dynamic = 'force-static';

export default function sitemap() {
  const now = new Date();
  const items = [];
  Object.keys(getRoutes()).forEach((p) => {
    const top = p === '/' ? 1 : p.split('/').filter(Boolean).length === 1 ? 0.8 : 0.7;
    items.push({ url: ORIGIN + p, lastModified: now, changeFrequency: 'monthly', priority: top });
  });
  getLanding().forEach((l) => items.push({ url: `${ORIGIN}/${l.slug}/`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 }));
  items.push({ url: ORIGIN + '/blog/', lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
  getBlogs().forEach((b) => items.push({ url: `${ORIGIN}/blog/${b.slug}/`, lastModified: new Date(b.updated || b.date), changeFrequency: 'monthly', priority: 0.6 }));
  const seen = new Set();
  return items.filter((i) => (seen.has(i.url) ? false : seen.add(i.url)));
}
