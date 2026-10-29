'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ensureLegacy } from '@/lib/legacyLoader';

// Server-rendered page shell + the original calculator/tools script that fills it in.
export default function LegacyPage({ id, html }) {
  const path = usePathname();
  useEffect(() => {
    let off = false;
    ensureLegacy(id === 'cfo')
      .then(() => {
        if (!off && window.BZ) window.BZ.route();
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [path, id]);
  return <div className="page on" id={id} dangerouslySetInnerHTML={{ __html: html }} suppressHydrationWarning />;
}
