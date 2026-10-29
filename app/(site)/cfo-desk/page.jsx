import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/cfo-desk/');
}

export default function Page() {
  return legacyRoute('cfo', '/cfo-desk/');
}
