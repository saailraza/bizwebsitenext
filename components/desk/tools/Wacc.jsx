'use client';
import { useMemo, useState } from 'react';
import { wacc } from '@/lib/cfo2';
import { fx } from '@/lib/cfo';
import { downloadCsv } from '@/lib/deskExport';

export default function Wacc() {
  const [o, setO] = useState({ mode: 'direct' });
  const r = useMemo(() => wacc(o), [o]);
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }));
  const inp = (k, l) => (
    <label key={k}>
      {l}
      <input inputMode="decimal" value={o[k] || ''} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  function csv() {
    if (r.error) return;
    downloadCsv('wacc', [['WACC'], [], ['Equity weight %', r.we], ['Debt weight %', r.wd], ['Cost of equity %', r.re], ['Cost of debt before tax %', r.rd], ['Cost of debt after tax %', r.afterTax], ['WACC %', r.wacc]]);
  }
  return (
    <div className="dk-tool">
      <div className="dk-cols">
        <fieldset className="dk-fs">
          <legend>How the business is funded</legend>
          {inp('equity', 'Value of equity (Rs.)')}
          {inp('debt', 'Value of debt (Rs.)')}
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Cost of equity</legend>
          <label>
            How to find it
            <select value={o.mode} onChange={(e) => set('mode', e.target.value)}>
              <option value="direct">I know the return owners expect (%)</option>
              <option value="capm">Work it out with CAPM</option>
            </select>
          </label>
          {o.mode === 'capm' ? (
            <>
              {inp('rf', 'Risk-free rate (%)')}
              {inp('beta', 'Beta')}
              {inp('mrp', 'Market risk premium (%)')}
            </>
          ) : (
            inp('re', 'Expected return on equity (%)')
          )}
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Cost of debt</legend>
          {inp('rd', 'Interest rate on debt (%)')}
          {inp('tax', 'Tax rate that applies (%)')}
        </fieldset>
      </div>
      {r.error ? (
        <p className="dk-fine">{r.error}</p>
      ) : (
        <div className="dk-res" aria-live="polite">
          <div className="dk-box">
            <span>WACC</span>
            <b>{fx(r.wacc)}%</b>
          </div>
          <div className="dk-box">
            <span>Equity / debt weights</span>
            <b>
              {fx(r.we, 1)}% / {fx(r.wd, 1)}%
            </b>
          </div>
          <div className="dk-box">
            <span>Cost of equity</span>
            <b>{fx(r.re)}%</b>
          </div>
          <div className="dk-box">
            <span>Cost of debt after tax</span>
            <b>{fx(r.afterTax)}%</b>
          </div>
        </div>
      )}
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={csv} disabled={!!r.error}>
          Download Excel (CSV)
        </button>
        <button type="button" className="btn o" onClick={() => setO({ mode: 'direct' })}>
          Clear
        </button>
      </div>
    </div>
  );
}
