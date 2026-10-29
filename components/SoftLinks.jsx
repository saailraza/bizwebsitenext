'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Plain <a href="/..."> links inside page content (calculators, blog text, landing pages)
// open as fast in-app navigations, like <Link>. Also lets the legacy calculator scripts switch pages.
export default function SoftLinks() {
  const router = useRouter();
  useEffect(() => {
    window.BZ_GO = (p) => router.push(p);
    function onClick(e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const href = a.getAttribute('href') || '';
      if (href.charAt(0) !== '/' || href.charAt(1) === '/') return;
      const p = href.split(/[?#]/)[0];
      if (/\.[a-z0-9]{2,5}$/i.test(p) || p.startsWith('/admin') || p.startsWith('/api')) return;
      e.preventDefault();
      if (window.location.pathname !== p) router.push(href);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      window.BZ_GO = null;
    };
  }, [router]);
  return null;
}
