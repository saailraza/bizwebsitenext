import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/resources/');
}

export default function Page() {
  return legacyRoute('resources', '/resources/');
}
