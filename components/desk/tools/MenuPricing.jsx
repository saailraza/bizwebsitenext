'use client';
import { useMemo, useState } from 'react';
import { menu } from '@/lib/restaurant';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';
import { Field, Actions } from './parts';

export default function MenuPricing() {
  const [dishes, setDishes] = useState([{ name: '', cost: '', price: '' }, { name: '', cost: '', price: '' }]);
  const [target, setTarget] = useState('');
  const r = useMemo(() => menu({ dishes, target }), [dishes, target]);
  const ch = (i, k, v) => setDishes((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="dk-tool">
      <div className="dk-row">
        <Field id="target" label="Food cost you aim for (% of menu price)" hint="Choose your own target. It differs by type of restaurant." value={target} onChange={setTarget} />
      </div>
      <fieldset className="dk-fs">
        <legend>Dishes</legend>
        {dishes.map((d, i) => (
          <div className="dk-ln" key={i}>
            <input aria-label={`Dish name ${i + 1}`} placeholder="Dish" maxLength={60} value={d.name} onChange={(e) => ch(i, 'name', e.target.value)} />
            <input aria-label={`Cost per portion ${i + 1}`} placeholder="Cost per portion" inputMode="decimal" value={d.cost} onChange={(e) => ch(i, 'cost', e.target.value)} />
            <input aria-label={`Current price ${i + 1}`} placeholder="Current price (optional)" inputMode="decimal" value={d.price} onChange={(e) => ch(i, 'price', e.target.value)} />
            <button type="button" className="dk-x" aria-label={`Remove dish ${i + 1}`} disabled={dishes.length === 1} onClick={() => setDishes((a) => a.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn o dk-noprint" disabled={dishes.length >= 40} onClick={() => setDishes((a) => [...a, { name: '', cost: '', price: '' }])}>
          Add dish
        </button>
      </fieldset>
      <div aria-live="polite">
        {r.err && <p className="dk-err">{r.err}</p>}
        {r.rows.length > 0 && (
          <div className="dk-scroll">
            <table className="dk-table">
              <thead>
                <tr>
                  <th>Dish</th>
                  <th className="r">Cost</th>
                  <th className="r">Suggested price</th>
                  <th className="r">Current price</th>
                  <th className="r">Food cost %</th>
                  <th>Check</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((x, i) => (
                  <tr key={i}>
                    <td>{x.name || `Dish ${i + 1}`}</td>
                    <td className="r">{money(x.cost)}</td>
                    <td className="r">{x.suggested ? money(x.suggested) : '-'}</td>
                    <td className="r">{x.cur ? money(x.cur) : '-'}</td>
                    <td className="r">{x.pct === undefined ? '-' : fx(x.pct, 1) + '%'}</td>
                    <td>{x.over ? 'Above your target' : x.pct === undefined ? '' : 'Within target'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="dk-fine">Suggested price = cost per portion / target food cost %. Add any sales tax or service charge on top of it. Round to a price your customers expect.</p>
      <Actions name="menu-pricing" rows={r.rows.length ? () => [['Menu pricing'], ['Target food cost %', target], [], ['Dish', 'Cost', 'Suggested price', 'Current price', 'Food cost %'], ...r.rows.map((x) => [x.name, x.cost, x.suggested ?? '', x.cur ?? '', x.pct === undefined ? '' : Math.round(x.pct * 10) / 10])] : null} onClear={() => { setDishes([{ name: '', cost: '', price: '' }]); setTarget(''); }} />
    </div>
  );
}
