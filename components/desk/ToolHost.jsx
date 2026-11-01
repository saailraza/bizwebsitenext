'use client';
import dynamic from 'next/dynamic';

const loading = () => <p className="dk-load">Loading tool…</p>;
const DocMaker = dynamic(() => import('./tools/DocMaker'), { ssr: false, loading });

// Document tools share one component; the id picks the document (see lib/docKinds.js).
const DOC_IDS = ['invoice', 'quote', 'memo', 'challan', 'po', 'receipt', 'voucher'];

// Add one line here for every other tool: key (the "component" field in content/tools/*.json) -> component.
const TOOLS = {
  fbrdates: dynamic(() => import('./tools/FbrDates'), { ssr: false, loading }),
  calendar: dynamic(() => import('./tools/CompanyCalendar'), { ssr: false, loading }),
  marla: dynamic(() => import('./tools/MarlaConverter'), { ssr: false, loading }),
};

export default function ToolHost({ id, rates }) {
  if (DOC_IDS.includes(id)) return <DocMaker kind={id} rates={rates} />;
  const C = TOOLS[id];
  if (!C) return <p className="dk-load">This tool is not available yet.</p>;
  return <C rates={rates} />;
}
