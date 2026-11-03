'use client';
import { useMemo, useState } from 'react';
import { hourly } from '@/lib/industry';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';

const F = [
  ['income', 'Monthly take-home income you want (Rs.)'],
  ['expenses', 'Monthly business costs: software, internet, workspace (Rs.)'],
  ['tax', 'Share of earnings to set aside for tax (%)'],
  ['hours', 'Hours a week you can bill to clients'],
  ['weeks', 'Weeks you work in a year'],
  ['rate', 'Rs. per US dollar (optional)'],
];

export default function FreelanceRate() {
  const [o, setO] = useState({});
  const r = useMemo(() => hourly(o), [o]);
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
        <div className="dk-res" aria-live="polite">
          <div className="dk-box">
            <span>Hourly rate to charge</span>
            <b>{money(r.perHour)}</b>
          </div>
          <div className="dk-box">
            <span>Per billable day</span>
            <b>{money(r.perDay)}</b>
          </div>
          {r.usd !== null && (
            <div className="dk-box">
              <span>Hourly rate in US dollars</span>
              <b>{fx(r.usd)}</b>
            </div>
          )}
          <div className="dk-box">
            <span>Earnings needed per year</span>
            <b>{money(r.gross)}</b>
          </div>
          <div className="dk-box">
            <span>Billable hours per year</span>
            <b>{fx(r.billable, 0)}</b>
          </div>
        </div>
      )}
      <p className="dk-fine">Count only hours you can actually bill. Time spent finding clients, writing proposals and invoicing is not billable, so many freelancers bill far fewer hours than they work.</p>
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
