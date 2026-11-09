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

// ---------------------------------------------------------------- BIZEASE DESK
const today = () => new Date().toISOString().slice(0, 10);
const plain = (v, n) => stripTags(str(v, n));

/** Text of a tool page. Only the wording can change here; slug, desk, component and links stay as they are. */
export function validateTool(input, current, blogSlugs = []) {
  const e = [];
  const title = plain(input.title, 120);
  const description = plain(input.description, 320);
  const lead = plain(input.lead, 400);
  if (!title) e.push('Page title is required.');
  if (!description) e.push('Short description (for Google) is required.');
  if (!lead) e.push('The line under the heading is required.');
  const list = (v, max, n) => (Array.isArray(v) ? v : []).map((x) => plain(x, n)).filter(Boolean).slice(0, max);
  const faq = (Array.isArray(input.faq) ? input.faq : [])
    .slice(0, 10)
    .map((f) => ({ q: plain(f && f.q, 200), a: plain(f && f.a, 800) }))
    .filter((f) => f.q || f.a);
  faq.forEach((f, i) => {
    if (!f.q || !f.a) e.push(`Question ${i + 1} needs both a question and an answer.`);
  });
  const blogs = [...new Set(Array.isArray(input.blogs) ? input.blogs.map((b) => str(b, 120)) : [])].slice(0, 6);
  blogs.forEach((b) => {
    if (!SLUG_RE.test(b) || !blogSlugs.includes(b)) e.push(`The article "${b}" does not exist.`);
  });
  if (e.length) fail(e);
  const out = {
    ...current,
    title,
    h1: plain(input.h1, 120) || current.h1 || title,
    description,
    lead,
    updated: today(),
    intro: list(input.intro, 8, 1200),
    how: list(input.how, 12, 400),
    example: plain(input.example, 1000),
    mistakes: list(input.mistakes, 10, 300),
    faq,
    disclaimer: plain(input.disclaimer, 600) || current.disclaimer || '',
    related: { ...(current.related || {}), blogs },
  };
  if (input.hidden === true) out.status = 'hidden';
  else delete out.status;
  return out;
}

const RULE_KEYS = ['agmDaysAfterYearEnd', 'agmExtensionDays', 'firstAgmMonths', 'annualReturnDaysAfterAgm', 'accountsDaysAfterAgm', 'changeFilingDays'];

/** Rates and dates used by the tools. Every figure needs a source link and a checked date. */
export function validateRates(input, current) {
  const e = [];
  const fed = Number(input.federal);
  if (input.federal === '' || input.federal === null || input.federal === undefined || !isFinite(fed) || fed < 0 || fed > 100) e.push('The federal sales tax rate must be a number from 0 to 100.');
  const fedSource = str(input.federalSource, 300);
  if (!isHttps(fedSource)) e.push('The sales tax rate needs a source link starting with https://');
  const fedChecked = str(input.federalChecked, 10);
  if (!isDate(fedChecked)) e.push('The sales tax "checked on" date is not valid.');
  const calChecked = str(input.calChecked, 10);
  if (!isDate(calChecked)) e.push('The calendar "checked on" date is not valid.');
  const rules = {};
  RULE_KEYS.forEach((k) => {
    const n = Number(input.rules && input.rules[k]);
    if (!Number.isInteger(n) || n < 1 || n > 1000) e.push(`Rule "${k}" must be a whole number from 1 to 1000.`);
    rules[k] = n;
  });
  const raw = Array.isArray(input.extensions) ? input.extensions : [];
  if (raw.length > 30) e.push('Too many extensions (limit 30).');
  const seen = new Set();
  const extensions = raw.slice(0, 30).map((x, i) => {
    const key = str(x.key, 60).toLowerCase();
    const what = plain(x.what, 200);
    const original = str(x.original, 10);
    const extendedTo = str(x.extendedTo, 10);
    const source = str(x.source, 300);
    const n = `Extension ${i + 1}`;
    if (!/^[a-z0-9-]{3,60}$/.test(key)) e.push(`${n}: the code may use only small letters, numbers and hyphens.`);
    if (seen.has(key)) e.push(`${n}: this code is already used above.`);
    seen.add(key);
    if (!what) e.push(`${n}: describe what was extended.`);
    if (!isDate(original) || !isDate(extendedTo)) e.push(`${n}: both dates must be valid.`);
    else if (extendedTo <= original) e.push(`${n}: the new date must be after the original date.`);
    if (!isHttps(source)) e.push(`${n}: add a source link starting with https://`);
    return { key, what, original, extendedTo, note: plain(x.note, 300), source };
  });
  if (e.length) fail(e);
  return {
    ...current,
    updated: today(),
    salesTax: { ...(current.salesTax || {}), federal: fed, source: fedSource, checked: fedChecked },
    calendar: { ...(current.calendar || {}), checked: calChecked, rules, extensions },
  };
}
