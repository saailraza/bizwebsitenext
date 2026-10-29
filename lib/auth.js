// Admin sign-in: one password, a signed cookie, no database.
// Uses Web Crypto only, so it works on every Vercel runtime.
const enc = new TextEncoder();
const HOURS = 8;
export const COOKIE = 'bz_admin';

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
function same(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function configured() {
  const pw = process.env.ADMIN_PASSWORD || '';
  const sec = process.env.ADMIN_SECRET || '';
  return pw.length >= 8 && sec.length >= 16;
}

// compares hashes, so the length of the real password is not leaked
export async function checkPassword(input) {
  const [a, b] = await Promise.all([sha256('pw:' + String(input || '')), sha256('pw:' + (process.env.ADMIN_PASSWORD || ''))]);
  return same(a, b);
}

export async function makeToken() {
  const exp = Date.now() + HOURS * 3600 * 1000;
  return exp + '.' + (await hmac(process.env.ADMIN_SECRET, 'adm.' + exp));
}

export async function verifyToken(t) {
  if (!t || !configured()) return false;
  const [exp, sig] = String(t).split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return same(sig, await hmac(process.env.ADMIN_SECRET, 'adm.' + exp));
}

export function getCookie(req, name) {
  const h = req.headers.get('cookie') || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

export function cookieHeader(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
export const COOKIE_MAX_AGE = HOURS * 3600;
