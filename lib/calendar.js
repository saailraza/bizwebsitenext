// BIZEASE DESK compliance calendar engine. Pure functions (no browser or file access).
// Dates and rules come from content/rates.json -> calendar. Always UTC so the result does not depend on the visitor's time zone.

const DAY = 86400000;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const utc = (y, m, d) => new Date(Date.UTC(y, m, d));
export const iso = (d) => d.toISOString().slice(0, 10);
export const parseIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = utc(+m[1], +m[2] - 1, +m[3]);
  return iso(d) === s ? d : null;
};
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const addMonths = (d, n) => {
  const t = utc(d.getUTCFullYear(), d.getUTCMonth() + n, 1);
  const last = utc(t.getUTCFullYear(), t.getUTCMonth() + 1, 0).getUTCDate();
  return utc(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d.getUTCDate(), last));
};
const monthEnd = (y, m0) => utc(y, m0 + 1, 0);
const label = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

/**
 * o: { entity: 'individual'|'aop'|'company'|'smc', fyEnd: 1-12 (month the financial year ends),
 *      salesTax, withholding, advance: booleans, agm: 'YYYY-MM-DD'|'', inc: 'YYYY-MM-DD'|'', scope: 'fbr'|'all' }
 * Returns { events, notes } where events are sorted by effective date.
 */
export function buildCalendar(o, cal, from, months = 12) {
  const R = cal.rules;
  const S = cal.sources;
  const to = addMonths(from, months);
  const ext = cal.extensions || [];
  const events = [];
  const notes = [];
  const isCo = o.entity === 'company' || o.entity === 'smc';
  const june = Number(o.fyEnd) === 6;
  const y0 = from.getUTCFullYear() - 2;
  const y1 = to.getUTCFullYear() + 1;

  const push = (e) => {
    const x = ext.find((z) => z.key === e.key);
    const ev = { ...e, source: e.source };
    if (x) {
      ev.extendedTo = x.extendedTo;
      ev.extNote = x.note;
      ev.extSource = x.source;
    }
    const eff = parseIso(ev.extendedTo || ev.date);
    if (eff >= from && eff <= to) events.push(ev);
  };
  const ev = (key, date, kind, title, who, basis, source, note) => ({ key, date: iso(date), kind, title, who, basis, source, note: note || '' });

  // ----- FBR: income tax return and advance tax (30 June year-end, individuals, AOPs and companies)
  for (let y = y0; y <= y1; y++) {
    if (!isCo) {
      push(ev(`itr-ind-${y}`, utc(y, 8, 30), 'FBR', `Income tax return, tax year ${y}`, 'Individuals and AOPs', 'FBR income tax due dates page: 30 September', S.fbrItr.url));
    } else if (june) {
      push(ev(`itr-co-${y}`, utc(y, 11, 31), 'FBR', `Income tax return, tax year ${y}`, 'Companies with a 30 June year-end', 'FBR income tax due dates page: 31 December', S.fbrItr.url));
    }
    if (o.advance && (!isCo || june)) {
      const co = o.entity === 'company';
      const day = co ? 25 : 15;
      [['1st', utc(y, 8, day)], ['2nd', utc(y, 11, day)], ['3rd', utc(y + 1, 2, day)], ['4th', utc(y + 1, 5, 15)]].forEach(([n, d], i) =>
        push(ev(`adv-${o.entity}-${y}-${i + 1}`, d, 'FBR', `Advance tax, ${n} instalment (tax year ${y + 1})`, co ? 'Companies that pay advance tax (section 147)' : 'Individuals and AOPs that pay advance tax (section 147)', co ? '25 Sep, 25 Dec, 25 Mar, 15 Jun' : '15 Sep, 15 Dec, 15 Mar, 15 Jun', co ? S.advCo.url : S.advInd.url))
      );
    }
  }
  if (o.advance && o.entity === 'company') notes.push("Advance tax for companies: FBR's own advance tax calendar page lists different dates (15 Oct, 15 Jan, 15 Apr, 15 Jun) from the guides used here (25 Sep, 25 Dec, 25 Mar, 15 Jun). The earlier dates are shown to be safe. Confirm with FBR or your adviser.");
  if (o.advance && o.entity === 'aop') notes.push('Advance tax for AOPs: FBR\'s calendar says the 15th of the month. One guide says the 25th. The 15th is shown to be safe.');
  if (isCo && !june) notes.push('Income tax return and advance tax dates for a year-end other than 30 June (a "special tax year") are not listed, because FBR sets them differently. Check your exact dates with FBR or your adviser.');
  if (o.advance && isCo && !june) notes.push('Advance tax instalment dates shown by sources are for a 30 June year-end, so they are left out for your year-end.');

  // ----- FBR: monthly obligations
  let c = utc(from.getUTCFullYear(), from.getUTCMonth() - 1, 1);
  const stop = utc(to.getUTCFullYear(), to.getUTCMonth() + 1, 1);
  for (; c <= stop; c = utc(c.getUTCFullYear(), c.getUTCMonth() + 1, 1)) {
    const y = c.getUTCFullYear();
    const m = c.getUTCMonth();
    const prev = utc(y, m - 1, 1);
    const p = label(prev);
    const k = `${y}-${m}`;
    if (o.withholding) push(ev(`wh-${k}`, utc(y, m, 15), 'FBR', `Withholding tax monthly statement, ${p}`, 'Withholding agents', '15th of the following month', S.withholding.url));
    if (o.salesTax) {
      push(ev(`st-c-${k}`, utc(y, m, 10), 'FBR', `Sales tax Annexure-C, ${p}`, 'Federal sales tax registered persons', 'FBR sales tax due dates page: 10th', S.fbrSales.url));
      push(ev(`st-p-${k}`, utc(y, m, 15), 'FBR', `Sales tax payment, ${p}`, 'Federal sales tax registered persons', 'FBR sales tax due dates page: 15th', S.fbrSales.url));
      push(ev(`st-r-${k}`, utc(y, m, 18), 'FBR', `Sales tax return (e-filing), ${p}`, 'Federal sales tax registered persons', 'FBR sales tax due dates page: 18th', S.fbrSales.url));
    }
  }
  if (o.salesTax) notes.push('Only federal (FBR) sales tax dates are listed. Provincial sales tax on services (PRA, SRB, KPRA, BRA) is not included because those dates were not verified. CNG dealers, brick makers, power and gas companies and manufacturers\' annual returns follow special dates.');

  // ----- SECP (companies only, "all" scope)
  if (isCo && o.scope === 'all') {
    const userAgm = parseIso(o.agm);
    for (let y = y0; y <= y1; y++) {
      const fy = monthEnd(y, Number(o.fyEnd) - 1);
      const latest = addDays(fy, R.agmDaysAfterYearEnd);
      const fyl = `financial year ending ${fy.getUTCDate()} ${MONTHS[fy.getUTCMonth()]} ${fy.getUTCFullYear()}`;
      if (o.entity === 'company') {
        push(ev(`agm-${iso(fy)}`, latest, 'SECP', `Latest date for the annual general meeting, ${fyl}`, 'Companies with share capital', `Within ${R.agmDaysAfterYearEnd} days of year end (section 132). The registrar may extend by up to ${R.agmExtensionDays} days.`, S.secp.url));
        const mine = userAgm && userAgm > fy && userAgm <= addDays(fy, 260);
        const agm = mine ? userAgm : latest;
        const when = mine ? `your AGM on ${iso(userAgm)}` : `an AGM on the last permitted day (${iso(latest)})`;
        push(ev(`ar-${iso(fy)}`, addDays(agm, R.annualReturnDaysAfterAgm), 'SECP', `Annual return (Form A), ${fyl}`, 'Private companies', `Within ${R.annualReturnDaysAfterAgm} days of the AGM (section 130). Date shown assumes ${when}.`, S.secp.url));
        push(ev(`fs-${iso(fy)}`, addDays(agm, R.accountsDaysAfterAgm), 'SECP', `Copy of financial statements to the registrar, ${fyl}`, 'Companies required to file (section 233)', `Within ${R.accountsDaysAfterAgm} days of the AGM. Date shown assumes ${when}.`, S.secp.url, 'Smaller companies may be exempt; check the current SECP notification.'));
      } else {
        const ref = utc(latest.getUTCFullYear(), 11, 31);
        push(ev(`ar-smc-${iso(fy)}`, addDays(ref, R.annualReturnDaysAfterAgm), 'SECP', `Annual return, ${fyl}`, 'Single member companies', `A single member company holds no AGM, so guides count ${R.annualReturnDaysAfterAgm} days from 31 December (section 130). Small companies may not need to file if nothing changed.`, S.secp.url, 'Confirm with SECP.'));
      }
    }
    const inc = parseIso(o.inc);
    if (inc && o.entity === 'company') push(ev(`agm1-${iso(inc)}`, addMonths(inc, R.firstAgmMonths), 'SECP', 'Latest date for the first annual general meeting', 'Newly incorporated companies', `Within ${R.firstAgmMonths} months of incorporation (section 132).`, S.secp.url));
    notes.push(`Whenever it happens: changes in directors or officers must be filed within ${R.changeFilingDays} days, and a change of auditor is reported within ${R.changeFilingDays} days. These are event-based, so they are not dated here.`);
    notes.push('SECP dates are taken from two law-firm guides to the Companies Act, 2017 that agree with each other. They are not read from the Act itself, so confirm with SECP or your company secretary.');
  }

  events.sort((a, b) => (parseIso(a.extendedTo || a.date) - parseIso(b.extendedTo || b.date)) || (a.title < b.title ? -1 : 1));
  return { events, notes: [...new Set(notes)], from: iso(from), to: iso(to) };
}

export const effDate = (e) => e.extendedTo || e.date;
export const weekday = (s) => WEEK[parseIso(s).getUTCDay()];
export const niceDate = (s) => {
  const d = parseIso(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
};

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** Calendar file (.ics) with one all-day event per due date, for Google, Outlook or Apple Calendar. */
export function toIcs(events, stamp) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BIZEASE SOLUTIONS//BIZEASE DESK//EN', 'CALSCALE:GREGORIAN'];
  events.forEach((e) => {
    const d = parseIso(effDate(e));
    const next = iso(addDays(d, 1)).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.key}@bizeasesolutions.online`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${effDate(e).replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(`${e.who}. ${e.basis}${e.extNote ? ' ' + e.extNote : ''} Always confirm with FBR or SECP. Source: ${e.source}`)}`,
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
