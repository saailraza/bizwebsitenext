'use client';
import { useMemo, useState } from 'react';
import { buildCalendar, effDate, weekday, niceDate, toIcs, MONTHS, parseIso } from '@/lib/calendar';
import { downloadCsv } from '@/lib/deskExport';

const localToday = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
};
const ENTITIES = {
  fbr: [['individual', 'Individual (salaried or business)'], ['aop', 'Association of persons (partnership or firm)'], ['company', 'Company (private limited)']],
  all: [['company', 'Private limited company'], ['smc', 'Single member company'], ['aop', 'Partnership or association of persons'], ['individual', 'Individual or sole proprietor']],
};

function saveFile(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

export default function ComplianceCalendar({ mode, rates }) {
  const cal = rates && rates.calendar;
  const all = mode === 'all';
  const [o, setO] = useState({ entity: all ? 'company' : 'individual', fyEnd: '6', salesTax: false, withholding: false, advance: false, agm: '', inc: '' });
  const [months, setMonths] = useState('12');
  const [filter, setFilter] = useState('All');
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }));
  const isCo = o.entity === 'company' || o.entity === 'smc';

  const res = useMemo(() => {
    if (!cal) return null;
    return buildCalendar({ ...o, scope: all ? 'all' : 'fbr' }, cal, localToday(), Number(months));
  }, [o, months, cal, all]);
  if (!res) return <p className="dk-load">Calendar data is not available.</p>;
  const shown = res.events.filter((e) => filter === 'All' || e.kind === filter);

  function csv() {
    const rows = [['Date', 'Day', 'Authority', 'Obligation', 'Who', 'Basis', 'Original date (if extended)', 'Source']];
    shown.forEach((e) => rows.push([effDate(e), weekday(effDate(e)), e.kind, e.title, e.who, e.basis + (e.extNote ? ' ' + e.extNote : ''), e.extendedTo ? e.date : '', e.source]));
    downloadCsv(all ? 'compliance-calendar' : 'fbr-due-dates', rows);
  }
  function ics() {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    saveFile(all ? 'compliance-calendar.ics' : 'fbr-due-dates.ics', toIcs(shown, stamp), 'text/calendar;charset=utf-8');
  }

  let lastMonth = '';
  return (
    <div className="dk-tool dk-calw">
      <div className="dk-noprint">
        <div className="dk-row">
          <label>
            {all ? 'Business type' : 'Taxpayer type'}
            <select value={o.entity} onChange={(e) => set('entity', e.target.value)}>
              {ENTITIES[all ? 'all' : 'fbr'].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Financial year ends in
            <select value={o.fyEnd} onChange={(e) => set('fyEnd', e.target.value)}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                  {i === 5 ? ' (30 June, most common for tax)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Show next
            <select value={months} onChange={(e) => setMonths(e.target.value)}>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
              <option value="18">18 months</option>
            </select>
          </label>
        </div>
        {all && o.entity === 'company' && (
          <div className="dk-row">
            <label>
              Date of your annual general meeting (optional)
              <input type="date" value={o.agm} onChange={(e) => set('agm', e.target.value)} />
            </label>
            <label>
              Date of incorporation (optional, for first AGM)
              <input type="date" value={o.inc} onChange={(e) => set('inc', e.target.value)} />
            </label>
          </div>
        )}
        <div className="dk-opts">
          <label>
            <input type="checkbox" checked={o.salesTax} onChange={(e) => set('salesTax', e.target.checked)} /> Registered for federal sales tax
          </label>
          <label>
            <input type="checkbox" checked={o.withholding} onChange={(e) => set('withholding', e.target.checked)} /> I deduct withholding tax from payments
          </label>
          <label>
            <input type="checkbox" checked={o.advance} onChange={(e) => set('advance', e.target.checked)} /> I pay advance tax
          </label>
        </div>
        {all && (
          <div className="dk-opts" role="group" aria-label="Show">
            {['All', 'FBR', 'SECP'].map((f) => (
              <button key={f} type="button" className={'dk-chip' + (filter === f ? ' on' : '')} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        )}
        <div className="dk-act">
          <button type="button" className="btn" onClick={() => window.print()}>
            Print or save as PDF
          </button>
          <button type="button" className="btn o" onClick={csv} disabled={!shown.length}>
            Download Excel (CSV)
          </button>
          <button type="button" className="btn o" onClick={ics} disabled={!shown.length}>
            Add to my calendar (.ics)
          </button>
        </div>
      </div>

      <div className="dk-cal" aria-live="polite">
        <h2 className="dk-calh">
          {all ? 'Compliance calendar' : 'FBR due dates'}, {niceDate(res.from)} to {niceDate(res.to)}
        </h2>
        {shown.length === 0 ? (
          <p className="dk-fine">No dates fall in this period for the options chosen. Tick the boxes that apply to you, or look further ahead.</p>
        ) : (
          <ul className="dk-evs">
            {shown.map((e) => {
              const d = effDate(e);
              const m = d.slice(0, 7);
              const head = m !== lastMonth ? ((lastMonth = m), `${MONTHS[parseIso(d).getUTCMonth()]} ${d.slice(0, 4)}`) : null;
              const wk = weekday(d);
              return (
                <li key={e.key + d}>
                  {head && <h3 className="dk-mon">{head}</h3>}
                  <div className="dk-ev">
                    <div className="dk-evd">
                      <b>{niceDate(d)}</b>
                      <span>{wk}</span>
                    </div>
                    <div className="dk-evb">
                      <span className={'dk-tag ' + e.kind}>{e.kind}</span> <strong>{e.title}</strong>
                      <div className="dk-fine2">
                        {e.who}. {e.basis}
                      </div>
                      {e.extendedTo && (
                        <div className="dk-ext">
                          Extended by FBR from {niceDate(e.date)} to {niceDate(e.extendedTo)}. {e.extNote}{' '}
                          <a href={e.extSource} target="_blank" rel="noopener noreferrer">
                            Source
                          </a>
                        </div>
                      )}
                      {d.endsWith('-12-25') && <div className="dk-fine2">25 December is a public holiday (Quaid-e-Azam Day). Check whether FBR announces special payment arrangements.</div>}
                      {(wk === 'Saturday' || wk === 'Sunday') && <div className="dk-fine2">This date falls on a {wk}. Confirm whether the due date moves to the next working day.</div>}
                      {e.note && <div className="dk-fine2">{e.note}</div>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {res.notes.length > 0 && (
          <div className="dk-notes">
            <b>Please note</b>
            <ul>
              {res.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="dk-fine">
          Dates checked on {niceDate(cal.checked)}. FBR often extends deadlines by notification, so confirm on the FBR or SECP website before you rely on a date. Sources:{' '}
          {Object.entries(cal.sources)
            .filter(([k]) => (all ? true : !k.startsWith('secp')))
            .map(([k, s], i) => (
              <span key={k}>
                {i ? ', ' : ''}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              </span>
            ))}
          .
        </p>
      </div>
    </div>
  );
}
