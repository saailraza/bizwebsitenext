// Reads the site content (JSON files in /content). Server-side only.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'content');

function readJson(rel, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch (e) {
    return fallback;
  }
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function getRoutes() {
  return readJson('routes.json', {});
}
export function getRoute(p) {
  return getRoutes()[p] || null;
}
export function getShell(id) {
  return fs.readFileSync(path.join(ROOT, 'shells', id + '.html'), 'utf8');
}

export function getBlogs({ drafts = false } = {}) {
  let files = [];
  try {
    files = fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.json'));
  } catch (e) {}
  const out = files.map((f) => readJson('blog/' + f, null)).filter(Boolean);
  const list = drafts ? out : out.filter((b) => b.published !== false);
  return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug < b.slug ? -1 : 1));
}
export function getBlog(slug) {
  if (!SLUG_RE.test(slug || '')) return null;
  const b = readJson('blog/' + slug + '.json', null);
  return b && b.published !== false ? b : null;
}

export const getLanding = () => readJson('landing.json', []);
export const getJobs = () => (readJson('jobs.json', { items: [] }).items || []).filter((j) => j.active !== false);
export const getApps = () => readJson('apps.json', { bizloan: '', bizbook: '', bizkhata: '' });
export const getStaticBotSlugs = () => readJson('bot-static-slugs.json', []);

// "/tax-calculators/" -> ["pk","pk5",...] : the last path segment of every stored route under that prefix
export function routeParams(prefix) {
  return Object.keys(getRoutes())
    .filter((k) => k.startsWith(prefix) && k !== prefix)
    .map((k) => k.slice(prefix.length).replace(/\/$/, ''))
    .filter((s) => s && !s.includes('/'));
}
