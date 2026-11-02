'use client';
import { useMemo, useState } from 'react';
import { valuation } from '@/lib/cfo2';
import { money } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const G = [
  ['Earnings multiple', [['profit', 'Yearly net profit (Rs.)'], ['pm', 'Multiple (times)']]],
  ['Revenue multiple', [['rev', 'Yearly revenue (Rs.)'], ['rm', 'Multiple (times)']]],
  ['Net asset value', [['assets', 'Total assets (Rs.)'], ['liabs', 'Total liabilities (Rs.)']]],
  ['Discounted cash flow', [['cf', 'Cash flow this year (Rs.)'], ['g', 'Growth per year, next years (%)'], ['yrs', 'Years to forecast'], ['dr', 'Discount rate (%)'], ['tg', 'Long-term growth after that (%)']]],
];

export default function ValuationTool() {
  const [o, setO] = useState({});
  const v = useMemo(() => valuation(o), [o]);
  function csv() {
    const rows = [['Business valuation estimate'], [], ['Method', 'Value (Rs.)', 'Working']];
    v.rows.forEach((r) => rows.push([r.method, r.value, r.note]));
    if (v.low !== null) rows.push([], ['Lowest', v.low], ['Highest', v.high]);
    downloadCsv('business-valuation', rows);
  }
  return (
    <div className="dk-tool">
      <p className="dk-fine">Fill in one method or several. The tool values your business by each method you complete. There are no preset multiples, because they vary by industry and deal. Use figures you can support.</p>
      <div className="dk-cols">
        {G.map(([h, f]) => (
          <fieldset className="dk-fs" key={h}>
            <legend>{h}</legend>
            {f.map(([k, l]) => (
              <label key={k}>
                {l}
                <input inputMode="decimal" value={o[k] || ''} onChange={(e) => setO((x) => ({ ...x, [k]: e.target.value }))} />
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      {v.dcfErr && <p className="dk-err">{v.dcfErr}</p>}
      <div aria-live="polite">
        {v.rows.length === 0 ? (
          <p className="dk-fine">Complete at least one method to see a value.</p>
        ) : (
          <>
            <div className="dk-res">
              <div className="dk-box">
                <span>Lowest estimate</span>
                <b>{money(v.low)}</b>
              </div>
              <div className="dk-box">
                <span>Highest estimate</span>
                <b>{money(v.high)}</b>
              </div>
            </div>
            <div className="dk-scroll">
              <table className="dk-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th className="r">Value (Rs.)</th>
                    <th>Working</th>
                  </tr>
                </thead>
                <tbody>
                  {v.rows.map((r) => (
                    <tr key={r.k}>
                      <td>{r.method}</td>
                      <td className="r">{money(r.value)}</td>
                      <td>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <p className="dk-fine">This is a rough estimate to start a conversation. A real valuation for a sale, loan or tax purpose needs a qualified valuer.</p>
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={csv} disabled={!v.rows.length}>
          Download Excel (CSV)
        </button>
        <button type="button" className="btn o" onClick={() => setO({})}>
          Clear
        </button>
      </div>
    </div>
  );
}
