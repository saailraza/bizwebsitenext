import { guarded, json } from '@/lib/adminApi';
import { getLanding } from '@/lib/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// service pages that an article can link to as "Related services"
export const GET = guarded(async () =>
  json({
    items: getLanding().map((l) => ({
      href: `/${l.slug}/`,
      cat: 'Service',
      title: l.h1.replace(/ in Islamabad.*$| in Pakistan.*$|, .*$/, '').slice(0, 60),
      desc: String(l.description || '').slice(0, 118) + '…',
    })),
  })
);
