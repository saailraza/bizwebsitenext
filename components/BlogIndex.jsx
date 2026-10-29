'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { fmtDate } from '@/lib/site';

export default function BlogIndex({ posts }) {
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');

  const cats = useMemo(() => {
    const m = new Map();
    posts.forEach((p) => m.set(p.category, (m.get(p.category) || 0) + 1));
    return [...m.entries()];
  }, [posts]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return posts.filter((p) => (!cat || p.category === cat) && (!s || (p.title + ' ' + p.description + ' ' + p.category + ' ' + p.tags).toLowerCase().includes(s)));
  }, [posts, cat, q]);

  return (
    <>
      <div className="ph">
        <div className="w">
          <div className="crumb">
            <Link href="/">Home</Link> · Blog
          </div>
          <h1>Insights on tax, accounting &amp; business</h1>
          <p>
            Practical guides on Pakistan taxation, SECP registration, audit, ERP and cloud accounting, and company formation in the UAE, Saudi Arabia, Bahrain, the UK and the US.
          </p>
        </div>
      </div>
      <section>
        <div className="w">
          <div className="bl-tools">
            <div className="tabs" id="bt">
              <button className={cat === '' ? 'on' : ''} onClick={() => setCat('')}>
                All ({posts.length})
              </button>
              {cats.map(([c, n]) => (
                <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
                  {c} ({n})
                </button>
              ))}
            </div>
            <input id="bq" type="search" placeholder="Search articles…" aria-label="Search articles" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="g blogg" id="bg">
            {shown.map((p, i) => (
              <Link key={p.slug} className={'card' + (i === 0 && !cat && !q ? ' ft' : '')} href={`/blog/${p.slug}/`}>
                <span className="cat">{p.category}</span>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <span className="d">
                  <time dateTime={p.date}>{fmtDate(p.date)}</time>
                </span>
                <span className="h">{p.tags}</span>
              </Link>
            ))}
          </div>
          {shown.length === 0 && (
            <p className="bl-empty" style={{ display: 'block' }}>
              No articles match your search. <Link href="/contact/" style={{ color: 'var(--teal)' }}>Ask our team instead →</Link>
            </p>
          )}
        </div>
      </section>
      <section className="alt">
        <div className="w">
          <div className="sh c0">
            <div className="ey">Need help?</div>
            <h2>Have a tax or accounting question?</h2>
            <p>Our advisers in Islamabad reply on WhatsApp, phone or email, free of charge for the first consultation.</p>
          </div>
          <p style={{ textAlign: 'center' }}>
            <Link className="btn dk" href="/contact/">
              Free Consultation
            </Link>
            <Link className="btn dk" href="/tax-calculators/" style={{ background: 'transparent', color: 'var(--brand)', border: '1.5px solid var(--brand)', boxShadow: 'none' }}>
              Try Free Calculators
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
