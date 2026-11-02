'use client';
import { useMemo, useState } from 'react';
import { variance, fx, BUDGET_KEY } from '@/lib/cfo';
import { money, num } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const blank = (kind) => ({ label: '', kind, budget: '', actual: '' });
const start = () => [
  { label: 'Sales', kind: 'in', budget: '', actual: '' },
  { label: 'Cost of goods sold', kind: 'out', budget: '', actual: '' },
  { label: 'Salaries and wages', kind: 'out', budget: '', actual: '' },
  { label: 'Rent and utilities', kind: 'out', budget: '', actual: '' },
  { label: 'Other expenses', kind: 'out', budget: '', actual: '' },
];

export default function Variance() {
  const [lines, setLines] = useState(start);
  const [thr, setThr] = useState('10');
  const [per, setPer] = useState('year');
  const [msg, setMsg] = useState('');
  const v = useMemo(() => variance(lines, thr), [lines, thr]);
  const set = (i, k, val) => setLines((a) => a.map((x, j) => (j === i ? { ...x, [k]: val } : x)));

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(BUDGET_KEY) || 'null');
      if (!d || !Array.isArray(d.lines) || !d.lines.length) return setMsg('No saved budget found in this browser. Make one in the Budget Planner and press "Save budget in this browser".');
      setLines(d.lines.slice(0, 40).map((l) => ({ label: String(l.label || '').slice(0, 60), kind: l.kind === 'in' ? 'in' : 'out', budget: per === 'month' ? String(Math.round((num(l.annual) / 12) * 100) / 100 || '') : String(l.annual ?? ''), actual: '' })));
      setMsg(`Loaded your budget saved on ${d.saved || 'an earlier day'}. Type the actual figures.`);
    } catch (e) {
      setMsg('Could not read the saved budget.');
    }
  }
  function csv() {
    const rows = [['Budget vs actual'], [], ['Type', 'Item', 'Budget', 'Actual', 'Variance', 'Variance %', 'Result']];
    v.rows.forEach((r) => rows.push([r.kind === 'in' ? 'Income' : 'Expense', r.label, r.budget, r.actual, r.diff, r.pct === null ? '' : Math.round(r.pct * 10) / 10, r.fav === null ? 'On budget' : r.fav ? 'Favourable' : 'Adverse']));
    rows.push([], ['Profit', '', v.profB, v.profA, v.profDiff]);
    downloadCsv('budget-vs-actual', rows);
  }
  const word = (r) => (r.fav === null ? 'On budget' : r.fav ? 'Favourable' : 'Adverse');
  return (
    <div className="dk-tool">
      <div className="dk-row dk-noprint">
        <label>
          Flag differences bigger than (%)
          <input inputMode="decimal" value={thr} onChange={(e) => setThr(e.target.value)} />
        </label>
        <label>
          When loading my budget, use
          <select value={per} onChange={(e) => setPer(e.target.value)}>
            <option value="year">The full year budget</option>
            <option value="month">One month (annual ÷ 12)</option>
          </select>
        </label>
      </div>
      <div className="dk-act dk-noprint">
        <button type="button" className="btn o" onClick={load}>
          Load my budget from the Budget Planner
        </button>
        <span role="status" className="dk-fine">
          {msg}
        </span>
      </div>
      <div className="dk-scroll">
        <table className="dk-table dk-vt">
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th className="r">Budget (Rs.)</th>
              <th className="r">Actual (Rs.)</th>
              <th className="r">Difference</th>
              <th className="r">%</th>
              <th>Result</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const r = v.rows[i];
              return (
                <tr key={i} className={r.flag ? 'flag' : ''}>
                  <td>
                    <input aria-label={`Item ${i + 1}`} maxLength={60} value={l.label} onChange={(e) => set(i, 'label', e.target.value)} />
                  </td>
                  <td>
                    <select aria-label={`Type ${i + 1}`} value={l.kind} onChange={(e) => set(i, 'kind', e.target.value)}>
                      <option value="in">Income</option>
                      <option value="out">Expense</option>
                    </select>
                  </td>
                  <td className="r">
                    <input aria-label={`Budget ${i + 1}`} inputMode="decimal" value={l.budget} onChange={(e) => set(i, 'budget', e.target.value)} />
                  </td>
                  <td className="r">
                    <input aria-label={`Actual ${i + 1}`} inputMode="decimal" value={l.actual} onChange={(e) => set(i, 'actual', e.target.value)} />
                  </td>
                  <td className="r">{money(r.diff)}</td>
                  <td className="r">{r.pct === null ? (r.diff !== 0 ? 'no budget' : '-') : fx(r.pct, 1) + '%'}</td>
                  <td>
                    {word(r)}
                    {r.flag ? ' - check' : ''}
                  </td>
                  <td className="dk-noprint">
                    <button type="button" className="dk-x" aria-label={`Remove item ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines((a) => a.filter((_, j) => j !== i))}>
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="sum">
              <td colSpan={2}>Income</td>
              <td className="r">{money(v.incB)}</td>
              <td className="r">{money(v.incA)}</td>
              <td className="r">{money(v.incA - v.incB)}</td>
              <td colSpan={3} />
            </tr>
            <tr className="sum">
              <td colSpan={2}>Expenses</td>
              <td className="r">{money(v.expB)}</td>
              <td className="r">{money(v.expA)}</td>
              <td className="r">{money(v.expA - v.expB)}</td>
              <td colSpan={3} />
            </tr>
            <tr className="sum">
              <td colSpan={2}>Profit</td>
              <td className="r">{money(v.profB)}</td>
              <td className="r">{money(v.profA)}</td>
              <td className="r">{money(v.profDiff)}</td>
              <td colSpan={3}>{v.profDiff === 0 ? 'On budget' : v.profDiff > 0 ? 'Favourable' : 'Adverse'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="dk-fine">Favourable means more income than budgeted or less spending than budgeted. Adverse means the opposite.</p>
      <div className="dk-act dk-noprint">
        <button type="button" className="btn o" disabled={lines.length >= 40} onClick={() => setLines((a) => [...a, blank('out')])}>
          Add line
        </button>
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
