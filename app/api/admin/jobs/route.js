import { guarded, json, readBody } from '@/lib/adminApi';
import { readFile, writeFile } from '@/lib/store';
import { validateJobs } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = guarded(async () => {
  const f = await readFile('content/jobs.json');
  return json(f ? JSON.parse(f.text) : { items: [] });
});

export const PUT = guarded(
  async (req) => {
    const value = validateJobs(await readBody(req));
    await writeFile('content/jobs.json', JSON.stringify(value, null, 1) + '\n', 'Admin: update jobs');
    return json({ ok: true });
  },
  { write: true }
);
