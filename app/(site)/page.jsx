import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/');
}

export default function Page() {
  return legacyRoute('home', '/');
}
