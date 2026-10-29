import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/about/');
}

export default function Page() {
  return legacyRoute('about', '/about/');
}
