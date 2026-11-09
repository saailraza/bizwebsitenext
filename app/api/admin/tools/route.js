import { guarded, json } from '@/lib/adminApi';
import { listDir, readFile } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = guarded(async () => {
  const names = await listDir('content/tools');
  const items = [];
  for (let i = 0; i < names.length; i += 8) {
    const part = await Promise.all(
      names.slice(i, i + 8).map(async (n) => {
        const f = await readFile('content/tools/' + n);
        if (!f) return null;
        try {
          const t = JSON.parse(f.text);
          return { slug: t.slug, name: t.name, desk: t.desk, hidden: t.status === 'hidden', updated: t.updated || '' };
        } catch (e) {
          return null;
        }
      })
    );
    part.forEach((x) => x && x.slug && items.push(x));
  }
  items.sort((a, b) => (a.desk + a.name < b.desk + b.name ? -1 : 1));
  return json({ items });
});
