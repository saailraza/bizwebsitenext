import { guarded, json, readBody, ApiError } from '@/lib/adminApi';
import { readFile, writeFile, deleteFile } from '@/lib/store';
import { validateBlog } from '@/lib/validate';
import { SLUG_RE } from '@/lib/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const slugOf = async (ctx) => {
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug || '')) throw new ApiError('Bad address.', 400);
  return slug;
};

export const GET = guarded(async (req, ctx) => {
  const slug = await slugOf(ctx);
  const f = await readFile(`content/blog/${slug}.json`);
  if (!f) throw new ApiError('Post not found.', 404);
  return json(JSON.parse(f.text));
});

export const PUT = guarded(
  async (req, ctx) => {
    const slug = await slugOf(ctx);
    const body = await readBody(req);
    const value = validateBlog(body, slug);
    const exists = await readFile(`content/blog/${slug}.json`);
    if (body.isNew && exists) throw new ApiError('A post with this web address already exists. Change the slug.', 409);
    await writeFile(`content/blog/${slug}.json`, JSON.stringify(value, null, 1) + '\n', `Admin: ${exists ? 'update' : 'add'} blog post ${slug}`);
    return json({ ok: true, slug });
  },
  { write: true }
);

export const DELETE = guarded(
  async (req, ctx) => {
    const slug = await slugOf(ctx);
    await deleteFile(`content/blog/${slug}.json`, `Admin: delete blog post ${slug}`);
    return json({ ok: true });
  },
  { write: true }
);
