import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { getLanding } from '@/lib/content';
import { buildMeta } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return getLanding().map((l) => ({ landing: l.slug }));
}

const find = (s) => getLanding().find((l) => l.slug === s);

export async function generateMetadata({ params }) {
  const { landing } = await params;
  const l = find(landing);
  if (!l) return {};
  return buildMeta({ path: `/${l.slug}/`, title: l.title, description: l.description });
}

export default async function Page({ params }) {
  const { landing } = await params;
  const l = find(landing);
  if (!l) notFound();
  return (
    <div className="page on" id="landing">
      {l.jsonld.map((j, i) => (
        <JsonLd key={i} json={j} />
      ))}
      <div className="ph">
        <div className="w">
          <div className="crumb" dangerouslySetInnerHTML={{ __html: l.crumb }} />
          <h1>{l.h1}</h1>
          <p dangerouslySetInnerHTML={{ __html: l.intro }} />
          {l.actions ? <div className="apj" dangerouslySetInnerHTML={{ __html: l.actions }} /> : null}
        </div>
      </div>
      <section>
        <div className="w">
          <article className="art" dangerouslySetInnerHTML={{ __html: l.article }} />
        </div>
      </section>
    </div>
  );
}
