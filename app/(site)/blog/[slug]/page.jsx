import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { getBlog, getBlogs } from '@/lib/content';
import { buildMeta, postJsonLd } from '@/lib/seo';
import { fmtDate, WA, PHONE } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getBlogs().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const b = getBlog(slug);
  if (!b) return {};
  return buildMeta({ path: `/blog/${b.slug}/`, title: b.title, description: b.description, type: 'article' });
}

export default async function Page({ params }) {
  const { slug } = await params;
  const b = getBlog(slug);
  if (!b) notFound();
  const all = getBlogs().filter((x) => x.slug !== b.slug);
  const more = [...all.filter((x) => x.category === b.category), ...all.filter((x) => x.category !== b.category)].slice(0, 3);
  return (
    <div className="page on" id="blogpost">
      <JsonLd json={postJsonLd(b)} />
      <div className="ph">
        <div className="w">
          <div className="crumb">
            <Link href="/">Home</Link> · <Link href="/blog/">Blog</Link> · {b.category}
          </div>
          <h1>{b.title}</h1>
        </div>
      </div>
      <section>
        <div className="w">
          <article className="art">
            <div className="meta">
              <span className="cat">{b.category}</span>
              <time dateTime={b.date}>{fmtDate(b.date)}</time>
              <span>By BIZEASE SOLUTIONS</span>
            </div>
            <p className="lead" dangerouslySetInnerHTML={{ __html: b.lead }} />
            <div dangerouslySetInnerHTML={{ __html: b.body }} />
            {b.tags ? <p className="tg">{b.tags}</p> : null}
            <div className="cta">
              <h3>Need help with this?</h3>
              <p>Talk to a BIZEASE SOLUTIONS adviser. The first consultation is free.</p>
              <Link className="btn" href="/contact/">
                Free Consultation
              </Link>
              <a className="btn o" href={`https://wa.me/${WA}`} target="_blank" rel="noopener">
                WhatsApp us
              </a>
            </div>
            <p className="note">This article is general information, not legal, tax or financial advice. Rules and rates change, so confirm your situation with a qualified adviser.</p>
            {b.related && b.related.length > 0 && (
              <div className="rel">
                <h3>Related services</h3>
                <div className="g blogg">
                  {b.related.map((r) => (
                    <Link key={r.href} className="card" href={r.href}>
                      <span className="cat">{r.cat}</span>
                      <h3>{r.title}</h3>
                      <span className="d">{r.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {more.length > 0 && (
              <div className="rel">
                <h3>More articles</h3>
                <div className="g blogg">
                  {more.map((r) => (
                    <Link key={r.slug} className="card" href={`/blog/${r.slug}/`}>
                      <span className="cat">{r.category}</span>
                      <h3>{r.title}</h3>
                      <span className="d">{fmtDate(r.date)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <p style={{ marginTop: 30 }}>
              <Link className="btn dk" href="/blog/">
                ← All articles
              </Link>
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
