import { legacyRoute, legacyMeta } from '@/lib/legacy';
import { getJobs } from '@/lib/content';
import { esc } from '@/lib/site';

export function generateMetadata() {
  return legacyMeta('/careers/');
}

function openings() {
  const jobs = getJobs();
  if (!jobs.length) return '';
  const cards = jobs
    .map(
      (j) =>
        `<div class="c"><div class="ico"><i data-ic="brief" data-s="26"></i></div><h3>${esc(j.title)}</h3>` +
        `<p style="color:var(--mute);margin:0 0 6px;font-size:.88rem">${esc([j.location, j.type].filter(Boolean).join(' · '))}</p>` +
        (j.summary ? `<p>${esc(j.summary)}</p>` : '') +
        `<a class="btn" href="#jfw" style="margin-top:10px">Apply for this role</a></div>`
    )
    .join('');
  return `<section><div class="w"><div class="sh c0"><div class="ey">Open positions</div><h2>Current openings</h2></div><div class="g fc">${cards}</div></div></section>`;
}

export default function Page() {
  // open positions (managed in the admin panel) go between "Why join us" and the application form
  return legacyRoute('careers', '/careers/', (html) => html.replace('<section class="alt">', openings() + '<section class="alt">'));
}
