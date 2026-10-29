import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/financial-calculators/');
}

export default function Page() {
  return legacyRoute('finance', '/financial-calculators/');
}
