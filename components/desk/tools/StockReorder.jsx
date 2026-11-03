'use client';
import { useMemo, useState } from 'react';
import { reorder } from '@/lib/industry';
import { fx } from '@/lib/cfo';

const F = [
  ['daily', 'Units you sell per day, on average'],
  ['lead', 'Days your supplier takes to deliver'],
  ['safety', 'Extra days of stock you want to keep as a cushion'],
  ['onhand', 'Units in stock now (optional)'],
  ['days', 'Days you trade in a year (optional, for order size)'],
  ['orderCost', 'Cost of placing one order, Rs. (optional)'],
  ['holding', 'Cost of keeping one unit for a year, Rs. (optional)'],
];

export default function StockReorder() {
  const [o, setO] = useState({});
  const r = useMemo(() => reorder(o), [o]);
  return (
    <div className="dk-tool">
      <div className="dk-row">
        {F.map(([k, l]) => (
          <label key={k}>
            {l}
            <input inputMode="decimal" value={o[k] || ''} onChange={(e) => setO((x) => ({ ...x, [k]: e.target.value }))} />
          </label>
        ))}
      </div>
      {r.error ? (
        <p className="dk-fine">{r.error}</p>
      ) : (
        <div aria-live="polite">
          <div className="dk-res">
            <div className="dk-box">
              <span>Reorder when stock falls to</span>
              <b>{r.rop} units</b>
            </div>
            <div className="dk-box">
              <span>Cushion stock</span>
              <b>{r.safetyStock} units</b>
            </div>
            {r.daysLeft !== null && (
              <div className="dk-box">
                <span>Stock lasts about</span>
                <b>{fx(r.daysLeft, 1)} days</b>
              </div>
            )}
            {r.eoq !== null && (
              <div className="dk-box">
                <span>Order size that keeps costs lowest</span>
                <b>{r.eoq} units</b>
              </div>
            )}
          </div>
          {r.orderNow === true && <p className="dk-err">You are at or below the reorder level. Order now.</p>}
          {r.orderNow === false && <p className="dk-fine">Stock is above the reorder level.</p>}
          {r.eoq !== null && <p className="dk-fine">About {fx(r.ordersPerYear, 1)} orders a year at that size.</p>}
        </div>
      )}
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={() => setO({})}>
          Clear
        </button>
      </div>
    </div>
  );
}
