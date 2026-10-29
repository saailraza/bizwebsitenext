import { guarded, json, readBody } from '@/lib/adminApi';
import { readFile, writeFile } from '@/lib/store';
import { validateBizbot } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILE = 'public/bizbot-config.json';

async function current() {
  const f = await readFile(FILE);
  try {
    return f ? JSON.parse(f.text) : { enabled: false, api: '' };
  } catch (e) {
    return { enabled: false, api: '' };
  }
}

export const GET = guarded(async () => json(await current()));

export const PUT = guarded(
  async (req) => {
    const value = validateBizbot(await readBody(req), await current());
    await writeFile(FILE, JSON.stringify(value, null, 2) + '\n', 'Admin: update BIZBOT settings');
    return json({ ok: true });
  },
  { write: true }
);
