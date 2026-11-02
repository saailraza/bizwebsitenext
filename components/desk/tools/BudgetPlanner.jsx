'use client';
import { useMemo, useState } from 'react';
import { budgetTotals, fx, BUDGET_KEY } from '@/lib/cfo';
import { money, num } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const mk = (labels) => labels.map((l) => ({ label: l, annual: '' }));

export default function BudgetPlanner() {
  const [ins, setIns] = useState(() => mk(['Product sales', 'Service income', 'Other income']));
  const [outs, setOuts] = useState(() => mk(['Cost of goods sold', 'Salaries and wages', 'Rent and utilities', 'Marketing', 'Transport and fuel', 'Professional fees', 'Other expenses']));
  const [msg, setMsg] = useState('');
  const all = useMemo(() => [...ins.map((l) => ({ ...l, kind: 'in' })), ...outs.map((l) => ({ ...l, kind: 'out' }))], [ins, outs]);
  const t = useMemo(() => budgetTotals(all), [all]);

  const list = (title, arr, setArr) => (
    <fieldset className="dk-fs">
      <legend>{title}</legend>
      <div className="dk-ln dk-hd" aria-hidden="true">
        <span>Item</span>
        <span>Budget for the year (Rs.)</span>
        <span />
      </div>
      {arr.map((r, i) => (
        <div className="dk-ln" key={i}>
          <input aria-label={`${title} name ${i + 1}`} maxLength={60} value={r.label} onChange={(e) => setArr((a) => a.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input aria-label={`${title} amount ${i + 1}`} inputMode="decimal" value={r.annual} onChange={(e) => setArr((a) => a.map((x, j) => (j === i ? { ...x, annual: e.target.value } : x)))} />
          <button type="button" className="dk-x" aria-label={`Remove ${title.toLowerCase()} ${i + 1}`} onClick={() => setArr((a) => a.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn o dk-noprint" disabled={arr.length >= 20} onClick={() => setArr((a) => [...a, { label: '', annual: '' }])}>
        Add line
      </button>
    </fieldset>
  );
  function save() {
    try {
      localStorage.setItem(BUDGET_KEY, JSON.stringify({ saved: new Date().toISOString().slice(0, 10), lines: all.filter((l) => num(l.annual) > 0) }));
      setMsg('Saved in this browser only. Open Budget vs Actual and press "Load my budget".');
    } catch (e) {
      setMsg('Could not save. Your browser may be blocking storage.');
    }
  }
  function csv() {
    const rows = [['Annual budget'], [], ['Type', 'Item', 'Annual (Rs.)', 'Per month (Rs.)']];
    all.forEach((l) => (l.label.trim() || num(l.annual)) && rows.push([l.kind === 'in' ? 'Income' : 'Expense', l.label, num(l.annual), Math.round((num(l.annual) / 12) * 100) / 100]));
    rows.push([], ['Total income', '', t.income, t.monthIncome], ['Total expenses', '', t.expense, t.monthExpense], ['Budgeted profit', '', t.profit, t.monthProfit]);
    downloadCsv('annual-budget', rows);
  }
  const row = (l, i) => (
    <tr key={l.kind + i}>
      <td>{l.label || '(no name)'}</td>
      <td className="r">{money(Math.max(num(l.annual), 0))}</td>
      <td className="r">{money(Math.max(num(l.annual), 0) / 12)}</td>
    </tr>
  );
  return (
    <div className="dk-tool">
      <div className="dk-cols">
        {list('Income', ins, setIns)}
        {list('Expenses', outs, setOuts)}
      </div>
      <div className="dk-res" aria-live="polite">
        <div className="dk-box">
          <span>Budgeted income</span>
          <b>{money(t.income)}</b>
        </div>
        <div className="dk-box">
          <span>Budgeted expenses</span>
          <b>{money(t.expense)}</b>
        </div>
        <div className={'dk-box' + (t.profit < 0 ? ' bad' : '')}>
          <span>{t.profit < 0 ? 'Budgeted loss' : 'Budgeted profit'}</span>
          <b>{money(t.profit)}</b>
        </div>
        <div className="dk-box">
          <span>Profit margin</span>
          <b>{t.margin === null ? '-' : fx(t.margin, 1) + '%'}</b>
        </div>
      </div>
      <div className="dk-scroll">
        <table className="dk-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="r">Year (Rs.)</th>
              <th className="r">Average per month (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="sec">
              <td colSpan={3}>Income</td>
            </tr>
            {all.filter((l) => l.kind === 'in' && (l.label.trim() || num(l.annual) > 0)).map(row)}
            <tr className="sum">
              <td>Total income</td>
              <td className="r">{money(t.income)}</td>
              <td className="r">{money(t.monthIncome)}</td>
            </tr>
            <tr className="sec">
              <td colSpan={3}>Expenses</td>
            </tr>
            {all.filter((l) => l.kind === 'out' && (l.label.trim() || num(l.annual) > 0)).map(row)}
            <tr className="sum">
              <td>Total expenses</td>
              <td className="r">{money(t.expense)}</td>
              <td className="r">{money(t.monthExpense)}</td>
            </tr>
            <tr className="sum">
              <td>{t.profit < 0 ? 'Budgeted loss' : 'Budgeted profit'}</td>
              <td className="r">{money(t.profit)}</td>
              <td className="r">{money(t.monthProfit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={csv}>
          Download Excel (CSV)
        </button>
        <button type="button" className="btn o" onClick={save}>
          Save budget in this browser
        </button>
        <span role="status" className="dk-fine">
          {msg}
        </span>
      </div>
    </div>
  );
}
