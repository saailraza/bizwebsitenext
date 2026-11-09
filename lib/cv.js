// BIZEASE DESK CV and cover letter helpers: pure functions, no data leaves the browser.
import { longDate } from './docKinds';

export const CV_KEY = 'bz_desk_cv_v1';
const t = (s) => String(s ?? '').trim();

/** One non-empty trimmed line per entry. */
export const lines = (s) => String(s ?? '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
/** Items split by comma or new line. */
export const items = (s) => String(s ?? '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
export const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(s));

/** Turns "Label: value" lines into pairs. A line without a colon becomes a value on its own. */
export function pairs(s) {
  return lines(s).map((l) => {
    const i = l.indexOf(':');
    return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', l];
  });
}

/** Cleans the form data into what the CV shows. Empty entries are dropped. */
export function cvModel(d) {
  const exp = (d.exp || []).filter((e) => t(e.role) || t(e.company)).map((e) => ({ role: t(e.role), company: t(e.company), from: t(e.from), to: t(e.to), bullets: lines(e.details) }));
  const edu = (d.edu || []).filter((e) => t(e.degree) || t(e.school)).map((e) => ({ degree: t(e.degree), school: t(e.school), year: t(e.year), grade: t(e.grade) }));
  return {
    name: t(d.name), title: t(d.title), email: t(d.email), phone: t(d.phone), city: t(d.city), links: lines(d.links), photo: d.photo || '',
    summary: t(d.summary), exp, edu, skills: items(d.skills), languages: items(d.languages), certs: lines(d.certs), personal: pairs(d.personal),
  };
}

/** Friendly checks shown beside the form. None of them blocks printing. */
export function cvChecks(m) {
  const out = [];
  if (!m.name) out.push('Add your name.');
  if (!m.email) out.push('Add an email address.');
  else if (!validEmail(m.email)) out.push('Check the email address. It does not look complete.');
  if (!m.phone) out.push('Add a phone number.');
  if (!m.summary) out.push('Add a short summary of who you are and what you want.');
  else if (m.summary.length > 700) out.push('Your summary is long. Three or four lines is easier to read.');
  if (!m.exp.length && !m.edu.length) out.push('Add your experience or education.');
  m.exp.forEach((e, i) => {
    if (!e.bullets.length) out.push(`Add what you did in "${e.role || e.company || 'job ' + (i + 1)}". Use one line per achievement.`);
  });
  if (m.personal.some(([k, v]) => /cnic|passport|identity|national id/i.test(k + ' ' + v))) out.push('Think before putting ID numbers on a CV you send to many people.');
  return out;
}

/** Cover letter text. Returns plain strings so the same output can be shown and tested. */
export function coverLetter(d) {
  const company = t(d.company), pos = t(d.position), rec = t(d.rname);
  const o = { from: [], date: d.date ? longDate(d.date) : '', to: [], greeting: '', subject: '', paras: [], close: '', name: t(d.name) };
  [t(d.name), t(d.address), t(d.phone), t(d.email)].forEach((x) => x && o.from.push(x));
  [rec, t(d.rtitle), company, t(d.raddr)].forEach((x) => x && o.to.push(x));
  o.greeting = rec ? `Dear ${rec},` : 'Dear Hiring Manager,';
  if (pos) o.subject = `Application for ${pos}` + (t(d.ref) ? ` (reference ${t(d.ref)})` : '');
  const src = t(d.source);
  if (pos || company) {
    o.paras.push(`I am writing to apply for ${pos ? 'the position of ' + pos : 'a position'}${company ? ' at ' + company : ''}${src ? ', as advertised on ' + src : ''}.`);
  }
  [d.why, d.experience, d.strengths].forEach((p) => t(p) && o.paras.push(t(p)));
  if (t(d.available)) o.paras.push(`I am available to start ${t(d.available)}.`);
  const reach = [t(d.phone) && `on ${t(d.phone)}`, t(d.email) && `at ${t(d.email)}`].filter(Boolean).join(' or ');
  o.paras.push(`Thank you for considering my application. I would welcome the chance to discuss how I can contribute${company ? ' to ' + company : ''}.${reach ? ' I can be reached ' + reach + '.' : ''}`);
  o.close = rec ? 'Yours sincerely,' : 'Yours faithfully,';
  return o;
}

export function coverChecks(d) {
  const out = [];
  if (!t(d.name)) out.push('Add your name.');
  if (!t(d.position)) out.push('Add the job title you are applying for.');
  if (!t(d.company)) out.push('Add the company name.');
  if (!t(d.rname)) out.push('If you can find a name, address the letter to a person. It reads better than "Hiring Manager".');
  if (!t(d.experience)) out.push('Add a paragraph on your most relevant experience.');
  const words = [d.why, d.experience, d.strengths].map(t).join(' ').split(/\s+/).filter(Boolean).length;
  if (words > 350) out.push('The letter is getting long. One page is usually enough.');
  return out;
}
