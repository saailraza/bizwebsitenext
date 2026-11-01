'use client';
import { useMemo, useState } from 'react';
import BusinessProfile from '../BusinessProfile';
import { KINDS, COL_LABEL, totals, num, money, rupeesInWords, invoiceChecklist } from '@/lib/docKinds';
import { downloadCsv } from '@/lib/deskExport';
import { EMPTY_PROFILE } from '@/lib/businessProfile';

const today = () => new Date().toISOString().slice(0, 10);
const blankItem = () => ({ desc: '', qty: '1', unit: '', price: '', remark: '' });
const MAX_ITEMS = 40;
const PARTY = ['pname', 'pid', 'paddr', 'phone'];

function initial(K) {
  const v = {};
  K.fields.forEach((f) => {
    v[f.k] = f.k === 'no' ? K.prefix + '0001' : f.k === 'date' ? today() : f.type === 'select' ? f.opts[0] : '';
  });
  return v;
}
const dmy = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s.split('-').reverse().join('-') : s || '');

export default function DocMaker({ kind, rates }) {
  const K = KINDS[kind];
  const [v, setV] = useState(() => initial(K));
  const [items, setItems] = useState(() => [blankItem()]);
  const [taxRate, setTaxRate] = useState(() => String(K.items && K.items.taxDefault != null ? K.items.taxDefault : (rates && rates.salesTax && rates.salesTax.federal) || 18));
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [words, setWords] = useState(true);
  const [brand, setBrand] = useState(true);
  const [profile, setProfile] = useState(EMPTY_PROFILE);

  const set = (k, val) => setV((o) => ({ ...o, [k]: val }));
  const setItem = (i, k, val) => setItems((a) => a.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const hasPrice = !!(K.items && K.items.cols.includes('price'));
  const T = useMemo(() => (K.items ? totals(items, K.items.discount ? discount : 0, K.items.tax ? taxRate : 0) : null), [items, discount, taxRate, K]);
  const amount = K.simple ? Math.max(num(v.amount), 0) : 0;
  const grand = K.simple ? amount : T && hasPrice ? T.total : 0;
  const title = kind === 'voucher' ? `${v.vtype} Voucher` : K.title;
  const due = num(v.due);
  const bad = (K.items && items.some((i) => num(i.qty) < 0 || num(i.price) < 0)) || (K.simple && num(v.amount) < 0);
  const check = K.checklist && T ? invoiceChecklist(v, items, profile, T) : null;
  const showTax = K.items && K.items.tax && (kind === 'invoice' || T.rate > 0);
  const filled = items.filter((i) => i.desc.trim() || num(i.price) > 0);

  function printIt() {
    const old = document.title;
    document.title = `${K.file}-${(v.no || 'draft').replace(/[^\w-]+/g, '')}`;
    window.print();
    setTimeout(() => (document.title = old), 800);
  }
  function csv() {
    const rows = [[title], ['Number', v.no], ['Date', dmy(v.date)], [], ['Business', profile.name], ['NTN', profile.ntn], ['STRN', profile.strn], []];
    K.fields.forEach((f) => !['no', 'date'].includes(f.k) && rows.push([f.label, v[f.k]]));
    if (K.items) {
      rows.push([], ['#', ...K.items.cols.map((c) => COL_LABEL[c]), ...(hasPrice ? ['Amount'] : [])]);
      filled.forEach((it, i) => rows.push([i + 1, ...K.items.cols.map((c) => (c === 'qty' || c === 'price' ? num(it[c]) : it[c])), ...(hasPrice ? [T.lines[items.indexOf(it)]] : [])]));
      if (hasPrice) {
        rows.push([], ['Subtotal', T.sub]);
        if (T.disc) rows.push(['Discount', T.disc]);
        if (showTax) rows.push([`${K.items.taxLabel} ${T.rate}%`, T.tax]);
        rows.push(['Total', T.total]);
      }
    }
    downloadCsv(`${K.file}-${(v.no || 'draft').replace(/[^\w-]+/g, '')}`, rows);
  }
  function reset() {
    setV(initial(K));
    setItems([blankItem()]);
    setDiscount('');
    setNotes('');
  }

  const partyLines = PARTY.filter((k) => K.fields.some((f) => f.k === k) && v[k]);
  const metaFields = K.fields.filter((f) => !['no', 'date', 'vtype', ...PARTY].includes(f.k) && !(K.simple && ['amount'].includes(f.k)) && v[f.k]);

  return (
    <div className="dk-tool dk-doc">
      <div className="dk-noprint">
        <BusinessProfile onChange={setProfile} />
        <div className="dk-row">
          {K.fields.map((f) => (
            <label key={f.k} className={f.wide ? 'wide' : ''}>
              {f.label}
              {f.type === 'select' ? (
                <select value={v[f.k]} onChange={(e) => set(f.k, e.target.value)}>
                  {f.opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input type={f.type === 'date' ? 'date' : 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} maxLength={f.wide ? 240 : 120} value={v[f.k]} onChange={(e) => set(f.k, e.target.value)} />
              )}
            </label>
          ))}
        </div>

        {K.items && (
          <div className="dk-items">
            <h3>Items</h3>
            {items.map((it, i) => (
              <div className="dk-item" key={i}>
                {K.items.cols.map((c) => (
                  <input
                    key={c}
                    className={'c-' + c}
                    aria-label={`${COL_LABEL[c]}, item ${i + 1}`}
                    placeholder={COL_LABEL[c]}
                    inputMode={c === 'qty' || c === 'price' ? 'decimal' : undefined}
                    maxLength={c === 'desc' || c === 'remark' ? 200 : 40}
                    value={it[c]}
                    onChange={(e) => setItem(i, c, e.target.value)}
                  />
                ))}
                {hasPrice && <span className="dk-line">{money(T.lines[i])}</span>}
                <button type="button" className="dk-x" aria-label={`Remove item ${i + 1}`} disabled={items.length === 1} onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="btn o" disabled={items.length >= MAX_ITEMS} onClick={() => setItems((a) => [...a, blankItem()])}>
              Add item
            </button>
            {(K.items.tax || K.items.discount) && (
              <div className="dk-row dk-tt">
                {K.items.discount && (
                  <label>
                    Discount (Rs., before tax)
                    <input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  </label>
                )}
                {K.items.tax && (
                  <label>
                    {K.items.taxLabel} rate (%)
                    <input inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {K.notes && (
          <label className="dk-ta">
            {K.notes}
            <textarea rows={3} maxLength={800} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        )}
        <div className="dk-opts">
          {(K.simple || hasPrice) && (
            <label>
              <input type="checkbox" checked={words} onChange={(e) => setWords(e.target.checked)} /> Show amount in words
            </label>
          )}
          <label>
            <input type="checkbox" checked={brand} onChange={(e) => setBrand(e.target.checked)} /> Add "Prepared with BIZEASE DESK" line
          </label>
        </div>
        {bad && <p className="dk-err">Quantities, rates and amounts cannot be negative.</p>}
        {check && (
          <div className="dk-check">
            <b>Particulars section 23(1) asks for</b>
            <ul>
              {check.map((c) => (
                <li key={c.label} className={c.ok ? 'ok' : 'no'}>
                  <span aria-hidden="true">{c.ok ? '✓' : '✗'}</span> {c.label}
                  <span className="sr"> {c.ok ? 'added' : 'missing'}</span>
                </li>
              ))}
            </ul>
            <p className="dk-fine">A cross means that detail is blank. Fill it in if your sale needs it. This check is a reminder, not legal advice.</p>
          </div>
        )}
        <div className="dk-act">
          <button type="button" className="btn" onClick={printIt}>
            Print or save as PDF
          </button>
          <button type="button" className="btn o" onClick={csv}>
            Download Excel (CSV)
          </button>
          <button type="button" className="btn o" onClick={reset}>
            Clear form
          </button>
        </div>
        <p className="dk-fine">In the print window choose "Save as PDF" as the printer to get a PDF file. Preview below is what prints.</p>
      </div>

      <div className="dk-sheet" id="dk-sheet" aria-label={`${title} preview`}>
        <div className="sh-top">
          <div className="sh-biz">
            {profile.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logo} alt="" className="sh-logo" />
            )}
            <div>
              <b>{profile.name || 'Your business name'}</b>
              {(profile.ntn || profile.strn) && (
                <div>
                  {profile.ntn ? `NTN: ${profile.ntn}` : ''}
                  {profile.ntn && profile.strn ? '  |  ' : ''}
                  {profile.strn ? `STRN: ${profile.strn}` : ''}
                </div>
              )}
              {profile.address && <div>{profile.address}</div>}
              {(profile.phone || profile.email) && <div>{[profile.phone, profile.email].filter(Boolean).join('  |  ')}</div>}
            </div>
          </div>
          <div className="sh-title">
            <h2>{title.toUpperCase()}</h2>
            <div>No: {v.no}</div>
            <div>Date: {dmy(v.date)}</div>
          </div>
        </div>

        {partyLines.length > 0 && (
          <div className="sh-party">
            <small>{K.party}</small>
            {partyLines.map((k) => (
              <div key={k} className={k === 'pname' ? 'b' : ''}>
                {k === 'pid' ? `${K.fields.find((f) => f.k === k).label}: ` : ''}
                {v[k]}
              </div>
            ))}
          </div>
        )}
        {metaFields.length > 0 && (
          <table className="sh-meta">
            <tbody>
              {metaFields.map((f) => (
                <tr key={f.k}>
                  <th>{f.label}</th>
                  <td>{f.type === 'date' ? dmy(v[f.k]) : v[f.k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {K.items && (
          <table className="sh-items">
            <thead>
              <tr>
                <th>#</th>
                {K.items.cols.map((c) => (
                  <th key={c} className={c === 'qty' || c === 'price' ? 'r' : ''}>
                    {COL_LABEL[c]}
                  </th>
                ))}
                {hasPrice && <th className="r">Amount</th>}
              </tr>
            </thead>
            <tbody>
              {(filled.length ? filled : [blankItem()]).map((it, n) => (
                <tr key={n}>
                  <td>{n + 1}</td>
                  {K.items.cols.map((c) => (
                    <td key={c} className={c === 'qty' || c === 'price' ? 'r' : ''}>
                      {c === 'price' ? (it.price ? money(num(it.price)) : '') : it[c]}
                    </td>
                  ))}
                  {hasPrice && <td className="r">{filled.length ? money(T.lines[items.indexOf(it)]) : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {K.items && hasPrice && (
          <table className="sh-tot">
            <tbody>
              {(T.disc > 0 || showTax) && (
                <tr>
                  <th>{showTax ? 'Value excluding tax' : 'Subtotal'}</th>
                  <td>{money(T.disc > 0 ? T.taxable : T.sub)}</td>
                </tr>
              )}
              {T.disc > 0 && (
                <tr>
                  <th>Discount</th>
                  <td>{money(T.disc)}</td>
                </tr>
              )}
              {showTax && (
                <tr>
                  <th>
                    {K.items.taxLabel} @ {T.rate}%
                  </th>
                  <td>{money(T.tax)}</td>
                </tr>
              )}
              <tr className="grand">
                <th>{showTax ? 'Value including tax' : 'Total'} (Rs.)</th>
                <td>{money(T.total)}</td>
              </tr>
            </tbody>
          </table>
        )}

        {K.simple && (
          <table className="sh-tot sh-amt">
            <tbody>
              {K.balance && due > 0 && (
                <tr>
                  <th>Total due</th>
                  <td>{money(due)}</td>
                </tr>
              )}
              <tr className="grand">
                <th>Amount (Rs.)</th>
                <td>{money(amount)}</td>
              </tr>
              {K.balance && due > 0 && (
                <tr>
                  <th>Balance after this payment</th>
                  <td>{money(Math.max(due - amount, 0))}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {words && grand > 0 && (K.simple || hasPrice) && <p className="sh-words">{rupeesInWords(grand)}</p>}
        {notes && <p className="sh-notes">{notes}</p>}

        <div className="sh-sign">
          {K.sign.map((s, i) => (
            <div key={s}>
              <div className="sg">
                {i === 0 && profile.signature && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.signature} alt="" />
                )}
                {i === 0 && profile.stamp && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.stamp} alt="" className="st" />
                )}
              </div>
              <span>{s}</span>
            </div>
          ))}
        </div>
        {brand && <div className="sh-foot">Prepared with BIZEASE DESK, bizeasesolutions.online</div>}
      </div>
    </div>
  );
}
