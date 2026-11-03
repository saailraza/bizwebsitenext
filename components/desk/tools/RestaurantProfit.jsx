'use client';
import { useMemo, useState } from 'react';
import { rprofit } from '@/lib/restaurant';
import { fx } from '@/lib/cfo';
import { money } from '@/lib/docKinds';
import { Field, Box, Actions } from './parts';

export default function RestaurantProfit() {
  const [o, setO] = useState({});
  const set = (k) => (v) => setO((x) => ({ ...x, [k]: v }));
  const r = useMemo(() => rprofit(o), [o]);
  return (
    <div className="dk-tool">
      <div className="dk-row">
        <Field id="sales" label="Sales for the month (Rs.)" value={o.sales} onChange={set('sales')} />
        <Field id="food" label="Food and drink purchases used (Rs.)" value={o.food} onChange={set('food')} />
        <Field id="labour" label="Staff pay and benefits (Rs.)" value={o.labour} onChange={set('labour')} />
        <Field id="rent" label="Rent (Rs.)" value={o.rent} onChange={set('rent')} />
        <Field id="util" label="Electricity, gas, water, internet (Rs.)" value={o.util} onChange={set('util')} />
        <Field id="other" label="Other costs: marketing, repairs, fees (Rs.)" value={o.other} onChange={set('other')} />
      </div>
      <div aria-live="polite">
        {!r ? (
          <p className="dk-fine">Enter the month's sales and costs to see profit.</p>
        ) : (
          <>
            <div className="dk-res">
              <Box label="Profit before tax" value={money(r.profit)} bad={r.profit < 0} />
              <Box label="Profit margin" value={fx(r.margin, 1) + '%'} bad={r.profit < 0} />
              <Box label="Food cost %" value={fx(r.foodPct, 1) + '%'} />
              <Box label="Staff cost %" value={fx(r.labourPct, 1) + '%'} />
              <Box label="Prime cost (food + staff)" value={money(r.prime) + ' (' + fx(r.primePct, 1) + '%)'} />
              <Box label="Break-even sales per month" value={r.breakEven === null ? '-' : money(r.breakEven)} />
            </div>
            {r.profit < 0 && <p className="dk-err">Costs are higher than sales this month.</p>}
          </>
        )}
      </div>
      <p className="dk-fine">Break-even treats food as a cost that rises with sales and everything else as fixed. It is an estimate. Income tax and loan repayments are not included.</p>
      <Actions name="restaurant-profit" rows={r ? () => [['Restaurant profit'], [], ['Sales', o.sales], ['Total costs', r.costs], ['Profit', r.profit], ['Margin %', Math.round(r.margin * 10) / 10], ['Food cost %', Math.round(r.foodPct * 10) / 10], ['Staff cost %', Math.round(r.labourPct * 10) / 10], ['Break-even sales', r.breakEven ?? '']] : null} onClear={() => setO({})} />
    </div>
  );
}
