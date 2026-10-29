import { ORIGIN } from '@/lib/site';
import { getJobs, getApps } from '@/lib/content';
import { safeJson } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(ORIGIN),
  applicationName: 'BIZEASE SOLUTIONS',
  authors: [{ name: 'BIZEASE SOLUTIONS' }],
  keywords:
    'accounting firm Pakistan, tax consultant Islamabad, company registration Pakistan, SECP registration, FBR tax filing, NTN registration, bookkeeping services, audit services Pakistan, UAE company formation, Dubai business setup, Saudi Arabia company setup, Bahrain company formation, UK Ltd company, US LLC for non residents, withholding tax Pakistan, ERP consultancy, payroll services',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  other: { 'geo.region': 'PK-IS', 'geo.placename': 'Islamabad' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#173f2b',
};

export default function RootLayout({ children }) {
  // data the calculators / careers / applications scripts read (managed from the admin panel)
  const jobs = getJobs().map((j) => ({ title: j.title }));
  const apps = getApps();
  const cfg = { formsApi: process.env.NEXT_PUBLIC_FORMS_API || '' };
  const boot = `window.BIZ_APPS=${safeJson(apps)};window.BIZ_JOBS=${safeJson(jobs)};window.BIZ_CFG=${safeJson(cfg)};`;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
