import { guarded, json, readBody, ApiError } from '@/lib/adminApi';
import { readFile, writeFile } from '@/lib/store';
import { validateRates } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const load = async () => {
  const f = await readFile('content/rates.json');
  if (!f) throw new ApiError('rates.json was not found in the repository.', 404);
  return JSON.parse(f.text);
};

export const GET = guarded(async () => {
  const r = await load();
  const c = r.calendar || {};
  return json({
    updated: r.updated || '',
    federal: r.salesTax ? r.salesTax.federal : '',
    federalSource: (r.salesTax && r.salesTax.source) || '',
    federalChecked: (r.salesTax && r.salesTax.checked) || '',
    calChecked: c.checked || '',
    rules: c.rules || {},
    extensions: c.extensions || [],
  });
});

export const PUT = guarded(
  async (req) => {
    const current = await load();
    const value = validateRates(await readBody(req), current);
    await writeFile('content/rates.json', JSON.stringify(value, null, 2) + '\n', 'Admin: update rates and dates');
    return json({ ok: true });
  },
  { write: true }
);
