import './globals.css';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = { title: 'Page not found | BIZEASE SOLUTIONS', robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Header />
      <main>
        <div className="page on" style={{ textAlign: 'center', padding: '80px 20px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BIZEASE SOLUTIONS logo" style={{ height: 70, margin: '0 auto 18px' }} />
          <h1>This page could not be found</h1>
          <p>The link may be old or mistyped. Use one of these to get back on track.</p>
          <p style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn" href="/">Home</Link>
            <Link className="btn o" href="/services/">Services</Link>
            <Link className="btn o" href="/tax-calculators/">Tax calculators</Link>
            <Link className="btn o" href="/contact/">Contact us</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
