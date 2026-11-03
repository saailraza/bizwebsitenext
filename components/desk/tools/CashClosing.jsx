'use client';
import { useMemo, useState } from 'react';
import { cashClose } from '@/lib/industry';
import { money } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const NOTES = ['5000', '1000', '500', '100', '50', '20', '10'];
const F = [
  ['opening', 'Cash in the drawer at opening (Rs.)'],
  ['sales', 'Cash sales today (Rs.)'],
  ['received', 'Cash received from customers on credit (Rs.)'],
  ['expenses', 'Cash paid out for expenses (Rs.)'],
  ['banked', 'Cash taken to the bank or owner (Rs.)'],
];

export default function CashClosing() {
  const [o, setO] = useState({});
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState(() => NOTES.map((v) => ({ value: v, count: '' })));
  const [other, setOther] = useState('');
  const r = useMemo(() => cashClose({ ...o, notes, other }), [o, notes, other]);
  function csv() {
    downloadCsv('daily-cash-closing', [['Daily cash closing', date], [], ...F.map(([k, l]) => [l, o[k] || '']), [], ['Expected cash', r.expected], ['Counted cash', r.counted], ['Difference', r.diff]]);
  }
  return (
    <div className="dk-tool">
      <label>
        Date
        <input value={date} onChange={(e) => setDate(e.target.value)} maxLength={30} placeholder="e.g. 2 November 2026" />
      </label>
      <div className="dk-cols">
        <fieldset className="dk-fs">
          <legend>What the books say</legend>
          {F.map(([k, l]) => (
            <label key={k}>
              {l}
              <input inputMode="decimal" value={o[k] || ''} onChange={(e) => setO((x) => ({ ...x, [k]: e.target.value }))} />
            </label>
          ))}
        </fieldset>
        <fieldset className="dk-fs">
          <legend>What you count</legend>
          {notes.map((n, i) => (
            <div className="dk-ln" key={i}>
              <input aria-label={`Note value ${i + 1}`} inputMode="decimal" value={n.value} onChange={(e) => setNotes((a) => a.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <input aria-label={`Note count ${i + 1}`} placeholder="How many" inputMode="numeric" value={n.count} onChange={(e) => setNotes((a) => a.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))} />
            </div>
          ))}
          <label>
            Coins and anything else (Rs.)
            <input inputMode="decimal" value={other} onChange={(e) => setOther(e.target.value)} />
          </label>
        </fieldset>
      </div>
      <div className="dk-res" aria-live="polite">
        <div className="dk-box">
          <span>Cash there should be</span>
          <b>{money(r.expected)}</b>
        </div>
        <div className="dk-box">
          <span>Cash you counted</span>
          <b>{money(r.counted)}</b>
        </div>
        <div className={'dk-box' + (r.diff !== 0 ? ' bad' : '')}>
          <span>{r.diff === 0 ? 'Difference' : r.diff > 0 ? 'Extra cash' : 'Cash short'}</span>
          <b>{money(Math.abs(r.diff))}</b>
        </div>
      </div>
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={csv}>
          Download Excel (CSV)
        </button>
      </div>
    </div>
  );
}
