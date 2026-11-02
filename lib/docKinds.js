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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** '2026-03-05' -> '5 March 2026'. Anything else is returned as typed. */
export function longDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m || +m[2] < 1 || +m[2] > 12) return s || '';
  return `${+m[3]} ${MONTH_NAMES[+m[2] - 1]} ${m[1]}`;
}
/** '2026-03' -> 'March 2026' */
export function longMonth(s) {
  const m = /^(\d{4})-(\d{2})$/.exec(s || '');
  return m && +m[2] >= 1 && +m[2] <= 12 ? `${MONTH_NAMES[+m[2] - 1]} ${m[1]}` : s || '';
}
/** Whole days from a to b counting both ends; 0 if either is missing or b is before a. */
export function daysInclusive(a, b) {
  const x = Date.parse(a + 'T00:00:00Z');
  const y = Date.parse(b + 'T00:00:00Z');
  if (!isFinite(x) || !isFinite(y) || y < x) return 0;
  return Math.round((y - x) / 86400000) + 1;
}

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

  proforma: {
    title: 'Proforma Invoice',
    prefix: 'PI-',
    party: 'Buyer (Bill to)',
    fields: [f('no', 'Proforma invoice no.'), f('date', 'Date', { type: 'date' }), f('valid', 'Valid until', { type: 'date' }), f('pname', 'Buyer name'), f('pid', 'Buyer NTN, CNIC or STRN'), f('paddr', 'Buyer address', { wide: true }), f('ref', 'Buyer PO or reference'), f('terms', 'Payment terms')],
    items: { cols: ['desc', 'qty', 'unit', 'price'], tax: true, discount: true, taxLabel: 'Sales tax', taxDefault: 0 },
    notes: 'Notes, bank details or terms',
    sign: ['Authorised signature'],
    file: 'proforma-invoice',
    banner: 'This is not a tax invoice. It is an advance quote of what the final invoice will contain.',
  },
  note: {
    title: 'Credit Note',
    titleBy: 'vtype',
    prefix: 'CN-',
    party: 'Customer',
    fields: [f('vtype', 'Note type', { type: 'select', opts: ['Credit Note', 'Debit Note'] }), f('no', 'Note no.'), f('date', 'Date', { type: 'date' }), f('pname', 'Customer name'), f('pid', 'Customer NTN, CNIC or STRN'), f('paddr', 'Customer address', { wide: true }), f('invref', 'Against invoice no.'), f('invdate', 'Invoice date', { type: 'date' }), f('reason', 'Reason (return, price correction, discount)', { wide: true })],
    items: { cols: ['desc', 'qty', 'unit', 'price'], tax: true, discount: false, taxLabel: 'Sales tax' },
    notes: 'Notes',
    sign: ['Authorised signature'],
    file: 'credit-debit-note',
  },
  payslip: {
    title: 'Salary Slip',
    prefix: 'PS-',
    fields: [f('no', 'Slip no.'), f('date', 'Date of issue', { type: 'date' }), f('month', 'Salary month', { type: 'month' }), f('ename', 'Employee name'), f('eid', 'Employee ID'), f('edesig', 'Designation'), f('edept', 'Department'), f('ecnic', 'CNIC (optional)'), f('days', 'Days payable (optional)'), f('mode', 'Paid by', { type: 'select', opts: ['Bank transfer', 'Cash', 'Cheque'] }), f('account', 'Bank account (last 4 digits, optional)')],
    lines: { earn: ['Basic salary', 'House rent', 'Medical allowance', 'Utilities allowance'], ded: ['Income tax', 'EOBI', 'Provident fund', 'Loan or advance recovery'] },
    notes: 'Remarks',
    sign: ['Employer', 'Employee'],
    file: 'salary-slip',
  },
  salcert: {
    title: 'Salary Certificate',
    prefix: 'SC-',
    letter: true,
    fields: [f('no', 'Reference no.'), f('date', 'Date', { type: 'date' }), f('ename', 'Employee name'), f('edesig', 'Designation'), f('eid', 'Employee ID (optional)'), f('ecnic', 'CNIC'), f('joined', 'Date of joining', { type: 'date' }), f('gross', 'Gross monthly salary (Rs.)', { type: 'number' }), f('purpose', 'Issued for (bank, embassy, visa)', { wide: true })],
    notes: 'Additional line (optional)',
    sign: ['Authorised signatory'],
    file: 'salary-certificate',
  },
  expcert: {
    title: 'Experience Certificate',
    prefix: 'EC-',
    letter: true,
    fields: [f('no', 'Reference no.'), f('date', 'Date', { type: 'date' }), f('ename', 'Employee name'), f('edesig', 'Last designation'), f('edept', 'Department (optional)'), f('ecnic', 'CNIC (optional)'), f('joined', 'Date of joining', { type: 'date' }), f('left', 'Last working day', { type: 'date' }), f('conduct', 'Remark on work and conduct', { type: 'select', opts: ['was found hard-working and sincere', 'performed duties satisfactorily', 'showed professionalism and good conduct', 'No remark'] })],
    notes: 'Additional line (optional)',
    sign: ['Authorised signatory'],
    file: 'experience-certificate',
  },
  appoint: {
    title: 'Appointment Letter',
    prefix: 'AL-',
    letter: true,
    fields: [f('no', 'Reference no.'), f('date', 'Date', { type: 'date' }), f('ename', 'Employee name'), f('eaddr', 'Employee address', { wide: true }), f('edesig', 'Designation'), f('edept', 'Department (optional)'), f('reports', 'Reports to'), f('joined', 'Joining date', { type: 'date' }), f('gross', 'Gross monthly salary (Rs.)', { type: 'number' }), f('probation', 'Probation (months)'), f('notice', 'Notice period (days)'), f('hours', 'Working hours and days', { wide: true })],
    notes: 'Additional terms (optional)',
    sign: ['For the company', 'Accepted by the employee'],
    file: 'appointment-letter',
  },
  resign: {
    title: 'Resignation Letter',
    prefix: 'RL-',
    letter: true,
    plain: true,
    fields: [f('date', 'Date', { type: 'date' }), f('ename', 'Your name'), f('edesig', 'Your designation'), f('eaddr', 'Your address (optional)', { wide: true }), f('toname', 'Addressed to (name and title)'), f('company', 'Company name'), f('last', 'Last working day', { type: 'date' }), f('reason', 'Reason (optional)', { wide: true })],
    notes: 'Additional line (optional)',
    sign: ['Signature'],
    file: 'resignation-letter',
  },
  leave: {
    title: 'Leave Application',
    prefix: 'LA-',
    letter: true,
    plain: true,
    fields: [f('date', 'Date', { type: 'date' }), f('ename', 'Your name'), f('edesig', 'Your designation'), f('toname', 'Addressed to (name and title)'), f('company', 'Company or organisation'), f('ltype', 'Type of leave', { type: 'select', opts: ['casual leave', 'sick leave', 'annual leave', 'leave without pay', 'leave'] }), f('from', 'From', { type: 'date' }), f('to', 'To', { type: 'date' }), f('reason', 'Reason', { wide: true }), f('contact', 'Contact during leave (optional)')],
    notes: 'Additional line (optional)',
    sign: ['Signature'],
    file: 'leave-application',
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

const rs = (n) => 'Rs. ' + money(n);

/** Letter wording for the HR documents. Returns { to: [lines], subject, paras: [text] }. Pure, so it can be tested. */
export function letterText(kind, v, profile, extra) {
  const biz = (profile && profile.name) || 'the company';
  const n = v.ename || '[employee name]';
  const out = { to: [], subject: '', paras: [] };
  const add = (t) => t && out.paras.push(t);
  if (kind === 'salcert') {
    out.subject = 'Salary certificate';
    out.to = ['To whom it may concern'];
    add(`This is to certify that ${n}${v.ecnic ? `, CNIC ${v.ecnic}` : ''}, is employed with ${biz}${v.edesig ? ` as ${v.edesig}` : ''}${v.eid ? ` (employee ID ${v.eid})` : ''}${v.joined ? ` since ${longDate(v.joined)}` : ''}.`);
    const g = num(v.gross);
    add(g > 0 ? `${n} currently draws a gross monthly salary of ${rs(g)} (${rupeesInWords(g)}), subject to deductions as applicable.` : `${n} currently draws a monthly salary as per company records.`);
    add(v.purpose ? `This certificate is issued on request for ${v.purpose}. It carries no liability for the company.` : 'This certificate is issued on request. It carries no liability for the company.');
  } else if (kind === 'expcert') {
    out.subject = 'Experience certificate';
    out.to = ['To whom it may concern'];
    add(`This is to certify that ${n}${v.ecnic ? `, CNIC ${v.ecnic}` : ''}, worked with ${biz}${v.edesig ? ` as ${v.edesig}` : ''}${v.edept ? ` in the ${v.edept} department` : ''} from ${longDate(v.joined) || '[joining date]'} to ${longDate(v.left) || '[last working day]'}.`);
    if (v.conduct && v.conduct !== 'No remark') add(`During this period ${n} ${v.conduct}.`);
    add(`We wish ${n} every success in the future.`);
  } else if (kind === 'appoint') {
    out.subject = `Appointment as ${v.edesig || '[designation]'}`;
    out.to = [n, v.eaddr].filter(Boolean);
    add(`Dear ${n},`);
    add(`We are pleased to offer you the position of ${v.edesig || '[designation]'}${v.edept ? ` in the ${v.edept} department` : ''} at ${biz}, with effect from ${longDate(v.joined) || '[joining date]'}. The terms of your appointment are:`);
    const t = [];
    const g = num(v.gross);
    if (g > 0) t.push(`Salary: a gross monthly salary of ${rs(g)} (${rupeesInWords(g)}), subject to deduction of taxes and other amounts required by law.`);
    if (v.reports) t.push(`Reporting: you will report to ${v.reports}.`);
    if (num(v.probation) > 0) t.push(`Probation: your first ${num(v.probation)} month${num(v.probation) === 1 ? '' : 's'} of service will be a probation period, after which your employment will be reviewed.`);
    if (v.hours) t.push(`Working hours: ${v.hours}.`);
    if (num(v.notice) > 0) t.push(`Notice: either side may end the employment by giving ${num(v.notice)} days' written notice, or pay in lieu of notice.`);
    t.push('Policies: you will follow the policies and rules of the company as updated from time to time.');
    out.list = t;
    out.post = ['Please sign and return a copy of this letter to confirm that you accept these terms. We look forward to working with you.'];
  } else if (kind === 'resign') {
    out.subject = `Resignation from the post of ${v.edesig || '[designation]'}`;
    out.to = [v.toname || '[name and title]', v.company].filter(Boolean);
    add(`Dear ${v.toname ? v.toname.split(',')[0] : 'Sir or Madam'},`);
    add(`I am writing to resign from my position as ${v.edesig || '[designation]'} at ${v.company || biz}. My last working day will be ${longDate(v.last) || '[last working day]'}.`);
    if (v.reason) add(`Reason: ${v.reason}`);
    add('I will complete my handover and any pending work before I leave. Thank you for the opportunities and support I have received during my time here.');
    add('Kindly accept my resignation and confirm my last working day and final settlement.');
  } else if (kind === 'leave') {
    const d = daysInclusive(v.from, v.to);
    out.subject = `Application for ${v.ltype || 'leave'}`;
    out.to = [v.toname || '[name and title]', v.company].filter(Boolean);
    add(`Dear ${v.toname ? v.toname.split(',')[0] : 'Sir or Madam'},`);
    add(`I request ${v.ltype || 'leave'}${d ? ` for ${d} day${d === 1 ? '' : 's'}` : ''}${v.from ? `, from ${longDate(v.from)}` : ''}${v.to ? ` to ${longDate(v.to)}` : ''}.`);
    if (v.reason) add(`Reason: ${v.reason}`);
    if (v.contact) add(`During my leave I can be reached on ${v.contact}.`);
    add('I will arrange for my work to be covered. I shall be grateful if you approve my request.');
  }
  if (extra && extra.trim()) (out.post || out.paras).push(extra.trim());
  return out;
}

/** Salary slip totals. lines: [{label, amount}] */
export function slipTotals(earn, ded) {
  const e = r2(earn.reduce((a, l) => a + Math.max(num(l.amount), 0), 0));
  const d = r2(ded.reduce((a, l) => a + Math.max(num(l.amount), 0), 0));
  return { earn: e, ded: d, net: r2(e - d) };
}
