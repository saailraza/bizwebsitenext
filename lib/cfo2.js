// BIZEASE DESK CFO toolkit part 2: pure calculation functions (no browser or file access).
import { num, r2 } from './docKinds';

const pos = (s) => Math.max(num(s), 0);

/** Monthly instalment of a reducing-balance loan. rate in % per year. */
export function loanPayment(principal, ratePct, years) {
  const P = pos(principal), n = Math.round(pos(years) * 12), r = pos(ratePct) / 1200;
  if (P <= 0 || n <= 0) return 0;
  return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
}
/** Loan a monthly instalment can repay. */
export function loanFromPayment(pmt, ratePct, years) {
  const n = Math.round(pos(years) * 12), r = pos(ratePct) / 1200;
  if (pmt <= 0 || n <= 0) return 0;
  return r === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + r, -n))) / r;
}

/** Debt service coverage. noi = yearly income available to pay debt. */
export function dscr(o) {
  const noi = num(o.noi);
  const pmt = loanPayment(o.loan, o.rate, o.years);
  const newAnnual = pmt * 12;
  const existing = pos(o.existing);
  const total = newAnnual + existing;
  const target = pos(o.target);
  const room = target > 0 ? noi / target - existing : null;
  return {
    monthly: r2(pmt), newAnnual: r2(newAnnual), existing: r2(existing), total: r2(total),
    ratio: total > 0 ? noi / total : null,
    maxLoan: room === null ? null : room > 0 ? r2(loanFromPayment(room / 12, o.rate, o.years)) : 0,
    shortfall: target > 0 && total > 0 ? r2(Math.max(total - noi / target, 0)) : 0,
  };
}

/** Discounted cash flow with a terminal value. Percentages in %. */
export function dcf({ cf, growth, rate, years, tg }) {
  const c = num(cf), g = num(growth) / 100, r = num(rate) / 100, n = Math.round(num(years)), t = num(tg) / 100;
  if (!(r > 0)) return { error: 'Enter a discount rate above zero.' };
  if (!(n >= 1 && n <= 30)) return { error: 'Enter between 1 and 30 years.' };
  if (!(r > t)) return { error: 'The discount rate must be higher than the long-term growth rate.' };
  let pv = 0, last = c;
  for (let i = 1; i <= n; i++) {
    last = c * Math.pow(1 + g, i);
    pv += last / Math.pow(1 + r, i);
  }
  const tv = (last * (1 + t)) / (r - t);
  const pvTv = tv / Math.pow(1 + r, n);
  return { pvCash: r2(pv), pvTerminal: r2(pvTv), value: r2(pv + pvTv) };
}

/** Valuation by every method the user filled in. */
export function valuation(o) {
  const rows = [];
  if (num(o.profit) > 0 && num(o.pm) > 0) rows.push({ k: 'earn', method: 'Earnings multiple', value: r2(num(o.profit) * num(o.pm)), note: `${num(o.profit).toLocaleString('en-US')} × ${num(o.pm)}` });
  if (num(o.rev) > 0 && num(o.rm) > 0) rows.push({ k: 'rev', method: 'Revenue multiple', value: r2(num(o.rev) * num(o.rm)), note: `${num(o.rev).toLocaleString('en-US')} × ${num(o.rm)}` });
  if (num(o.assets) > 0 || num(o.liabs) > 0) rows.push({ k: 'asset', method: 'Net asset value', value: r2(num(o.assets) - num(o.liabs)), note: 'Assets minus liabilities' });
  let dcfErr = '';
  if (num(o.cf) > 0) {
    const d = dcf({ cf: o.cf, growth: o.g, rate: o.dr, years: o.yrs, tg: o.tg });
    if (d.error) dcfErr = d.error;
    else rows.push({ k: 'dcf', method: 'Discounted cash flow', value: d.value, note: `Cash flows ${d.pvCash.toLocaleString('en-US')} + terminal value ${d.pvTerminal.toLocaleString('en-US')}` });
  }
  const vals = rows.map((r) => r.value);
  return { rows, dcfErr, low: vals.length ? Math.min(...vals) : null, high: vals.length ? Math.max(...vals) : null };
}

/**
 * Inventory cost under FIFO and weighted average (IAS 2 allows these two; it does not allow LIFO).
 * opening/purchases: {qty, cost} with cost per unit. sold = units sold in the period.
 */
export function inventory({ opening, purchases, sold, revenue }) {
  const layers = [opening, ...purchases].map((l) => ({ qty: pos(l.qty), cost: pos(l.cost) })).filter((l) => l.qty > 0);
  const avail = layers.reduce((a, l) => a + l.qty, 0);
  const totalCost = layers.reduce((a, l) => a + l.qty * l.cost, 0);
  const s = pos(sold);
  if (avail <= 0) return { error: 'Enter at least one quantity of opening stock or purchases.' };
  if (s > avail + 1e-9) return { error: `You cannot sell ${s} units when only ${avail} were available.` };
  let left = s, fifo = 0;
  for (const l of layers) {
    const take = Math.min(left, l.qty);
    fifo += take * l.cost;
    left -= take;
    if (left <= 0) break;
  }
  const avg = totalCost / avail;
  const wa = s * avg;
  const rev = pos(revenue);
  const mk = (cogs) => ({ cogs: r2(cogs), closing: r2(totalCost - cogs), profit: rev > 0 ? r2(rev - cogs) : null });
  return { avail, totalCost: r2(totalCost), avg: avg, closingUnits: avail - s, fifo: mk(fifo), wa: mk(wa) };
}

/** Weighted average cost of capital. All rates in %. */
export function wacc(o) {
  const E = pos(o.equity), D = pos(o.debt);
  const V = E + D;
  if (V <= 0) return { error: 'Enter the value of equity and/or debt.' };
  const re = o.mode === 'capm' ? num(o.rf) + num(o.beta) * num(o.mrp) : num(o.re);
  const rd = num(o.rd), t = Math.min(Math.max(num(o.tax), 0), 100);
  const we = E / V, wd = D / V;
  const afterTax = rd * (1 - t / 100);
  return { re, rd, afterTax, we: we * 100, wd: wd * 100, wacc: we * re + wd * afterTax, V: r2(V) };
}

const BANDS = {
  margin: { label: 'Net profit margin', unit: '%', good: 10, fair: 5, higher: true, text: '10% or more = 2, 5% to 10% = 1, below 5% = 0' },
  current: { label: 'Current ratio', unit: '', good: 1.5, fair: 1, higher: true, text: '1.5 or more = 2, 1 to 1.5 = 1, below 1 = 0' },
  de: { label: 'Debt to equity', unit: '', good: 1, fair: 2, higher: false, text: '1 or less = 2, 1 to 2 = 1, above 2 = 0' },
  recdays: { label: 'Days to collect receivables', unit: ' days', good: 45, fair: 90, higher: false, text: '45 days or fewer = 2, 45 to 90 = 1, above 90 = 0' },
  growth: { label: 'Revenue growth', unit: '%', good: 10, fair: 0, higher: true, text: '10% or more = 2, 0% to 10% = 1, a fall = 0' },
};
export const HEALTH_BANDS = BANDS;

/** Simple self-check score. Metrics without enough input are skipped. */
export function health(o) {
  const rev = num(o.rev), np = num(o.np), ca = num(o.ca), cl = num(o.cl), debt = pos(o.debt), eq = num(o.eq), rec = pos(o.rec), prev = num(o.prev);
  const m = {};
  if (rev > 0 && o.np !== '' && o.np !== undefined) m.margin = (np / rev) * 100;
  if (cl > 0 && ca >= 0 && o.ca !== '' && o.ca !== undefined) m.current = ca / cl;
  if (eq > 0 && o.debt !== '' && o.debt !== undefined) m.de = debt / eq;
  else if (eq < 0 || (eq === 0 && debt > 0 && o.eq !== '' && o.eq !== undefined)) m.de = Infinity;
  if (rev > 0 && o.rec !== '' && o.rec !== undefined) m.recdays = (rec / rev) * 365;
  if (prev > 0 && rev > 0) m.growth = ((rev - prev) / prev) * 100;
  const rows = Object.keys(m).map((k) => {
    const b = BANDS[k], v = m[k];
    const pts = b.higher ? (v >= b.good ? 2 : v >= b.fair ? 1 : 0) : v <= b.good ? 2 : v <= b.fair ? 1 : 0;
    return { k, label: b.label, value: v, unit: b.unit, pts, text: b.text };
  });
  const scored = rows.length;
  const score = scored >= 3 ? Math.round((rows.reduce((a, r) => a + r.pts, 0) / (2 * scored)) * 100) : null;
  const level = score === null ? null : score >= 80 ? 'Strong' : score >= 50 ? 'Mixed' : 'Needs attention';
  return { rows, scored, score, level };
}

/** Startup capital. one/monthly: [{label, amount}]. */
export function startup({ one, monthly, months, contingency, own }) {
  const sumList = (a) => r2(a.reduce((s, l) => s + pos(l.amount), 0));
  const oneTime = sumList(one);
  const perMonth = sumList(monthly);
  const m = Math.min(Math.max(Math.round(num(months)), 0), 60);
  const running = r2(perMonth * m);
  const sub = r2(oneTime + running);
  const cont = r2((sub * Math.min(Math.max(num(contingency), 0), 100)) / 100);
  const total = r2(sub + cont);
  const have = pos(own);
  return { oneTime, perMonth, months: m, running, sub, cont, total, own: have, gap: r2(Math.max(total - have, 0)), surplus: r2(Math.max(have - total, 0)) };
}
