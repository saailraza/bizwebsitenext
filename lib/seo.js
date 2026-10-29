import { ORIGIN, BRAND } from './site';
import { getRoute } from './content';

export function buildMeta({ path, title, description, type = 'website', noindex = false }) {
  const full = `${BRAND} | ${title}`;
  const url = ORIGIN + path;
  return {
    title: { absolute: full },
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      siteName: BRAND,
      title: full,
      description,
      url,
      locale: 'en_PK',
      images: [{ url: ORIGIN + '/og-image.png', width: 1200, height: 630, alt: 'BIZEASE SOLUTIONS: tax, accounting, audit, ERP and company registration' }],
    },
    twitter: { card: 'summary_large_image', title: full, description, images: [ORIGIN + '/og-image.png'] },
  };
}

export function routeMeta(path) {
  const r = getRoute(path);
  if (!r) return buildMeta({ path, title: 'Page', description: '' });
  return buildMeta({ path, title: r.title, description: r.description });
}

export function postJsonLd(b) {
  const url = `${ORIGIN}/blog/${b.slug}/`;
  const kw = (b.tags || '').split(/\s+/).filter(Boolean).map((t) => t.replace(/^#/, ''));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: b.title,
        description: b.description,
        datePublished: b.date,
        dateModified: b.updated || b.date,
        mainEntityOfPage: url,
        image: ORIGIN + '/logo.png',
        keywords: kw.join(', '),
        author: { '@type': 'Organization', name: BRAND },
        publisher: { '@type': 'Organization', name: BRAND, logo: { '@type': 'ImageObject', url: ORIGIN + '/logo.png' } },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: ORIGIN + '/blog/' },
          { '@type': 'ListItem', position: 3, name: b.title, item: url },
        ],
      },
    ],
  };
}
