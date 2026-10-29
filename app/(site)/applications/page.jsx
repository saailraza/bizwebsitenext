import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/applications/');
}

export default function Page() {
  return legacyRoute('applications', '/applications/');
}
