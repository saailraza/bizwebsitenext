import { legacyRoute, legacyMeta } from '@/lib/legacy';
import { routeParams } from '@/lib/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return routeParams('/resources/').map((sub) => ({ sub }));
}

export async function generateMetadata({ params }) {
  const { sub } = await params;
  return legacyMeta(`/resources/${sub}/`);
}

export default async function Page({ params }) {
  const { sub } = await params;
  return legacyRoute('resources', `/resources/${sub}/`);
}
