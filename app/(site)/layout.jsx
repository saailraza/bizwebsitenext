import '../globals.css';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SoftLinks from '@/components/SoftLinks';
import Icon from '@/components/Icon';
import { getBlogs, getStaticBotSlugs } from '@/lib/content';
import { botSections } from '@/lib/botIndex';
import { safeJson } from '@/lib/site';

export default function SiteLayout({ children }) {
  // blogs added in the admin panel after the original 15 are made searchable for BIZBOT
  const known = new Set(getStaticBotSlugs());
  const extra = getBlogs()
    .filter((b) => !known.has(b.slug))
    .map((b) => ({
      slug: b.slug,
      title: b.title,
      cat: b.category,
      date: b.date,
      tags: (b.tags || '').split(/\s+/).filter(Boolean).map((t) => t.replace(/^#/, '')),
      lead: String(b.lead || b.description || '').replace(/<[^>]+>/g, ''),
      secs: botSections(b.body),
    }));
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <a className="wa" href="https://wa.me/923084535456?text=Hi!%20I'd%20like%20to%20know%20more%20about%20your%20services." target="_blank" rel="noopener">
        <Icon n="msg" s={20} />
        WhatsApp
      </a>
      <SoftLinks />
      <script dangerouslySetInnerHTML={{ __html: `window.__BIZBOT_EXTRA=${safeJson(extra)};` }} />
      <Script src="/legacy/bizbot.js" strategy="lazyOnload" />
    </>
  );
}
