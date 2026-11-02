'use client';
import { useMemo, useState } from 'react';
import { workingCapital, fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const FIELDS = {
  assets: [['cash', 'Cash and bank balances'], ['rec', 'Trade receivables (money customers owe you)'], ['inv', 'Inventory (stock)'], ['oca', 'Other current assets']],
  liabs: [['pay', 'Trade payables (money you owe suppliers)'], ['std', 'Short-term loans and the part of long-term loans due within a year'], ['ocl', 'Other current liabilities (accrued expenses, taxes payable)']],
  year: [['sales', 'Sales for the year'], ['cogs', 'Cost of goods sold for the year']],
};
const EXPL = [
  ['wc', 'Working capital', 'Current assets minus current liabilities.'],
  ['current', 'Current ratio', 'Current assets divided by current liabilities. Below 1 means current liabilities are bigger than current assets.'],
  ['quick', 'Quick ratio', 'Current assets without inventory, divided by current liabilities.'],
  ['cashRatio', 'Cash ratio', 'Cash and bank divided by current liabilities.'],
  ['dso', 'Days sales outstanding', 'How many days customers take to pay: receivables ÷ sales × 365.'],
  ['dio', 'Days inventory outstanding', 'How many days stock sits before sale: inventory ÷ cost of goods sold × 365.'],
  ['dpo', 'Days payables outstanding', 'How many days you take to pay suppliers: payables ÷ cost of goods sold × 365.'],
  ['ccc', 'Cash conversion cycle', 'Days sales outstanding plus days inventory outstanding minus days payables outstanding. The days your cash is tied up.'],
];

export default function WorkingCapital() {
  const [o, setO] = useState({});
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }));
  const r = useMemo(() => workingCapital(o), [o]);
  const val = (k) => {
    const v = r[k];
    if (k === 'wc') return money(v);
    if (['dso', 'dio', 'dpo', 'ccc'].includes(k)) return v === null ? '-' : fx(v, 0) + ' days';
    return fx(v);
  };
  const block = (title, list) => (
    <fieldset className="dk-fs">
      <legend>{title}</legend>
      {list.map(([k, l]) => (
        <label key={k}>
          {l}
          <input inputMode="decimal" value={o[k] || ''} onChange={(e) => set(k, e.target.value)} />
        </label>
      ))}
    </fieldset>
  );
  function csv() {
    const rows = [['Working capital'], [], ['Input', 'Rs.']];
    [...FIELDS.assets, ...FIELDS.liabs, ...FIELDS.year].forEach(([k, l]) => rows.push([l, o[k] || '']));
    rows.push([], ['Result', 'Value']);
    EXPL.forEach(([k, l]) => rows.push([l, val(k)]));
    downloadCsv('working-capital', rows);
  }
  return (
    <div className="dk-tool">
      <div className="dk-cols">
        {block('Current assets (Rs.)', FIELDS.assets)}
        {block('Current liabilities (Rs.)', FIELDS.liabs)}
        {block('Figures for the last 12 months (Rs.)', FIELDS.year)}
      </div>
      <div className="dk-res" aria-live="polite">
        {EXPL.map(([k, l]) => (
          <div key={k} className="dk-box">
            <span>{l}</span>
            <b>{val(k)}</b>
          </div>
        ))}
      </div>
      {r.cl > 0 && r.ca < r.cl && <p className="dk-err">Current liabilities (Rs. {money(r.cl)}) are larger than current assets (Rs. {money(r.ca)}). You may struggle to pay bills as they fall due.</p>}
      <dl className="dk-def">
        {EXPL.map(([k, l, d]) => (
          <div key={k}>
            <dt>{l}</dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
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
