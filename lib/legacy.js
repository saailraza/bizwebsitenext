import LegacyPage from '@/components/LegacyPage';
import JsonLd from '@/components/JsonLd';
import { getShell, getRoute } from './content';
import { routeMeta } from './seo';

export const legacyMeta = (path) => routeMeta(path);

// A page whose body is one of the original page shells (+ optional html transform)
export function legacyRoute(id, path, transform) {
  let html = getShell(id);
  if (transform) html = transform(html);
  const r = getRoute(path);
  return (
    <>
      {(r?.jsonld || []).map((j, i) => (
        <JsonLd key={i} json={j} />
      ))}
      <LegacyPage id={id} html={html} />
    </>
  );
}
