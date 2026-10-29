import { guarded, json, readBody } from '@/lib/adminApi';
import { readFile, writeFile } from '@/lib/store';
import { validateApps } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = guarded(async () => {
  const f = await readFile('content/apps.json');
  return json(f ? JSON.parse(f.text) : { bizloan: '', bizbook: '', bizkhata: '' });
});

export const PUT = guarded(
  async (req) => {
    const value = validateApps(await readBody(req));
    await writeFile('content/apps.json', JSON.stringify(value, null, 1) + '\n', 'Admin: update apps');
    return json({ ok: true });
  },
  { write: true }
);
