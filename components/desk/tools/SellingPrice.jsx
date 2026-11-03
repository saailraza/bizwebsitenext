'use client';
import { useMemo, useState } from 'react';
import { pricing, checkPrice } from '@/lib/industry';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';

export default function SellingPrice() {
  const [o, setO] = useState({ mode: 'margin' });
  const [c, setC] = useState({});
  const r = useMemo(() => pricing(o), [o]);
  const k = useMemo(() => checkPrice(c), [c]);
  const set = (k2, v) => setO((x) => ({ ...x, [k2]: v }));
  return (
    <div className="dk-tool">
      <div className="dk-cols">
        <fieldset className="dk-fs">
          <legend>Find the selling price</legend>
          <label>
            Cost of the item (Rs.)
            <input inputMode="decimal" value={o.cost || ''} onChange={(e) => set('cost', e.target.value)} />
          </label>
          <label>
            I want to set
            <select value={o.mode} onChange={(e) => set('mode', e.target.value)}>
              <option value="margin">Profit margin (% of selling price)</option>
              <option value="markup">Markup (% on top of cost)</option>
            </select>
          </label>
          <label>
            {o.mode === 'margin' ? 'Margin (%)' : 'Markup (%)'}
            <input inputMode="decimal" value={o.pct || ''} onChange={(e) => set('pct', e.target.value)} />
          </label>
          <label>
            Sales tax to add, if you charge it (%)
            <input inputMode="decimal" value={o.tax || ''} onChange={(e) => set('tax', e.target.value)} />
          </label>
          {r.error ? (
            <p className="dk-fine">{r.error}</p>
          ) : (
            <div className="dk-res" aria-live="polite">
              <div className="dk-box">
                <span>Selling price</span>
                <b>{money(r.price)}</b>
              </div>
              <div className="dk-box">
                <span>Profit per item</span>
                <b>{money(r.profit)}</b>
              </div>
              <div className="dk-box">
                <span>Margin / markup</span>
                <b>
                  {fx(r.margin, 1)}% / {fx(r.markup, 1)}%
                </b>
              </div>
              {r.tax > 0 && (
                <div className="dk-box">
                  <span>Price with sales tax</span>
                  <b>{money(r.final)}</b>
                </div>
              )}
            </div>
          )}
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Check a price you already use</legend>
          <label>
            Cost (Rs.)
            <input inputMode="decimal" value={c.cost || ''} onChange={(e) => setC((x) => ({ ...x, cost: e.target.value }))} />
          </label>
          <label>
            Selling price (Rs.)
            <input inputMode="decimal" value={c.price || ''} onChange={(e) => setC((x) => ({ ...x, price: e.target.value }))} />
          </label>
          {k.error ? (
            <p className="dk-fine">{k.error}</p>
          ) : (
            <div className="dk-res" aria-live="polite">
              <div className={'dk-box' + (k.profit < 0 ? ' bad' : '')}>
                <span>Profit per item</span>
                <b>{money(k.profit)}</b>
              </div>
              <div className="dk-box">
                <span>Margin</span>
                <b>{fx(k.margin, 1)}%</b>
              </div>
              <div className="dk-box">
                <span>Markup</span>
                <b>{fx(k.markup, 1)}%</b>
              </div>
            </div>
          )}
        </fieldset>
      </div>
      <p className="dk-fine">Selling price shown is before any sales tax. Margin and markup are not the same: a 20% markup is a 16.7% margin.</p>
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={() => { setO({ mode: 'margin' }); setC({}); }}>
          Clear
        </button>
      </div>
    </div>
  );
}
