// BIZEASE DESK document tools: configuration and pure helpers (no browser or file access, safe anywhere).

export const MODES = ['Cash', 'Bank transfer', 'Cheque', 'Online (Easypaisa, JazzCash, card)', 'Other'];

export const r2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
export const num = (s) => {
  const v = parseFloat(String(s ?? '').replace(/,/g, '').trim());
  return isFinite(v) ? v : 0;
};
export const money = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Totals for a list of {qty, price} rows. discount is a flat amount taken off before tax. */
export function totals(items, discount, taxRate) {
  const lines = items.map((it) => r2(num(it.qty) * num(it.price)));
  const sub = r2(lines.reduce((a, b) => a + b, 0));
  const disc = Math.min(Math.max(r2(num(discount)), 0), sub);
  const taxable = r2(sub - disc);
  const rate = Math.max(num(taxRate), 0);
  const tax = r2((taxable * rate) / 100);
  return { lines, sub, disc, taxable, rate, tax, total: r2(taxable + tax) };
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function below1000(n) {
  const out = [];
  if (n >= 100) {
    out.push(ONES[Math.floor(n / 100)] + ' hundred');
    n %= 100;
  }
  if (n >= 20) {
    out.push(TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
  } else if (n > 0) out.push(ONES[n]);
  return out.join(' ');
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** 1250.5 -> "Rupees one thousand two hundred fifty and fifty paisa only" (lakh / crore system). Empty if out of range. */
export function rupeesInWords(amount) {
  const a = r2(amount);
  if (!isFinite(a) || a < 0 || a >= 1e12) return '';
  let rs = Math.floor(a);
  const ps = Math.round((a - rs) * 100);
  const parts = [];
  const crore = Math.floor(rs / 1e7);
  rs %= 1e7;
  const lakh = Math.floor(rs / 1e5);
  rs %= 1e5;
  const th = Math.floor(rs / 1e3);
  rs %= 1e3;
  if (crore) parts.push((crore >= 1000 ? below1000(Math.floor(crore / 1000)) + ' thousand ' : '') + below1000(crore % 1000) + ' crore');
  if (lakh) parts.push(below1000(lakh) + ' lakh');
  if (th) parts.push(below1000(th) + ' thousand');
  if (rs) parts.push(below1000(rs));
  let s = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!s && !ps) s = 'zero';
  const out = [];
  if (s) out.push('Rupees ' + s);
  if (ps) out.push((s ? '' : 'Rupees zero and ') + below1000(ps) + ' paisa');
  let t = out.join(' and ');
  if (s && ps) t = 'Rupees ' + s + ' and ' + below1000(ps) + ' paisa';
  return cap(t.replace(/^Rupees zero and /, '')) + ' only';
}

const f = (k, label, extra = {}) => ({ k, label, ...extra });

// Each kind describes one tool. `items` = line-item table, otherwise a single-amount document.
export const KINDS = {
  invoice: {
    title: 'Sales Tax Invoice',
    prefix: 'INV-',
    party: 'Buyer',
    fields: [f('no', 'Invoice no.'), f('date', 'Invoice date', { type: 'date' }), f('pname', 'Buyer name'), f('pid', 'Buyer NTN, CNIC or STRN'), f('paddr', 'Buyer address', { wide: true }), f('ref', 'Buyer PO or reference'), f('terms', 'Payment terms')],
    items: { cols: ['desc', 'qty', 'unit', 'price'], tax: true, discount: true, taxLabel: 'Sales tax' },
    notes: 'Notes or bank details',
    sign: ['Authorised signature'],
    checklist: true,
    file: 'sales-tax-invoice',
  },
  quote: {
    title: 'Quotation',
    prefix: 'QT-',
    party: 'Prepared for',
    fields: [f('no', 'Quotation no.'), f('date', 'Date', { type: 'date' }), f('valid', 'Valid until', { type: 'date' }), f('pname', 'Customer name'), f('paddr', 'Customer address', { wide: true }), f('ref', 'Subject or project')],
    items: { cols: ['desc', 'qty', 'unit', 'price'], tax: true, discount: true, taxLabel: 'Sales tax', taxDefault: 0 },
    notes: 'Terms (delivery, payment, warranty)',
    sign: ['Authorised signature'],
    file: 'quotation',
  },
  memo: {
    title: 'Cash Memo',
    prefix: 'CM-',
    party: 'Customer',
    fields: [f('no', 'Memo no.'), f('date', 'Date', { type: 'date' }), f('pname', 'Customer name (optional)'), f('phone', 'Customer phone (optional)')],
    items: { cols: ['desc', 'qty', 'unit', 'price'], tax: true, discount: true, taxLabel: 'Tax', taxDefault: 0 },
    notes: 'Note (return or exchange policy)',
    sign: ['Received with thanks'],
    file: 'cash-memo',
  },
  challan: {
    title: 'Delivery Challan',
    prefix: 'DC-',
    party: 'Deliver to',
    fields: [f('no', 'Challan no.'), f('date', 'Date', { type: 'date' }), f('pname', 'Deliver to (name)'), f('paddr', 'Delivery address', { wide: true }), f('ref', 'Order or PO no.'), f('vehicle', 'Vehicle no.'), f('driver', 'Driver name and phone')],
    items: { cols: ['desc', 'qty', 'unit', 'remark'] },
    notes: 'Notes',
    sign: ['Delivered by', 'Received by (name, signature, date)'],
    file: 'delivery-challan',
  },
  po: {
    title: 'Purchase Order',
    prefix: 'PO-',
    party: 'Vendor',
    fields: [f('no', 'PO no.'), f('date', 'Date', { type: 'date' }), f('pname', 'Vendor name'), f('pid', 'Vendor NTN or STRN'), f('paddr', 'Vendor address', { wide: true }), f('ref', 'Vendor quotation ref.'), f('delivery', 'Delivery date', { type: 'date' }), f('dest', 'Deliver to', { wide: true }), f('terms', 'Payment terms')],
    items: { cols: ['desc', 'qty', 'unit', 'price'], tax: true, discount: true, taxLabel: 'Sales tax', taxDefault: 0 },
    notes: 'Terms and conditions',
    sign: ['Prepared by', 'Authorised by'],
    file: 'purchase-order',
  },
  receipt: {
    title: 'Payment Receipt',
    prefix: 'RC-',
    party: 'Received from',
    fields: [f('no', 'Receipt no.'), f('date', 'Date', { type: 'date' }), f('pname', 'Received from'), f('amount', 'Amount received', { type: 'number' }), f('purpose', 'Payment for', { wide: true }), f('mode', 'Payment mode', { type: 'select', opts: MODES }), f('refno', 'Cheque or transaction no.'), f('invref', 'Against invoice no.'), f('due', 'Total amount due (optional)', { type: 'number' })],
    simple: true,
    balance: true,
    sign: ['Received by'],
    file: 'payment-receipt',
  },
  voucher: {
    title: 'Voucher',
    prefix: 'V-',
    party: 'Paid to / received from',
    fields: [f('vtype', 'Voucher type', { type: 'select', opts: ['Payment', 'Receipt'] }), f('no', 'Voucher no.'), f('date', 'Date', { type: 'date' }), f('pname', 'Paid to or received from'), f('head', 'Account head'), f('amount', 'Amount', { type: 'number' }), f('mode', 'Payment mode', { type: 'select', opts: MODES }), f('refno', 'Cheque or transaction no.'), f('purpose', 'Narration', { wide: true })],
    simple: true,
    sign: ['Prepared by', 'Checked by', 'Approved by', 'Received by'],
    file: 'voucher',
  },
};

export const COL_LABEL = { desc: 'Description', qty: 'Qty', unit: 'Unit', price: 'Rate', remark: 'Remarks' };

/** The particulars section 23(1) of the Sales Tax Act 1990 lists for a tax invoice. */
export function invoiceChecklist(v, items, profile, t) {
  const has = (s) => String(s || '').trim().length > 0;
  const rows = items.filter((i) => has(i.desc));
  return [
    ['Serial number', has(v.no)],
    ['Supplier name', has(profile.name)],
    ['Supplier address', has(profile.address)],
    ['Supplier registration number (STRN or NTN)', has(profile.strn) || has(profile.ntn)],
    ['Buyer name', has(v.pname)],
    ['Buyer address', has(v.paddr)],
    ['Buyer registration number (NTN, CNIC or STRN)', has(v.pid)],
    ['Date of issue', has(v.date)],
    ['Description and quantity of goods', rows.length > 0 && rows.every((i) => num(i.qty) > 0)],
    ['Value excluding tax, tax amount and value including tax', t.sub > 0],
  ].map(([label, ok]) => ({ label, ok }));
}
