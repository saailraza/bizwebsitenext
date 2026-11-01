'use client';
import { useMemo, useState } from 'react';

const fmt = (n) => {
  if (!isFinite(n)) return '-';
  const a = Math.abs(n);
  const d = a >= 100 ? 2 : a >= 1 ? 3 : 5;
  return Number(n.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
};

export default function MarlaConverter({ rates }) {
  const L = (rates && rates.land) || {};
  const [marlaSize, setMarlaSize] = useState(String(L.marlaSqft || 272.25));
  const [val, setVal] = useState('10');
  const [unit, setUnit] = useState('marla');

  const f = useMemo(() => {
    const m = parseFloat(marlaSize) > 0 ? parseFloat(marlaSize) : L.marlaSqft || 272.25;
    return {
      marla: m,
      kanal: m * (L.marlaPerKanal || 20),
      acre: m * (L.marlaPerAcre || 160),
      sqft: 1,
      sqyd: L.sqftPerSqYard || 9,
      sqm: L.sqftPerSqMeter || 10.7639104167,
    };
  }, [marlaSize, L]);

  const names = { marla: 'Marla', kanal: 'Kanal', acre: 'Acre', sqft: 'Square feet', sqyd: 'Square yards', sqm: 'Square meters' };
  const v = parseFloat(val);
  const ok = isFinite(v) && v >= 0;
  const sqft = ok ? v * f[unit] : NaN;

  return (
    <div className="dk-tool">
      <div className="dk-row">
        <label>
          Area
          <input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Area" />
        </label>
        <label>
          Unit
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {Object.keys(names).map((k) => (
              <option key={k} value={k}>
                {names[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Marla size (sq ft)
          <input inputMode="decimal" value={marlaSize} onChange={(e) => setMarlaSize(e.target.value)} aria-label="Marla size in square feet" />
        </label>
      </div>
      {!ok && <p className="dk-err">Enter a number of zero or more.</p>}
      <div className="dk-res" aria-live="polite">
        {Object.keys(names).map((k) => (
          <div key={k} className={'dk-box' + (k === unit ? ' me' : '')}>
            <span>{names[k]}</span>
            <b>{ok ? fmt(sqft / f[k]) : '-'}</b>
          </div>
        ))}
      </div>
      <p className="dk-fine">Standard marla = {fmt(L.marlaSqft || 272.25)} sq ft. Figures checked {L.checked || ''}.</p>
    </div>
  );
}
