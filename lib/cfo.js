// BIZEASE DESK CFO toolkit: pure calculation functions (no browser or file access).
import { num, r2 } from './docKinds';

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ratio = (a, b) => (b > 0 ? a / b : null);

/** Working capital, liquidity ratios and the cash conversion cycle. All inputs are strings or numbers. */
export function workingCapital(o, days = 365) {
  const cash = num(o.cash), rec = num(o.rec), inv = num(o.inv), oca = num(o.oca);
  const pay = num(o.pay), std = num(o.std), ocl = num(o.ocl);
  const ca = cash + rec + inv + oca;
  const cl = pay + std + ocl;
  const sales = num(o.sales), cogs = num(o.cogs);
  const dso = sales > 0 ? (rec / sales) * days : null;
  const dio = cogs > 0 ? (inv / cogs) * days : null;
  const dpo = cogs > 0 ? (pay / cogs) * days : null;
  return {
    ca, cl, wc: r2(ca - cl),
    current: ratio(ca, cl), quick: ratio(ca - inv, cl), cashRatio: ratio(cash, cl),
    dso, dio, dpo,
    ccc: dso !== null && dio !== null && dpo !== null ? dso + dio - dpo : null,
  };
}

/**
 * Monthly cash forecast.
 * rows: [{label, kind:'in'|'out', start, growth}]  start = amount in month 1, growth = % change per month
 * oneoffs: [{label, kind:'in'|'out', month (1-based), amount}]
 */
export function cashForecast({ opening, rows, oneoffs = [], months = 12, startMonth = 0, startYear = 2026 }) {
  const out = [];
  let bal = r2(num(opening));
  for (let i = 0; i < months; i++) {
    let inflow = 0, outflow = 0;
    rows.forEach((r) => {
      const g = num(r.growth) / 100;
      const v = Math.max(num(r.start), 0) * Math.pow(1 + g, i);
      if (r.kind === 'in') inflow += v; else outflow += v;
    });
    oneoffs.forEach((o) => {
      if (Math.round(num(o.month)) === i + 1) {
        const a = Math.max(num(o.amount), 0);
        if (o.kind === 'in') inflow += a; else outflow += a;
      }
    });
    inflow = r2(inflow);
    outflow = r2(outflow);
    const op = bal;
    bal = r2(op + inflow - outflow);
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    out.push({ label: `${MONTH_SHORT[m]} ${y}`, opening: op, inflow, outflow, net: r2(inflow - outflow), closing: bal });
  }
  const neg = out.findIndex((m) => m.closing < 0);
  return {
    months: out,
    lowest: out.reduce((a, m) => (m.closing < a.closing ? m : a), out[0]),
    firstNegative: neg >= 0 ? out[neg] : null,
    totalIn: r2(out.reduce((a, m) => a + m.inflow, 0)),
    totalOut: r2(out.reduce((a, m) => a + m.outflow, 0)),
    closing: out.length ? out[out.length - 1].closing : r2(num(opening)),
  };
}

/** Annual budget. lines: [{label, kind:'in'|'out', annual}] -> totals and an even monthly split. */
export function budgetTotals(lines) {
  const sum = (k) => r2(lines.filter((l) => l.kind === k).reduce((a, l) => a + Math.max(num(l.annual), 0), 0));
  const income = sum('in');
  const expense = sum('out');
  const profit = r2(income - expense);
  return { income, expense, profit, margin: income > 0 ? (profit / income) * 100 : null, monthIncome: r2(income / 12), monthExpense: r2(expense / 12), monthProfit: r2(profit / 12) };
}

/** Budget against actual. lines: [{label, kind:'in'|'out', budget, actual}]. thr = flag when the gap is bigger than this percent. */
export function variance(lines, thr = 10) {
  const rows = lines.map((l) => {
    const b = r2(num(l.budget)), a = r2(num(l.actual));
    const diff = r2(a - b);
    const pct = b !== 0 ? (diff / Math.abs(b)) * 100 : null;
    const fav = l.kind === 'in' ? diff >= 0 : diff <= 0;
    return { label: l.label, kind: l.kind, budget: b, actual: a, diff, pct, fav: diff === 0 ? null : fav, flag: pct !== null ? Math.abs(pct) > Math.max(num(thr), 0) : diff !== 0 };
  });
  const tot = (k, f) => r2(rows.filter((r) => r.kind === k).reduce((s, r) => s + r[f], 0));
  const incB = tot('in', 'budget'), incA = tot('in', 'actual'), expB = tot('out', 'budget'), expA = tot('out', 'actual');
  const profB = r2(incB - expB), profA = r2(incA - expA);
  return { rows, incB, incA, expB, expA, profB, profA, profDiff: r2(profA - profB) };
}

/** '1.50' for a ratio, '-' when it cannot be worked out. */
export const fx = (n, d = 2) => (n === null || n === undefined || !isFinite(n) ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const BUDGET_KEY = 'bz_desk_budget_v1';
