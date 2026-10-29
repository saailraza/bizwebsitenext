import { json, readBody, ApiError } from '@/lib/adminApi';
import { configured, checkPassword, makeToken, cookieHeader, COOKIE_MAX_AGE } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// slows down password guessing (per server instance; Vercel may run several)
const tries = new Map();
function limited(ip) {
  const now = Date.now();
  const rec = (tries.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  tries.set(ip, rec);
  if (tries.size > 500) tries.clear();
  return rec.length >= 8;
}
function note(ip) {
  tries.set(ip, [...(tries.get(ip) || []), Date.now()]);
}

export async function POST(req) {
  try {
    if (!configured()) throw new ApiError('Admin is not set up yet. Add ADMIN_PASSWORD (8+ characters) and ADMIN_SECRET (16+ characters) in Vercel, then redeploy.', 503);
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (!origin || new URL(origin).host !== host) throw new ApiError('Blocked: request did not come from the admin page.', 403);
    const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
    if (limited(ip)) throw new ApiError('Too many attempts. Please wait 15 minutes and try again.', 429);
    const body = await readBody(req, 2000);
    if (!(await checkPassword(body.password))) {
      note(ip);
      await new Promise((r) => setTimeout(r, 600));
      throw new ApiError('Wrong password.', 401);
    }
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader(await makeToken(), COOKIE_MAX_AGE) });
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
