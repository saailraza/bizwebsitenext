// Export helpers shared by all BIZEASE DESK tools (browser only).

export function printDoc() {
  window.print();
}

function csvCell(v) {
  const s = String(v ?? '');
  // a leading = + - @ would run as a formula in Excel, so neutralise it
  const safe = /^[=+\-@]/.test(s) && isNaN(Number(s)) ? "'" + s : s;
  return /[",\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}

/** rows: array of arrays. Opens in Excel. */
export function downloadCsv(filename, rows) {
  const text = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
