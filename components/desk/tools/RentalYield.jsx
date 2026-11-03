'use client';
import { useMemo, useState } from 'react';
import { rental } from '@/lib/industry';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';

const F = [
  ['price', 'Property price (Rs.)'],
  ['buyCost', 'Buying costs: registration, commission, repairs (Rs.)'],
  ['rent', 'Monthly rent (Rs.)'],
  ['vacancy', 'Months a year the property may be empty'],
  ['expenses', 'Yearly costs you pay: maintenance, taxes, fees (Rs.)'],
  ['growth', 'Price rise per year you expect (%, optional)'],
  ['years', 'Years you plan to hold it (optional)'],
];

export default function RentalYield() {
  const [o, setO] = useState({});
  const r = useMemo(() => rental(o), [o]);
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
              <span>Gross rental yield</span>
              <b>{fx(r.grossYield)}%</b>
            </div>
            <div className={'dk-box' + (r.net <= 0 ? ' bad' : '')}>
              <span>Net rental yield</span>
              <b>{fx(r.netYield)}%</b>
            </div>
            <div className="dk-box">
              <span>Net rent per year</span>
              <b>{money(r.net)}</b>
            </div>
            <div className="dk-box">
              <span>Years to earn back the cost</span>
              <b>{r.payback === null ? '-' : fx(r.payback, 1) + ' years'}</b>
            </div>
            {r.years && (
              <>
                <div className="dk-box">
                  <span>Value after {r.years} years</span>
                  <b>{money(r.value)}</b>
                </div>
                <div className="dk-box">
                  <span>Total gain (rent + price rise)</span>
                  <b>{money(r.totalGain)}</b>
                </div>
                <div className="dk-box">
                  <span>Total return on money put in</span>
                  <b>{fx(r.totalReturn, 1)}%</b>
                </div>
              </>
            )}
          </div>
          <p className="dk-fine">Before income tax, loan interest and selling costs. Gross yield = yearly rent / price. Net yield = net rent / (price + buying costs).</p>
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
