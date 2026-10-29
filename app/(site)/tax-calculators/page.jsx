import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/tax-calculators/');
}

export default function Page() {
  return legacyRoute('tax', '/tax-calculators/');
}
