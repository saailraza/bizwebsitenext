'use client';
import { useMemo, useState } from 'react';
import { recipe } from '@/lib/restaurant';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';
import { Field, Box, Actions } from './parts';

export default function RecipeCost() {
  const [items, setItems] = useState([{ label: '', qty: '', price: '' }, { label: '', qty: '', price: '' }, { label: '', qty: '', price: '' }]);
  const [o, setO] = useState({});
  const set = (k) => (v) => setO((x) => ({ ...x, [k]: v }));
  const r = useMemo(() => recipe({ items, ...o }), [items, o]);
  const ch = (i, k, v) => setItems((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="dk-tool">
      <fieldset className="dk-fs">
        <legend>Ingredients</legend>
        <p className="dk-fine">Quantity used is in the same unit as the price. For example 0.25 kg at Rs. 800 per kg.</p>
        {items.map((it, i) => (
          <div className="dk-ln" key={i}>
            <input aria-label={`Ingredient ${i + 1}`} placeholder="Ingredient" maxLength={60} value={it.label} onChange={(e) => ch(i, 'label', e.target.value)} />
            <input aria-label={`Quantity used ${i + 1}`} placeholder="Quantity used" inputMode="decimal" value={it.qty} onChange={(e) => ch(i, 'qty', e.target.value)} />
            <input aria-label={`Price per unit ${i + 1}`} placeholder="Price per unit (Rs.)" inputMode="decimal" value={it.price} onChange={(e) => ch(i, 'price', e.target.value)} />
            <button type="button" className="dk-x" aria-label={`Remove ingredient ${i + 1}`} disabled={items.length === 1} onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn o dk-noprint" disabled={items.length >= 30} onClick={() => setItems((a) => [...a, { label: '', qty: '', price: '' }])}>
          Add ingredient
        </button>
      </fieldset>
      <div className="dk-row">
        <Field id="portions" label="Portions this recipe makes" value={o.portions} onChange={set('portions')} />
        <Field id="waste" label="Waste and trimming allowance (%)" hint="Your own estimate for peel, trim and spoilage." value={o.waste} onChange={set('waste')} />
        <Field id="price" label="Menu price per portion (Rs., optional)" value={o.price} onChange={set('price')} />
      </div>
      <div aria-live="polite">
        {!r ? (
          <p className="dk-fine">Add quantities and prices to see the recipe cost.</p>
        ) : (
          <div className="dk-res">
            <Box label="Recipe cost" value={money(r.total)} />
            {r.per !== undefined && <Box label="Cost per portion" value={money(r.per)} />}
            {r.pct !== undefined && <Box label="Food cost % of price" value={fx(r.pct, 1) + '%'} />}
            {r.profit !== undefined && <Box label="Gross profit per portion" value={money(r.profit)} bad={r.profit < 0} />}
          </div>
        )}
      </div>
      <p className="dk-fine">Food cost % = cost per portion / menu price. It does not include labour, rent or other costs.</p>
      <Actions name="recipe-cost" rows={r ? () => [['Recipe costing'], [], ['Ingredient', 'Cost (Rs.)'], ...r.rows.map((x) => [x.label, x.cost]), [], ['Waste allowance', r.wasteAmt], ['Recipe cost', r.total], ['Cost per portion', r.per ?? ''], ['Food cost %', r.pct === undefined ? '' : Math.round(r.pct * 10) / 10]] : null} onClear={() => { setItems([{ label: '', qty: '', price: '' }]); setO({}); }} />
    </div>
  );
}
