import { num, r2 } from './docKinds';

const pos = (x) => Math.max(num(x), 0);

/** Selling price from cost and a target margin or markup. Percentages in %. */
export function pricing({ cost, mode, pct, tax }) {
  const c = pos(cost), p = pos(pct), t = pos(tax);
  if (c <= 0) return { error: 'Enter the cost of the item.' };
  if (!(p > 0) && String(pct || '') === '') return { error: 'Enter the margin or markup you want.' };
  if (mode === 'margin' && p >= 100) return { error: 'A margin must be below 100%.' };
  const price = mode === 'margin' ? c / (1 - p / 100) : c * (1 + p / 100);
  const profit = price - c;
  return { price: r2(price), profit: r2(profit), margin: (profit / price) * 100, markup: (profit / c) * 100, tax: r2(price * t / 100), final: r2(price * (1 + t / 100)) };
}

/** Margin and markup from a cost and a selling price. */
export function checkPrice({ cost, price }) {
  const c = pos(cost), p = pos(price);
  if (c <= 0 || p <= 0) return { error: 'Enter the cost and the selling price.' };
  return { profit: r2(p - c), margin: ((p - c) / p) * 100, markup: ((p - c) / c) * 100 };
}

/** One or two successive discounts. */
export function discount({ price, d1, d2 }) {
  const p = pos(price), a = Math.min(pos(d1), 100), b = Math.min(pos(d2), 100);
  if (p <= 0) return { error: 'Enter the original price.' };
  const after1 = p * (1 - a / 100), after2 = after1 * (1 - b / 100);
  return { after1: r2(after1), final: r2(after2), saved: r2(p - after2), effective: ((p - after2) / p) * 100, twoStep: b > 0 };
}

/** Reorder point and (optionally) economic order quantity. */
export function reorder({ daily, lead, safety, onhand, days, orderCost, holding }) {
  const d = pos(daily), L = pos(lead), s = pos(safety);
  if (d <= 0 || L <= 0) return { error: 'Enter units sold per day and supplier lead time in days.' };
  const rop = d * (L + s);
  const oh = String(onhand || '') === '' ? null : pos(onhand);
  const D = d * pos(days), S = pos(orderCost), H = pos(holding);
  const eoq = D > 0 && S > 0 && H > 0 ? Math.sqrt((2 * D * S) / H) : null;
  return { rop: Math.ceil(rop - 1e-9), safetyStock: Math.ceil(d * s - 1e-9), daysLeft: oh === null ? null : oh / d, orderNow: oh === null ? null : oh <= rop, eoq: eoq === null ? null : Math.ceil(eoq - 1e-9), ordersPerYear: eoq === null ? null : D / eoq };
}

/** Rental yield and simple property return. No tax, loan or reinvestment. */
export function rental({ price, buyCost, rent, vacancy, expenses, growth, years }) {
  const P = pos(price), B = pos(buyCost), R = pos(rent), V = Math.min(pos(vacancy), 12), E = pos(expenses), g = num(growth), n = pos(years);
  if (P <= 0 || R <= 0) return { error: 'Enter the property price and the monthly rent.' };
  const invest = P + B, gross = R * 12, collected = R * (12 - V), net = collected - E;
  const out = { invest: r2(invest), gross: r2(gross), net: r2(net), grossYield: (gross / P) * 100, netYield: (net / invest) * 100, payback: net > 0 ? invest / net : null };
  if (n > 0) {
    const value = P * Math.pow(1 + g / 100, n), totalGain = value - invest + net * n;
    out.value = r2(value); out.totalGain = r2(totalGain); out.totalReturn = (totalGain / invest) * 100; out.years = n;
  }
  return out;
}

/** Hourly rate a freelancer needs. */
export function hourly({ income, expenses, tax, hours, weeks, rate }) {
  const i = pos(income), e = pos(expenses), t = Math.min(pos(tax), 90), h = pos(hours), w = pos(weeks);
  if (i <= 0 || h <= 0 || w <= 0) return { error: 'Enter the income you want, billable hours a week and weeks you work a year.' };
  const need = (i + e) * 12, gross = need / (1 - t / 100), perHour = gross / (h * w), x = pos(rate);
  return { need: r2(need), gross: r2(gross), perHour: r2(perHour), perDay: r2(perHour * (h / 5)), usd: x > 0 ? r2(perHour / x) : null, billable: h * w };
}

/** Daily cash closing: counted cash against what the books say should be there. */
export function cashClose({ opening, sales, received, expenses, banked, notes, other }) {
  const exp = pos(opening) + pos(sales) + pos(received) - pos(expenses) - pos(banked);
  const counted = (notes || []).reduce((a, n) => a + pos(n.value) * pos(n.count), 0) + pos(other);
  return { expected: r2(exp), counted: r2(counted), diff: r2(counted - exp) };
}

const has = (v) => v !== '' && v !== undefined && v !== null && String(v).trim() !== '';
/** Profit per order for an online seller. Every fee is entered by the user. */
export function seller(o) {
  const sell = pos(o.sell), cost = pos(o.cost);
  if (sell <= 0) return null;
  const pct = pos(o.comm) + pos(o.pay);
  if (pct >= 100) return { err: 'Percentage fees add up to 100% or more.' };
  const pctFees = (sell * pct) / 100;
  const fixed = pos(o.fixed) + pos(o.ship) + pos(o.ads) + pos(o.other);
  const ret = (pos(o.ret) / 100) * pos(o.retCost);
  const profit = sell - cost - pctFees - fixed - ret;
  const out = { pctFees: r2(pctFees), fixed: r2(fixed), ret: r2(ret), profit: r2(profit), margin: (profit / sell) * 100 };
  out.breakEven = r2((cost + fixed + ret) / (1 - pct / 100));
  if (pos(o.units) > 0) out.monthly = r2(profit * pos(o.units));
  return out;
}
