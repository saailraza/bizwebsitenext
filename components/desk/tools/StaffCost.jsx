'use client';
import { useMemo, useState } from 'react';
import { staff } from '@/lib/restaurant';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';
import { Field, Box, Actions } from './parts';

const R = ['Chef', 'Cook', 'Waiter', 'Cashier', 'Helper'];
export default function StaffCost() {
  const [rows, setRows] = useState(R.map((role) => ({ role, count: '', pay: '' })));
  const [o, setO] = useState({});
  const set = (k) => (v) => setO((x) => ({ ...x, [k]: v }));
  const r = useMemo(() => staff({ staff: rows, ...o }), [rows, o]);
  const ch = (i, k, v) => setRows((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="dk-tool">
      <fieldset className="dk-fs">
        <legend>Staff</legend>
        {rows.map((x, i) => (
          <div className="dk-ln" key={i}>
            <input aria-label={`Role ${i + 1}`} maxLength={40} value={x.role} onChange={(e) => ch(i, 'role', e.target.value)} />
            <input aria-label={`Number of staff ${i + 1}`} placeholder="How many" inputMode="numeric" value={x.count} onChange={(e) => ch(i, 'count', e.target.value)} />
            <input aria-label={`Monthly pay each ${i + 1}`} placeholder="Monthly pay each (Rs.)" inputMode="decimal" value={x.pay} onChange={(e) => ch(i, 'pay', e.target.value)} />
            <button type="button" className="dk-x" aria-label={`Remove role ${i + 1}`} disabled={rows.length === 1} onClick={() => setRows((a) => a.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn o dk-noprint" disabled={rows.length >= 20} onClick={() => setRows((a) => [...a, { role: '', count: '', pay: '' }])}>
          Add role
        </button>
      </fieldset>
      <div className="dk-row">
        <Field id="extra" label="Extra on top of pay (%)" hint="Meals, uniforms, bonuses or other costs. Enter your own figure." value={o.extra} onChange={set('extra')} />
        <Field id="sales" label="Monthly sales (Rs., optional)" value={o.sales} onChange={set('sales')} />
      </div>
      <div aria-live="polite">
        {!r ? (
          <p className="dk-fine">Enter staff numbers and pay to see the monthly cost.</p>
        ) : (
          <div className="dk-res">
            <Box label="Total staff cost per month" value={money(r.total)} />
            <Box label="Per year" value={money(r.year)} />
            <Box label="Staff" value={String(r.heads)} />
            <Box label="Average cost per person" value={money(r.avg)} />
            {r.pct !== undefined && <Box label="Staff cost % of sales" value={fx(r.pct, 1) + '%'} />}
          </div>
        )}
      </div>
      <p className="dk-fine">This adds pay for each role plus your extra percentage. Overtime, EOBI and tax rules are not calculated, so add them yourself where they apply.</p>
      <Actions name="staff-cost" rows={r ? () => [['Staff cost'], [], ['Role', 'Number', 'Pay each', 'Total'], ...r.rows.map((x) => [x.role, x.count, x.pay, x.total]), [], ['Extra', r.extra], ['Total per month', r.total]] : null} onClear={() => { setRows(R.map((role) => ({ role, count: '', pay: '' }))); setO({}); }} />
    </div>
  );
}
