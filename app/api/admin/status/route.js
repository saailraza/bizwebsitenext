import { guarded, json } from '@/lib/adminApi';
import { mode } from '@/lib/store';
import { configured } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = guarded(async () => json({ ok: true, storage: mode() }));
