import { legacyRoute, legacyMeta } from '@/lib/legacy';

export function generateMetadata() {
  return legacyMeta('/contact/');
}

export default function Page() {
  return legacyRoute('contact', '/contact/');
}
