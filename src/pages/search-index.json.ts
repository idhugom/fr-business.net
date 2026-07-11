import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('posts')).sort(
    (a, b) => +new Date(b.data.date) - +new Date(a.data.date)
  );
  const index = posts.map((p) => ({
    s: p.data.slug,
    t: p.data.title,
    e: p.data.excerpt.slice(0, 140),
    i: p.data.image || '',
    d: p.data.date.slice(0, 10),
    r: p.data.readingTime,
  }));
  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
