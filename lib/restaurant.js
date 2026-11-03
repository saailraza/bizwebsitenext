// BIZEASE DESK Industry Desk, restaurant tools: pure functions, no built-in prices or rates.
import { num, r2 } from './docKinds';

const pos = (s) => Math.max(num(s), 0);

/** Cost of a recipe. items: [{label, qty, price}] (qty used x price per unit). */
export function recipe({ items, portions, waste, price }) {
  const rows = (items || []).map((i) => ({ label: i.label, cost: r2(pos(i.qty) * pos(i.price)) })).filter((r) => r.cost > 0);
  const raw = rows.reduce((a, r) => a + r.cost, 0);
  const w = Math.min(pos(waste), 100);
  const total = raw * (1 + w / 100);
  const n = pos(portions);
  if (raw <= 0) return null;
  const out = { rows, raw: r2(raw), total: r2(total), wasteAmt: r2(total - raw), portions: n };
  if (n > 0) {
    out.per = r2(total / n);
    const p = pos(price);
    if (p > 0) { out.price = p; out.pct = (out.per / p) * 100; out.profit = r2(p - out.per); }
  }
  return out;
}

/** Menu prices for a target food cost %. dishes: [{name, cost, price}]. */
export function menu({ dishes, target }) {
  const t = num(target);
  const rows = (dishes || []).filter((d) => pos(d.cost) > 0).map((d) => {
    const cost = pos(d.cost), cur = pos(d.price);
    const r = { name: d.name, cost, cur: cur > 0 ? cur : null };
    if (t > 0 && t < 100) r.suggested = r2(cost / (t / 100));
    if (cur > 0) { r.pct = (cost / cur) * 100; r.profit = r2(cur - cost); r.over = t > 0 && r.pct > t + 1e-9; }
    return r;
  });
  return { rows, ok: t > 0 && t < 100, err: t >= 100 ? 'Target food cost must be below 100%.' : null };
}

/** Monthly restaurant profit and break-even. Food is treated as variable, the rest as fixed. */
export function rprofit(o) {
  const sales = pos(o.sales), food = pos(o.food), labour = pos(o.labour), rent = pos(o.rent), util = pos(o.util), other = pos(o.other);
  if (sales <= 0) return null;
  const costs = food + labour + rent + util + other;
  const profit = sales - costs;
  const fixed = labour + rent + util + other, vr = food / sales;
  const out = { costs: r2(costs), profit: r2(profit), margin: (profit / sales) * 100, foodPct: vr * 100, labourPct: (labour / sales) * 100, prime: r2(food + labour), primePct: ((food + labour) / sales) * 100 };
  out.breakEven = vr < 1 && fixed > 0 ? r2(fixed / (1 - vr)) : null;
  return out;
}

/** Monthly staff cost. staff: [{role, count, pay}], extra = % added on top (benefits, meals, etc.). */
export function staff({ staff: s, extra, sales }) {
  const rows = (s || []).map((x) => ({ role: x.role, count: pos(x.count), pay: pos(x.pay), total: r2(pos(x.count) * pos(x.pay)) })).filter((r) => r.total > 0);
  if (!rows.length) return null;
  const base = rows.reduce((a, r) => a + r.total, 0);
  const e = base * (pos(extra) / 100), total = base + e, heads = rows.reduce((a, r) => a + r.count, 0);
  const out = { rows, base: r2(base), extra: r2(e), total: r2(total), heads, avg: r2(total / (heads || 1)), year: r2(total * 12) };
  if (pos(sales) > 0) out.pct = (total / pos(sales)) * 100;
  return out;
}
