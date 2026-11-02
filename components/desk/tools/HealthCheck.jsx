'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { health, HEALTH_BANDS } from '@/lib/cfo2';
import { fx } from '@/lib/cfo';
import { downloadCsv } from '@/lib/deskExport';

const F = [
  ['rev', 'Revenue, last 12 months (Rs.)'],
  ['prev', 'Revenue, the 12 months before (Rs.)'],
  ['np', 'Net profit, last 12 months (Rs.)'],
  ['ca', 'Current assets (Rs.)'],
  ['cl', 'Current liabilities (Rs.)'],
  ['rec', 'Receivables (Rs.)'],
  ['debt', 'Total borrowings (Rs.)'],
  ['eq', "Owners' equity (Rs.)"],
];

export default function HealthCheck() {
  const [o, setO] = useState({});
  const r = useMemo(() => health(o), [o]);
  const val = (x) => (x.value === Infinity ? 'No equity' : fx(x.value, x.k === 'recdays' ? 0 : x.k === 'margin' || x.k === 'growth' ? 1 : 2) + x.unit);
  function csv() {
    const rows = [['Business health check'], [], ['Measure', 'Value', 'Points (0 to 2)']];
    r.rows.forEach((x) => rows.push([x.label, val(x), x.pts]));
    if (r.score !== null) rows.push([], ['Score out of 100', r.score], ['Result', r.level]);
    downloadCsv('business-health-check', rows);
  }
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
      <div aria-live="polite">
        {r.score === null ? (
          <p className="dk-fine">Fill in enough figures for at least three measures to see a score. You have {r.scored} so far.</p>
        ) : (
          <div className={'dk-score' + (r.score < 50 ? ' bad' : '')}>
            <b>{r.score}</b>
            <span>out of 100: {r.level}</span>
          </div>
        )}
        {r.rows.length > 0 && (
          <div className="dk-scroll">
            <table className="dk-table">
              <thead>
                <tr>
                  <th>Measure</th>
                  <th className="r">Your figure</th>
                  <th className="r">Points</th>
                  <th>How it is scored</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((x) => (
                  <tr key={x.k}>
                    <td>{x.label}</td>
                    <td className="r">{val(x)}</td>
                    <td className="r">{x.pts} of 2</td>
                    <td>{x.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="dk-fine">
        The score is the points you earned as a share of the points possible for the measures you filled in. The bands are simple rules of thumb, not a credit rating. Industries differ, so a lower score does not always mean a problem.
      </p>
      {r.score !== null && r.score < 80 && (
        <p>
          Want a closer look at your numbers? <Link href="/contact/">Talk to a BIZEASE SOLUTIONS adviser</Link>. The first consultation is free.
        </p>
      )}
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={csv} disabled={!r.rows.length}>
          Download Excel (CSV)
        </button>
        <button type="button" className="btn o" onClick={() => setO({})}>
          Clear
        </button>
      </div>
    </div>
  );
}
