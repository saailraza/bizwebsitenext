'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { NAV } from '@/lib/site';

function isActive(href, path) {
  if (href === '/') return path === '/';
  if (href === '/tax-calculators/') return path.startsWith('/tax-calculators/') || path.startsWith('/financial-calculators/');
  return path.startsWith(href);
}

export default function Header() {
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [shut, setShut] = useState('');

  useEffect(() => {
    setOpen(false);
  }, [path]);

  function toggleTheme() {
    const r = document.documentElement;
    const dark = r.dataset.theme === 'dark' || (!r.dataset.theme && window.matchMedia('(prefers-color-scheme:dark)').matches);
    r.dataset.theme = dark ? 'light' : 'dark';
  }

  return (
    <header>
      <div className="w bar">
        <Link className="logo" href="/" aria-label="BIZEASE SOLUTIONS home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-img" src="/logo.png" alt="BIZEASE SOLUTIONS logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <span className="lt" style={{ display: 'flex' }}>
            <span>
              <b>BIZEASE</b>
              <small>SOLUTIONS</small>
            </span>
          </span>
        </Link>
        <nav id="nav" className={open ? 'open' : ''}>
          {NAV.map((n) =>
            n.sub ? (
              <div
                key={n.href}
                className={'dd' + (shut === n.href ? ' shut' : '')}
                onClick={(e) => {
                  if (e.target.closest && e.target.closest('a')) {
                    setShut(n.href);
                    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
                  }
                }}
                onMouseLeave={() => setShut('')}
              >
                <Link className={'t' + (isActive(n.href, path) ? ' on' : '')} href={n.href}>
                  {n.label} <span aria-hidden="true">▾</span>
                </Link>
                <div className="dm">
                  {n.sub.map((s) => (
                    <Link key={s.href} href={s.href}>
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={n.href} className={'t' + (isActive(n.href, path) ? ' on' : '')} href={n.href}>
                {n.label}
              </Link>
            )
          )}
        </nav>
        <div className="hact">
          <button className="tbtn" id="th" aria-label="Toggle theme" title="Toggle theme" onClick={toggleTheme}>
            🌓
          </button>
          <Link className="hbtn cfob" href="/cfo-desk/" title="CFO Desk: free financial analysis">
            <Icon n="trend" s={16} />
            CFO<span className="cw"> Desk</span>
          </Link>
          <Link className="hbtn cta" href="/contact/">
            Free Consultation
          </Link>
          <button id="mb" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
