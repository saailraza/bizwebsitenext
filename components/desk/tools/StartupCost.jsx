'use client';
import { useMemo, useState } from 'react';
import { startup } from '@/lib/cfo2';
import { money } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const mk = (a) => a.map((l) => ({ label: l, amount: '' }));

export default function StartupCost() {
  const [one, setOne] = useState(() => mk(['Company registration and licences', 'Equipment and machinery', 'Furniture and fit-out', 'Security deposits and advance rent', 'Opening stock', 'Website, branding and launch marketing']));
  const [mon, setMon] = useState(() => mk(['Rent', 'Salaries and wages', 'Utilities and internet', 'Transport', 'Marketing', 'Other running costs']));
  const [months, setMonths] = useState('');
  const [cont, setCont] = useState('');
  const [own, setOwn] = useState('');
  const r = useMemo(() => startup({ one, monthly: mon, months, contingency: cont, own }), [one, mon, months, cont, own]);

  const list = (title, arr, setArr) => (
    <fieldset className="dk-fs">
      <legend>{title}</legend>
      {arr.map((l, i) => (
        <div className="dk-ln" key={i}>
          <input aria-label={`${title} name ${i + 1}`} maxLength={60} value={l.label} onChange={(e) => setArr((a) => a.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input aria-label={`${title} amount ${i + 1}`} placeholder="Rs." inputMode="decimal" value={l.amount} onChange={(e) => setArr((a) => a.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
          <button type="button" className="dk-x" aria-label={`Remove ${title.toLowerCase()} ${i + 1}`} onClick={() => setArr((a) => a.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn o dk-noprint" disabled={arr.length >= 20} onClick={() => setArr((a) => [...a, { label: '', amount: '' }])}>
        Add line
      </button>
    </fieldset>
  );
  function csv() {
    const rows = [['Startup cost estimate'], [], ['One-time costs', 'Rs.']];
    one.forEach((l) => l.label && rows.push([l.label, l.amount]));
    rows.push([], ['Monthly running costs', 'Rs.']);
    mon.forEach((l) => l.label && rows.push([l.label, l.amount]));
    rows.push([], ['One-time total', r.oneTime], [`Running costs for ${r.months} months`, r.running], ['Contingency', r.cont], ['Total capital needed', r.total], ['Own funds', r.own], ['Funding gap', r.gap]);
    downloadCsv('startup-cost', rows);
  }
  return (
    <div className="dk-tool">
      <div className="dk-cols">
        {list('One-time costs', one, setOne)}
        {list('Monthly running costs', mon, setMon)}
      </div>
      <div className="dk-row">
        <label>
          Months of running costs to cover before sales pay for them
          <input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
        </label>
        <label>
          Extra for surprises (%)
          <input inputMode="decimal" value={cont} onChange={(e) => setCont(e.target.value)} />
        </label>
        <label>
          Your own money for the business (Rs.)
          <input inputMode="decimal" value={own} onChange={(e) => setOwn(e.target.value)} />
        </label>
      </div>
      <div className="dk-res" aria-live="polite">
        <div className="dk-box">
          <span>One-time costs</span>
          <b>{money(r.oneTime)}</b>
        </div>
        <div className="dk-box">
          <span>Running costs ({r.months} months)</span>
          <b>{money(r.running)}</b>
        </div>
        <div className="dk-box">
          <span>Extra for surprises</span>
          <b>{money(r.cont)}</b>
        </div>
        <div className="dk-box">
          <span>Total capital needed</span>
          <b>{money(r.total)}</b>
        </div>
        <div className={'dk-box' + (r.gap > 0 ? ' bad' : '')}>
          <span>{r.gap > 0 ? 'Still to raise' : 'Spare after your own money'}</span>
          <b>{money(r.gap > 0 ? r.gap : r.surplus)}</b>
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
