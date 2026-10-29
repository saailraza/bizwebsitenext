import { guarded, json } from '@/lib/adminApi';
import { listDir, readFile } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = guarded(async () => {
  const names = await listDir('content/blog');
  const items = [];
  for (const n of names) {
    const f = await readFile('content/blog/' + n);
    if (!f) continue;
    try {
      const b = JSON.parse(f.text);
      items.push({ slug: b.slug, title: b.title, category: b.category, date: b.date, published: b.published !== false });
    } catch (e) {}
  }
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  return json({ items });
});
