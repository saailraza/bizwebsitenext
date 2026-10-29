import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/services/international/');
}

export default function Page() {
  return legacyRoute('services', '/services/international/');
}
