'use client';
import dynamic from 'next/dynamic';

// Add one line here for every new tool: key (the "component" field in content/tools/*.json) -> component.
const TOOLS = {
  marla: dynamic(() => import('./tools/MarlaConverter'), { ssr: false, loading: () => <p className="dk-load">Loading tool…</p> }),
};

export default function ToolHost({ id, rates }) {
  const C = TOOLS[id];
  if (!C) return <p className="dk-load">This tool is not available yet.</p>;
  return <C rates={rates} />;
}
