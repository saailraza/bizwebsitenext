'use client';
import { downloadCsv } from '@/lib/deskExport';

export function Field({ label, hint, value, onChange, id }) {
  return (
    <label>
      {label}
      <input inputMode="decimal" value={value || ''} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? 'h-' + id : undefined} />
      {hint && (
        <small id={'h-' + id} className="dk-fine">
          {hint}
        </small>
      )}
    </label>
  );
}
export const Box = ({ label, value, bad }) => (
  <div className={'dk-box' + (bad ? ' bad' : '')}>
    <span>{label}</span>
    <b>{value}</b>
  </div>
);
export function Actions({ name, rows, onClear }) {
  return (
    <div className="dk-act dk-noprint">
      <button type="button" className="btn" onClick={() => window.print()}>
        Print or save as PDF
      </button>
      <button type="button" className="btn o" disabled={!rows} onClick={() => downloadCsv(name, rows())}>
        Download Excel (CSV)
      </button>
      {onClear && (
        <button type="button" className="btn o" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}
