export const ORIGIN = 'https://www.bizeasesolutions.online';
export const BRAND = 'BIZEASE SOLUTIONS';
export const MAIL = 'info@bizeasesolutions.online';
export const PHONE = '+92 308 4535456';
export const WA = '923084535456';
export const ADDRESS = 'Islamabad, Pakistan';

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about/', label: 'About' },
  {
    href: '/services/',
    label: 'Services',
    sub: [
      { href: '/services/', label: 'Pakistan' },
      { href: '/services/international/', label: 'International' },
    ],
  },
  {
    href: '/tax-calculators/',
    label: 'Calculators',
    sub: [
      { href: '/tax-calculators/', label: 'Tax Calculators' },
      { href: '/financial-calculators/', label: 'Financial Calculators' },
    ],
  },
  { href: '/applications/', label: 'Applications' },
  { href: '/resources/', label: 'Resources' },
  { href: '/blog/', label: 'Blog' },
  { href: '/careers/', label: 'Careers' },
  { href: '/contact/', label: 'Contact' },
];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// JSON that is safe to put inside an inline <script>
export function safeJson(o) {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(o).split('<').join('\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
}
