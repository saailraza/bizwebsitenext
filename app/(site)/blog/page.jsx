import BlogIndex from '@/components/BlogIndex';
import JsonLd from '@/components/JsonLd';
import { getBlogs, getRoute } from '@/lib/content';
import { routeMeta } from '@/lib/seo';

export function generateMetadata() {
  return routeMeta('/blog/');
}

export default function Page() {
  const posts = getBlogs().map((b) => ({ slug: b.slug, title: b.title, description: b.description, category: b.category, date: b.date, tags: b.tags || '' }));
  const r = getRoute('/blog/');
  return (
    <>
      {(r?.jsonld || []).map((j, i) => (
        <JsonLd key={i} json={j} />
      ))}
      <div className="page on" id="blog">
        <BlogIndex posts={posts} />
      </div>
    </>
  );
}
