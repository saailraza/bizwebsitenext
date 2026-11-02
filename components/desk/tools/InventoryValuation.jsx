'use client';
import { useMemo, useState } from 'react';
import { inventory } from '@/lib/cfo2';
import { money, num } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';

const q = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 4 });

export default function InventoryValuation() {
  const [open, setOpen] = useState({ qty: '', cost: '' });
  const [buys, setBuys] = useState([{ qty: '', cost: '' }]);
  const [sold, setSold] = useState('');
  const [rev, setRev] = useState('');
  const r = useMemo(() => inventory({ opening: open, purchases: buys, sold, revenue: rev }), [open, buys, sold, rev]);
  const setB = (i, k, v) => setBuys((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  function csv() {
    if (r.error) return;
    const rows = [['Inventory valuation'], [], ['Method', 'Cost of goods sold', 'Closing inventory', 'Gross profit'], ['FIFO', r.fifo.cogs, r.fifo.closing, r.fifo.profit ?? ''], ['Weighted average', r.wa.cogs, r.wa.closing, r.wa.profit ?? '']];
    downloadCsv('inventory-valuation', rows);
  }
  return (
    <div className="dk-tool">
      <div className="dk-cols">
        <fieldset className="dk-fs">
          <legend>Opening stock</legend>
          <label>
            Units
            <input inputMode="decimal" value={open.qty} onChange={(e) => setOpen((x) => ({ ...x, qty: e.target.value }))} />
          </label>
          <label>
            Cost per unit (Rs.)
            <input inputMode="decimal" value={open.cost} onChange={(e) => setOpen((x) => ({ ...x, cost: e.target.value }))} />
          </label>
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Purchases, in the order bought</legend>
          {buys.map((b, i) => (
            <div className="dk-ln" key={i}>
              <input aria-label={`Purchase units ${i + 1}`} placeholder="Units" inputMode="decimal" value={b.qty} onChange={(e) => setB(i, 'qty', e.target.value)} />
              <input aria-label={`Purchase cost per unit ${i + 1}`} placeholder="Cost per unit" inputMode="decimal" value={b.cost} onChange={(e) => setB(i, 'cost', e.target.value)} />
              <button type="button" className="dk-x" aria-label={`Remove purchase ${i + 1}`} disabled={buys.length === 1} onClick={() => setBuys((a) => a.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="btn o dk-noprint" disabled={buys.length >= 20} onClick={() => setBuys((a) => [...a, { qty: '', cost: '' }])}>
            Add purchase
          </button>
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Sales in the period</legend>
          <label>
            Units sold
            <input inputMode="decimal" value={sold} onChange={(e) => setSold(e.target.value)} />
          </label>
          <label>
            Sales revenue (Rs., optional)
            <input inputMode="decimal" value={rev} onChange={(e) => setRev(e.target.value)} />
          </label>
        </fieldset>
      </div>
      {r.error ? (
        <p className="dk-err">{r.error}</p>
      ) : (
        <div aria-live="polite">
          <p className="dk-fine">
            Units available: {q(r.avail)}. Units left: {q(r.closingUnits)}. Total cost of stock available: Rs. {money(r.totalCost)}. Weighted average cost: Rs. {money(r.avg)} per unit.
          </p>
          <div className="dk-scroll">
            <table className="dk-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th className="r">Cost of goods sold</th>
                  <th className="r">Closing inventory</th>
                  <th className="r">Gross profit</th>
                </tr>
              </thead>
              <tbody>
                {[['FIFO (first in, first out)', r.fifo], ['Weighted average', r.wa]].map(([n, m]) => (
                  <tr key={n}>
                    <td>{n}</td>
                    <td className="r">{money(m.cogs)}</td>
                    <td className="r">{money(m.closing)}</td>
                    <td className="r">{m.profit === null ? '-' : money(m.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {num(sold) > 0 && r.fifo.cogs !== r.wa.cogs && (
            <p className="dk-fine">
              The two methods differ by Rs. {money(Math.abs(r.fifo.cogs - r.wa.cogs))} in cost of goods sold. The method you choose changes reported profit and closing stock, so apply one method consistently.
            </p>
          )}
        </div>
      )}
      <div className="dk-act dk-noprint">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button type="button" className="btn o" onClick={csv} disabled={!!r.error}>
          Download Excel (CSV)
        </button>
      </div>
    </div>
  );
}
