import { configured, verifyToken, getCookie, COOKIE } from './auth';

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

// requests that change something must come from the admin page itself
function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch (e) {
    return false;
  }
}

export class ApiError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Wraps a handler: setup check, same-origin check for writes, sign-in check, safe errors.
export function guarded(fn, { write = false, auth = true } = {}) {
  return async (req, ctx) => {
    try {
      if (!configured()) throw new ApiError('Admin is not set up yet. Add ADMIN_PASSWORD and ADMIN_SECRET in Vercel, then redeploy.', 503);
      if (write && !sameOrigin(req)) throw new ApiError('Blocked: request did not come from the admin page.', 403);
      if (auth && !(await verifyToken(getCookie(req, COOKIE)))) throw new ApiError('Please sign in.', 401);
      return await fn(req, ctx || {});
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message, ...e.extra }, e.status);
      console.error('admin api error:', e && e.message);
      return json({ error: 'Something went wrong on the server. Please try again.' }, 500);
    }
  };
}

export async function readBody(req, maxBytes = 400000) {
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError('That is too large to save (limit about 400 KB).', 413);
  try {
    return JSON.parse(text || '{}');
  } catch (e) {
    throw new ApiError('Bad request.', 400);
  }
}
