import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import Icon from '@/components/Icon';
import { DESKS, deskHref } from '@/lib/desk';
import { getTools } from '@/lib/deskContent';
import { buildMeta, deskCrumbs } from '@/lib/seo';

export const metadata = buildMeta({
  path: '/desk/',
  title: 'BIZEASE DESK: Free Business and Finance Tools for Pakistan',
  description: 'BIZEASE DESK brings free business documents, compliance calendars, CFO tools, industry calculators and career tools for Pakistan together in one place.',
});

export default function Page() {
  const tools = getTools();
  return (
    <div className="page on" id="desk">
      <JsonLd json={deskCrumbs([{ name: 'Home', path: '/' }, { name: 'BIZEASE DESK', path: '/desk/' }])} />
      <div className="ph">
        <div className="w">
          <div className="crumb">
            <Link href="/">Home</Link> · BIZEASE DESK
          </div>
          <h1>BIZEASE DESK</h1>
          <p>Free business and finance tools for Pakistan. Everything runs in your browser, so your figures stay with you.</p>
        </div>
      </div>
      <section>
        <div className="w">
          <div className="g blogg dk-grid">
            {DESKS.map((d) => {
              const n = tools.filter((t) => t.desk === d.slug).length + (d.extra ? d.extra.length : 0);
              return (
                <Link key={d.slug} className="card" href={deskHref(d)}>
                  <div className="ic">
                    <Icon n={d.icon} />
                  </div>
                  <h3>{d.name}</h3>
                  <span className="d">{d.blurb}</span>
                  <span className="h">{d.soon ? 'Coming soon' : n ? `${n} tool${n > 1 ? 's' : ''} available` : 'Opening soon'}</span>
                </Link>
              );
            })}
          </div>
          <p className="dk-fine">These tools give estimates from what you enter. Tax and legal rules change, so confirm important decisions with a qualified adviser. Need one? <Link href="/contact/">Talk to BIZEASE SOLUTIONS</Link>.</p>
        </div>
      </section>
    </div>
  );
}
