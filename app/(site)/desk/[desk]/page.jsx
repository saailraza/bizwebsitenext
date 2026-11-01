import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { DESKS, deskBySlug, toolHref } from '@/lib/desk';
import { getDeskTools } from '@/lib/deskContent';
import { buildMeta, deskCrumbs } from '@/lib/seo';

export const dynamicParams = false;
export const generateStaticParams = () => DESKS.map((d) => ({ desk: d.slug }));

export async function generateMetadata({ params }) {
  const { desk } = await params;
  const d = deskBySlug(desk);
  if (!d) return {};
  return buildMeta({ path: `/desk/${d.slug}/`, title: `${d.name} | BIZEASE DESK`, description: d.blurb });
}

export default async function Page({ params }) {
  const { desk } = await params;
  const d = deskBySlug(desk);
  if (!d) notFound();
  const tools = getDeskTools(d.slug);
  const extra = d.extra || [];
  return (
    <div className="page on" id={'desk-' + d.slug}>
      <JsonLd json={deskCrumbs([{ name: 'Home', path: '/' }, { name: 'BIZEASE DESK', path: '/desk/' }, { name: d.name, path: `/desk/${d.slug}/` }])} />
      <div className="ph">
        <div className="w">
          <div className="crumb">
            <Link href="/">Home</Link> · <Link href="/desk/">BIZEASE DESK</Link> · {d.name}
          </div>
          <h1>{d.name}</h1>
          <p>{d.blurb}</p>
        </div>
      </div>
      <section>
        <div className="w">
          {tools.length + extra.length > 0 ? (
            <div className="g blogg dk-grid">
              {extra.map((x) => (
                <Link key={x.href} className="card" href={x.href}>
                  <h3>{x.name}</h3>
                  <span className="d">{x.desc}</span>
                </Link>
              ))}
              {tools.map((t) => (
                <Link key={t.slug} className="card" href={toolHref(t)}>
                  <h3>{t.name}</h3>
                  <span className="d">{t.lead}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p>{d.soon ? 'This desk is not open yet.' : 'The first tools in this desk are being added.'}</p>
          )}
          {d.planned && d.planned.length > 0 && (
            <div className="dk-next">
              <h2>{d.soon ? 'Planned' : 'Coming next'}</h2>
              <p>{d.planned.join(', ')}.</p>
            </div>
          )}
          <p className="dk-fine">
            <Link href="/desk/">All BIZEASE DESK tools</Link> · <Link href="/contact/">Free consultation</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
