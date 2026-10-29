import { legacyRoute, legacyMeta } from '@/lib/legacy';
import { routeParams } from '@/lib/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return routeParams('/tax-calculators/').map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return legacyMeta(`/tax-calculators/${id}/`);
}

export default async function Page({ params }) {
  const { id } = await params;
  return legacyRoute('tax', `/tax-calculators/${id}/`);
}
