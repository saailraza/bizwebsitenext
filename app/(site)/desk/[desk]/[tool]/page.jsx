import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ToolHost from '@/components/desk/ToolHost';
import { DESKS, deskBySlug, toolHref } from '@/lib/desk';
import { getTools, getTool, getRates } from '@/lib/deskContent';
import { getBlog } from '@/lib/content';
import { buildMeta, toolJsonLd } from '@/lib/seo';
import { fmtDate, WA } from '@/lib/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return getTools().map((t) => ({ desk: t.desk, tool: t.slug }));
}

export async function generateMetadata({ params }) {
  const { desk, tool } = await params;
  const t = getTool(desk, tool);
  if (!t) return {};
  return buildMeta({ path: toolHref(t), title: t.title, description: t.description });
}

export default async function Page({ params }) {
  const { desk, tool } = await params;
  const t = getTool(desk, tool);
  const d = deskBySlug(desk);
  if (!t || !d) notFound();
  const all = getTools();
  const relTools = ((t.related && t.related.tools) || []).map((s) => all.find((x) => x.slug === s)).filter(Boolean);
  const sameDesk = all.filter((x) => x.desk === t.desk && x.slug !== t.slug);
  const more = [...relTools, ...sameDesk.filter((x) => !relTools.includes(x))].slice(0, 3);
  const blogs = ((t.related && t.related.blogs) || []).map(getBlog).filter(Boolean);
  const services = (t.related && t.related.services) || [];
  return (
    <div className="page on" id={'tool-' + t.slug}>
      <JsonLd json={toolJsonLd(t, d)} />
      <div className="ph">
        <div className="w">
          <div className="crumb">
            <Link href="/">Home</Link> · <Link href="/desk/">BIZEASE DESK</Link> · <Link href={`/desk/${d.slug}/`}>{d.name}</Link>
          </div>
          <h1>{t.h1}</h1>
          <p>{t.lead}</p>
        </div>
      </div>
      <section>
        <div className="w dk-wrap">
          <div className="dk-main">
            <ToolHost id={t.component} rates={getRates()} />
            <article className="art dk-art">
              {(t.intro || []).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {t.how && t.how.length > 0 && (
                <>
                  <h2>How it works</h2>
                  <ul>
                    {t.how.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </>
              )}
              {t.example && (
                <>
                  <h2>Example</h2>
                  <p>{t.example}</p>
                </>
              )}
              {t.mistakes && t.mistakes.length > 0 && (
                <>
                  <h2>Common mistakes</h2>
                  <ul>
                    {t.mistakes.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </>
              )}
              {t.faq && t.faq.length > 0 && (
                <>
                  <h2>Frequently asked questions</h2>
                  {t.faq.map((f, i) => (
                    <details key={i} className="dk-faq">
                      <summary>{f.q}</summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </>
              )}
              <p className="note">
                {t.disclaimer} Last updated {fmtDate(t.updated)}.
              </p>
            </article>
            {(blogs.length > 0 || services.length > 0 || more.length > 0) && (
              <div className="dk-rel">
                {more.length > 0 && (
                  <div>
                    <h3>Related tools</h3>
                    <ul>
                      {more.map((x) => (
                        <li key={x.slug}>
                          <Link href={toolHref(x)}>{x.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {blogs.length > 0 && (
                  <div>
                    <h3>Read more</h3>
                    <ul>
                      {blogs.map((b) => (
                        <li key={b.slug}>
                          <Link href={`/blog/${b.slug}/`}>{b.title}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {services.length > 0 && (
                  <div>
                    <h3>Need an expert?</h3>
                    <ul>
                      {services.map((s) => (
                        <li key={s.href}>
                          <Link href={s.href}>{s.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="cta">
              <h3>Want this done for you?</h3>
              <p>Talk to a BIZEASE SOLUTIONS adviser. The first consultation is free.</p>
              <Link className="btn" href="/contact/">
                Free Consultation
              </Link>
              <a className="btn o" href={`https://wa.me/${WA}`} target="_blank" rel="noopener">
                WhatsApp us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
