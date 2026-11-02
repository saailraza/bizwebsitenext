'use client';
import dynamic from 'next/dynamic';

const loading = () => <p className="dk-load">Loading tool…</p>;
const DocMaker = dynamic(() => import('./tools/DocMaker'), { ssr: false, loading });

// Document tools share one component; the id picks the document (see lib/docKinds.js).
const DOC_IDS = ['invoice', 'quote', 'memo', 'challan', 'po', 'receipt', 'voucher', 'proforma', 'note', 'payslip', 'salcert', 'expcert', 'appoint', 'resign', 'leave'];

// Add one line here for every other tool: key (the "component" field in content/tools/*.json) -> component.
const TOOLS = {
  fbrdates: dynamic(() => import('./tools/FbrDates'), { ssr: false, loading }),
  calendar: dynamic(() => import('./tools/CompanyCalendar'), { ssr: false, loading }),
  wcap: dynamic(() => import('./tools/WorkingCapital'), { ssr: false, loading }),
  cashflow: dynamic(() => import('./tools/CashFlow'), { ssr: false, loading }),
  budget: dynamic(() => import('./tools/BudgetPlanner'), { ssr: false, loading }),
  variance: dynamic(() => import('./tools/Variance'), { ssr: false, loading }),
  dscr: dynamic(() => import('./tools/Dscr'), { ssr: false, loading }),
  valuation: dynamic(() => import('./tools/ValuationTool'), { ssr: false, loading }),
  inventory: dynamic(() => import('./tools/InventoryValuation'), { ssr: false, loading }),
  wacc: dynamic(() => import('./tools/Wacc'), { ssr: false, loading }),
  health: dynamic(() => import('./tools/HealthCheck'), { ssr: false, loading }),
  startup: dynamic(() => import('./tools/StartupCost'), { ssr: false, loading }),
  marla: dynamic(() => import('./tools/MarlaConverter'), { ssr: false, loading }),
};

export default function ToolHost({ id, rates }) {
  if (DOC_IDS.includes(id)) return <DocMaker kind={id} rates={rates} />;
  const C = TOOLS[id];
  if (!C) return <p className="dk-load">This tool is not available yet.</p>;
  return <C rates={rates} />;
}
