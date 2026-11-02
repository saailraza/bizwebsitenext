'use client';
import { useMemo, useState } from 'react';
import { cashForecast, MONTH_SHORT } from '@/lib/cfo';
import { money, num } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const mk = (labels) => labels.map((l) => ({ label: l, start: '', growth: '' }));
const now = new Date();

function Chart({ months }) {
  const W = 640, H = 200, P = 28;
  const vals = months.map((m) => m.closing);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const span = max - min || 1;
  const y = (v) => P + ((max - v) / span) * (H - 2 * P);
  const bw = (W - 2 * P) / months.length;
  return (
    <svg className="dk-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Closing cash by month. Lowest ${months.reduce((a, m) => (m.closing < a.closing ? m : a), months[0]).label}. The table below has the same figures.`}>
      <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity=".5" />
      {months.map((m, i) => {
        const x = P + i * bw + bw * 0.15;
        const top = Math.min(y(m.closing), y(0));
        const h = Math.abs(y(m.closing) - y(0));
        return (
          <g key={m.label}>
            <rect x={x} y={top} width={bw * 0.7} height={Math.max(h, 1)} fill={m.closing < 0 ? '#b3261e' : '#1b6b4b'} />
            <text x={x + bw * 0.35} y={H - 8} fontSize="10" textAnchor="middle" fill="currentColor">
              {m.label.slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CashFlow() {
  const [opening, setOpening] = useState('');
  const [startMonth, setStartMonth] = useState(String(now.getMonth()));
  const [months, setMonths] = useState('12');
  const [ins, setIns] = useState(() => mk(['Sales collected', 'Other income']));
  const [outs, setOuts] = useState(() => mk(['Staff salaries', 'Rent and utilities', 'Supplier payments', 'Taxes', 'Loan repayments', 'Other expenses']));
  const [one, setOne] = useState([]);

  const f = useMemo(
    () =>
      cashForecast({
        opening,
        rows: [...ins.map((r) => ({ ...r, kind: 'in' })), ...outs.map((r) => ({ ...r, kind: 'out' }))],
        oneoffs: one,
        months: Number(months),
        startMonth: Number(startMonth),
        startYear: now.getFullYear(),
      }),
    [opening, ins, outs, one, months, startMonth]
  );
  const list = (title, arr, setArr, kind) => (
    <fieldset className="dk-fs">
      <legend>{title}</legend>
      <div className="dk-ln3 dk-hd" aria-hidden="true">
        <span>Item</span>
        <span>Month 1 (Rs.)</span>
        <span>Change per month (%)</span>
        <span />
      </div>
      {arr.map((r, i) => (
        <div className="dk-ln3" key={i}>
          <input aria-label={`${title} name ${i + 1}`} maxLength={60} value={r.label} onChange={(e) => setArr((a) => a.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input aria-label={`${title} amount ${i + 1}`} inputMode="decimal" value={r.start} onChange={(e) => setArr((a) => a.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
          <input aria-label={`${title} change ${i + 1}`} inputMode="decimal" placeholder="0" value={r.growth} onChange={(e) => setArr((a) => a.map((x, j) => (j === i ? { ...x, growth: e.target.value } : x)))} />
          <button type="button" className="dk-x" aria-label={`Remove ${title.toLowerCase()} ${i + 1}`} onClick={() => setArr((a) => a.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn o dk-noprint" disabled={arr.length >= 15} onClick={() => setArr((a) => [...a, { label: '', start: '', growth: '' }])}>
        Add line
      </button>
    </fieldset>
  );
  function csv() {
    const rows = [['Cash flow forecast'], ['Opening cash', num(opening)], [], ['Month', 'Opening', 'Cash in', 'Cash out', 'Net', 'Closing']];
    f.months.forEach((m) => rows.push([m.label, m.opening, m.inflow, m.outflow, m.net, m.closing]));
    downloadCsv('cash-flow-forecast', rows);
  }
  return (
    <div className="dk-tool">
      <div className="dk-row">
        <label>
          Cash in hand and bank today (Rs.)
          <input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </label>
        <label>
          First month
          <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)}>
            {MONTH_SHORT.map((m, i) => (
              <option key={m} value={i}>
                {m} {now.getFullYear()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Forecast for
          <select value={months} onChange={(e) => setMonths(e.target.value)}>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </select>
        </label>
      </div>
      <div className="dk-cols">
        {list('Cash in', ins, setIns, 'in')}
        {list('Cash out', outs, setOuts, 'out')}
      </div>
      <fieldset className="dk-fs dk-noprint">
        <legend>One-off items (a machine purchase, a loan received, an annual tax payment)</legend>
        {one.map((r, i) => (
          <div className="dk-ln4" key={i}>
            <input aria-label={`One-off name ${i + 1}`} placeholder="What" maxLength={60} value={r.label} onChange={(e) => setOne((a) => a.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <select aria-label={`One-off type ${i + 1}`} value={r.kind} onChange={(e) => setOne((a) => a.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}>
              <option value="out">Cash out</option>
              <option value="in">Cash in</option>
            </select>
            <select aria-label={`One-off month ${i + 1}`} value={r.month} onChange={(e) => setOne((a) => a.map((x, j) => (j === i ? { ...x, month: e.target.value } : x)))}>
              {f.months.map((m, k) => (
                <option key={m.label} value={k + 1}>
                  {m.label}
                </option>
              ))}
            </select>
            <input aria-label={`One-off amount ${i + 1}`} placeholder="Amount (Rs.)" inputMode="decimal" value={r.amount} onChange={(e) => setOne((a) => a.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
            <button type="button" className="dk-x" aria-label={`Remove one-off ${i + 1}`} onClick={() => setOne((a) => a.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn o" disabled={one.length >= 12} onClick={() => setOne((a) => [...a, { label: '', kind: 'out', month: '1', amount: '' }])}>
          Add one-off item
        </button>
      </fieldset>

      <div className="dk-res" aria-live="polite">
        <div className="dk-box">
          <span>Cash at the end</span>
          <b>{money(f.closing)}</b>
        </div>
        <div className="dk-box">
          <span>Lowest cash balance</span>
          <b>{money(f.lowest.closing)}</b>
          <span>{f.lowest.label}</span>
        </div>
        <div className={'dk-box' + (f.firstNegative ? ' bad' : '')}>
          <span>First month cash runs out</span>
          <b>{f.firstNegative ? f.firstNegative.label : 'None'}</b>
        </div>
        <div className="dk-box">
          <span>Total cash in / out</span>
          <b>
            {money(f.totalIn)} / {money(f.totalOut)}
          </b>
        </div>
      </div>
      {f.firstNegative && <p className="dk-err">Cash goes below zero in {f.firstNegative.label}. Plan a loan, an overdraft, faster collections or later payments before then.</p>}
      <Chart months={f.months} />
      <div className="dk-scroll">
        <table className="dk-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="r">Opening</th>
              <th className="r">Cash in</th>
              <th className="r">Cash out</th>
              <th className="r">Net</th>
              <th className="r">Closing</th>
            </tr>
          </thead>
          <tbody>
            {f.months.map((m) => (
              <tr key={m.label} className={m.closing < 0 ? 'neg' : ''}>
                <td>{m.label}</td>
                <td className="r">{money(m.opening)}</td>
                <td className="r">{money(m.inflow)}</td>
                <td className="r">{money(m.outflow)}</td>
                <td className="r">{money(m.net)}</td>
                <td className="r">
                  {money(m.closing)}
                  {m.closing < 0 ? ' (short)' : ''}
                </td>
              </tr>
            ))}
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
      </div>
    </div>
  );
}
