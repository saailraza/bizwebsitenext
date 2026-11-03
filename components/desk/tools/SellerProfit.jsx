'use client';
import { useMemo, useState } from 'react';
import { seller } from '@/lib/industry';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';
import { Field, Box, Actions } from './parts';

export default function SellerProfit() {
  const [o, setO] = useState({});
  const set = (k) => (v) => setO((x) => ({ ...x, [k]: v }));
  const r = useMemo(() => seller(o), [o]);
  const hint = 'Copy this from your marketplace seller account. The tool has no preset fees.';
  return (
    <div className="dk-tool">
      <div className="dk-cols">
        <fieldset className="dk-fs">
          <legend>The product</legend>
          <Field id="sell" label="Selling price (Rs.)" value={o.sell} onChange={set('sell')} />
          <Field id="cost" label="What the product costs you (Rs.)" value={o.cost} onChange={set('cost')} />
          <Field id="units" label="Orders per month (optional)" value={o.units} onChange={set('units')} />
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Marketplace fees</legend>
          <Field id="comm" label="Commission (% of price)" hint={hint} value={o.comm} onChange={set('comm')} />
          <Field id="pay" label="Payment fee (% of price)" value={o.pay} onChange={set('pay')} />
          <Field id="fixed" label="Fixed fee per order (Rs.)" value={o.fixed} onChange={set('fixed')} />
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Other costs per order</legend>
          <Field id="ship" label="Shipping you pay (Rs.)" value={o.ship} onChange={set('ship')} />
          <Field id="ads" label="Advertising per order (Rs.)" value={o.ads} onChange={set('ads')} />
          <Field id="other" label="Packaging and other (Rs.)" value={o.other} onChange={set('other')} />
          <Field id="ret" label="Orders returned (%)" value={o.ret} onChange={set('ret')} />
          <Field id="retCost" label="Cost of each return (Rs.)" hint="Return shipping and goods you cannot resell." value={o.retCost} onChange={set('retCost')} />
        </fieldset>
      </div>
      <div aria-live="polite">
        {r && r.err && <p className="dk-err">{r.err}</p>}
        {r && !r.err && (
          <div className="dk-res">
            <Box label="Profit per order" value={money(r.profit)} bad={r.profit < 0} />
            <Box label="Profit margin" value={fx(r.margin, 1) + '%'} />
            <Box label="Lowest price that breaks even" value={money(r.breakEven)} />
            <Box label="Percentage fees" value={money(r.pctFees)} />
            <Box label="Fixed, shipping and ad costs" value={money(r.fixed)} />
            {r.monthly !== undefined && <Box label="Profit per month" value={money(r.monthly)} bad={r.monthly < 0} />}
          </div>
        )}
      </div>
      <p className="dk-fine">Marketplace fees change often. Check your seller account for the current figures. Tax on your profit is not included.</p>
      <Actions name="seller-profit" rows={r && !r.err ? () => [['Online seller profit'], [], ['Profit per order', r.profit], ['Margin %', Math.round(r.margin * 100) / 100], ['Break-even price', r.breakEven]] : null} onClear={() => setO({})} />
    </div>
  );
}
