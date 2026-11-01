// Reads BIZEASE DESK content (content/tools/*.json and content/rates.json). Server-side only.
import fs from 'node:fs';
import path from 'node:path';
import { SLUG_RE } from './content';

const ROOT = path.join(process.cwd(), 'content');

function readJson(rel, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch (e) {
    return fallback;
  }
}

export function getTools() {
  let files = [];
  try {
    files = fs.readdirSync(path.join(ROOT, 'tools')).filter((f) => f.endsWith('.json'));
  } catch (e) {}
  return files
    .map((f) => readJson('tools/' + f, null))
    .filter((t) => t && t.slug && t.desk && t.status !== 'hidden')
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}
export const getDeskTools = (desk) => getTools().filter((t) => t.desk === desk);
export function getTool(desk, slug) {
  if (!SLUG_RE.test(slug || '')) return null;
  const t = getTools().find((x) => x.slug === slug && x.desk === desk);
  return t || null;
}
export const getRates = () => readJson('rates.json', {});
