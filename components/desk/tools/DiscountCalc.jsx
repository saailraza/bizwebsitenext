'use client';
import { useMemo, useState } from 'react';
import { discount } from '@/lib/industry';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';

export default function DiscountCalc() {
  const [o, setO] = useState({});
  const r = useMemo(() => discount(o), [o]);
  const f = [['price', 'Original price (Rs.)'], ['d1', 'First discount (%)'], ['d2', 'Second discount on the reduced price (%, optional)']];
  return (
    <div className="dk-tool">
      <div className="dk-row">
        {f.map(([k, l]) => (
          <label key={k}>
            {l}
            <input inputMode="decimal" value={o[k] || ''} onChange={(e) => setO((x) => ({ ...x, [k]: e.target.value }))} />
          </label>
        ))}
      </div>
      {r.error ? (
        <p className="dk-fine">{r.error}</p>
      ) : (
        <div className="dk-res" aria-live="polite">
          <div className="dk-box">
            <span>You pay</span>
            <b>{money(r.final)}</b>
          </div>
          <div className="dk-box">
            <span>You save</span>
            <b>{money(r.saved)}</b>
          </div>
          <div className="dk-box">
            <span>Total discount</span>
            <b>{fx(r.effective, 2)}%</b>
          </div>
          {r.twoStep && (
            <div className="dk-box">
              <span>Price after first discount</span>
              <b>{money(r.after1)}</b>
            </div>
          )}
        </div>
      )}
      {r.twoStep && <p className="dk-fine">Two discounts do not add up. 20% then 10% is {fx(r.effective, 2)}% in total, not 30%.</p>}
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
