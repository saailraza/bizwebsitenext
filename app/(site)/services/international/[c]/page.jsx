import { legacyRoute, legacyMeta } from '@/lib/legacy';
import { routeParams } from '@/lib/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return routeParams('/services/international/').map((c) => ({ c }));
}

export async function generateMetadata({ params }) {
  const { c } = await params;
  return legacyMeta(`/services/international/${c}/`);
}

export default async function Page({ params }) {
  const { c } = await params;
  return legacyRoute('services', `/services/international/${c}/`);
}
