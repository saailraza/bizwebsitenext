import { guarded, json, readBody, ApiError } from '@/lib/adminApi';
import { readFile, writeFile, listDir } from '@/lib/store';
import { validateTool } from '@/lib/validate';
import { SLUG_RE } from '@/lib/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const slugOf = async (ctx) => {
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug || '') || slug.length > 140) throw new ApiError('Bad address.', 400);
  return slug;
};
const load = async (slug) => {
  const f = await readFile(`content/tools/${slug}.json`);
  if (!f) throw new ApiError('Tool not found.', 404);
  return JSON.parse(f.text);
};

export const GET = guarded(async (req, ctx) => {
  const slug = await slugOf(ctx);
  const t = await load(slug);
  const blogs = (await listDir('content/blog')).map((n) => n.replace(/\.json$/, ''));
  return json({ tool: t, blogs });
});

export const PUT = guarded(
  async (req, ctx) => {
    const slug = await slugOf(ctx);
    const current = await load(slug);
    const blogSlugs = (await listDir('content/blog')).map((n) => n.replace(/\.json$/, ''));
    const value = validateTool(await readBody(req), current, blogSlugs);
    await writeFile(`content/tools/${slug}.json`, JSON.stringify(value, null, 2) + '\n', `Admin: update tool page ${slug}`);
    return json({ ok: true });
  },
  { write: true }
);
