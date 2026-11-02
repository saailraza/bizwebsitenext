'use client';
import { useMemo, useState } from 'react';
import { dscr } from '@/lib/cfo2';
import { fx } from '@/lib/cfo';
import { money, num } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const F = [
  ['noi', 'Yearly income available to pay debt (Rs.)', 'Operating profit before interest and loan repayments (EBITDA or net operating income).'],
  ['existing', 'Yearly payments on loans you already have (Rs.)', 'Instalments of principal and interest for the year.'],
  ['loan', 'New loan amount (Rs.)', ''],
  ['rate', 'Interest rate per year (%)', ''],
  ['years', 'Loan term (years)', ''],
  ['target', 'Cover your lender asks for (times)', 'Lenders set their own minimum. Ask yours and enter it here.'],
];

export default function Dscr() {
  const [o, setO] = useState({});
  const r = useMemo(() => dscr(o), [o]);
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }));
  const bad = r.ratio !== null && r.ratio < 1;
  function csv() {
    const rows = [['Debt service coverage'], []];
    F.forEach(([k, l]) => rows.push([l, o[k] || '']));
    rows.push([], ['New loan monthly instalment', r.monthly], ['Total yearly debt service', r.total], ['DSCR', r.ratio === null ? '' : Math.round(r.ratio * 100) / 100], ['Largest new loan at the cover entered', r.maxLoan === null ? '' : r.maxLoan]);
    downloadCsv('dscr', rows);
  }
  return (
    <div className="dk-tool">
      <div className="dk-row">
        {F.map(([k, l, h]) => (
          <label key={k}>
            {l}
            <input inputMode="decimal" value={o[k] || ''} onChange={(e) => set(k, e.target.value)} aria-describedby={h ? 'h-' + k : undefined} />
            {h && (
              <small id={'h-' + k} className="dk-fine">
                {h}
              </small>
            )}
          </label>
        ))}
      </div>
      <div className="dk-res" aria-live="polite">
        <div className={'dk-box' + (bad ? ' bad' : '')}>
          <span>Debt service coverage (DSCR)</span>
          <b>{r.ratio === null ? '-' : fx(r.ratio) + ' times'}</b>
        </div>
        <div className="dk-box">
          <span>New loan instalment per month</span>
          <b>{money(r.monthly)}</b>
        </div>
        <div className="dk-box">
          <span>Total debt payments per year</span>
          <b>{money(r.total)}</b>
        </div>
        <div className="dk-box">
          <span>Largest new loan at your lender's cover</span>
          <b>{r.maxLoan === null ? '-' : money(r.maxLoan)}</b>
        </div>
      </div>
      {bad && <p className="dk-err">Your income is less than your yearly debt payments, so the loan could not be paid from this income alone.</p>}
      {r.shortfall > 0 && !bad && <p className="dk-err">To reach the cover your lender asks for, income would need to rise by about Rs. {money(r.shortfall * num(o.target))} a year, or debt payments fall by Rs. {money(r.shortfall)}.</p>}
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={csv}>
          Download Excel (CSV)
        </button>
        <button type="button" className="btn o" onClick={() => setO({})}>
          Clear
        </button>
      </div>
    </div>
  );
}
