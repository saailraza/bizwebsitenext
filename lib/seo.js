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

// ---- BIZEASE DESK ----
export function toolJsonLd(t, desk) {
  const url = `${ORIGIN}/desk/${t.desk}/${t.slug}/`;
  const graph = [
    {
      '@type': 'WebApplication',
      name: t.name,
      url,
      description: t.description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (web browser)',
      inLanguage: 'en',
      dateModified: t.updated,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR' },
      publisher: { '@type': 'Organization', name: BRAND, url: ORIGIN + '/' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' },
        { '@type': 'ListItem', position: 2, name: 'BIZEASE DESK', item: ORIGIN + '/desk/' },
        { '@type': 'ListItem', position: 3, name: desk.name, item: `${ORIGIN}/desk/${desk.slug}/` },
        { '@type': 'ListItem', position: 4, name: t.name, item: url },
      ],
    },
  ];
  if (t.faq && t.faq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: t.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function deskCrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: ORIGIN + it.path })),
  };
}
