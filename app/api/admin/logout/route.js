import { json } from '@/lib/adminApi';
import { cookieHeader } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
}
