import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/services/');
}

export default function Page() {
  return legacyRoute('services', '/services/');
}
