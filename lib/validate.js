import { SLUG_RE } from './content';
import { cleanHtml, stripTags } from './sanitize';
import { ApiError } from './adminApi';

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00Z'));
const isHttps = (s) => {
  try {
    return new URL(s).protocol === 'https:';
  } catch (e) {
    return false;
  }
};

function fail(errors) {
  throw new ApiError(errors.join(' '), 400, { errors });
}

export function normTags(v) {
  const list = String(v || '')
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#+/, '').replace(/[^A-Za-z0-9_]/g, ''))
    .filter(Boolean)
    .slice(0, 12);
  return [...new Set(list)].map((t) => '#' + t).join(' ');
}

export function validateBlog(input, slug) {
  const e = [];
  const title = str(input.title, 200);
  const category = str(input.category, 60);
  const description = str(input.description, 320);
  const date = str(input.date, 10);
  const body = cleanHtml(str(input.body, 300000));
  const lead = cleanHtml(str(input.lead, 1500));
  if (!SLUG_RE.test(slug) || slug.length > 120) e.push('The web address (slug) may use only small letters, numbers and hyphens.');
  if (!title) e.push('Title is required.');
  if (!category) e.push('Category is required.');
  if (!description) e.push('Short description (for Google) is required.');
  if (!isDate(date)) e.push('Date is not valid.');
  if (stripTags(body).length < 50) e.push('The article body is too short.');
  if (e.length) fail(e);
  const related = (Array.isArray(input.related) ? input.related : [])
    .slice(0, 6)
    .map((r) => ({ href: str(r.href, 200), cat: str(r.cat || 'Service', 40), title: str(r.title, 120), desc: str(r.desc, 240) }))
    .filter((r) => /^\/[a-z0-9-]+\/$/.test(r.href) && r.title);
  return {
    slug,
    title,
    description,
    category,
    date,
    updated: new Date().toISOString().slice(0, 10),
    lead: lead || description,
    body,
    tags: normTags(input.tags),
    related,
    published: input.published !== false,
  };
}

export function validateJobs(input) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length > 40) fail(['Too many positions (limit 40).']);
  const seen = new Set();
  const out = items.map((j, i) => {
    const title = str(j.title, 120);
    if (!title) fail([`Position ${i + 1} needs a title.`]);
    let id = str(j.id, 60).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'job-' + (i + 1);
    while (seen.has(id)) id += '-' + (i + 1);
    seen.add(id);
    return { id, title, type: str(j.type, 40), location: str(j.location, 80), summary: str(j.summary, 400), active: j.active !== false };
  });
  return { items: out };
}

export function validateApps(input) {
  const out = {};
  const e = [];
  for (const k of ['bizloan', 'bizbook', 'bizkhata']) {
    const v = str(input[k], 300);
    if (v && !isHttps(v)) e.push(`${k.toUpperCase()}: the link must start with https://`);
    out[k] = v;
  }
  if (e.length) fail(e);
  return out;
}

export function validateBizbot(input, current) {
  const api = str(input.api ?? current.api, 300);
  if (api && !isHttps(api)) fail(['The BIZBOT address must start with https://']);
  return { enabled: !!input.enabled, api };
}
