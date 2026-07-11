import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async (context) => {
  const posts = (await getCollection('posts'))
    .sort((a, b) => +new Date(b.data.date) - +new Date(a.data.date))
    .slice(0, 50);

  return rss({
    title: 'Fr-business.net',
    description: 'Business, tech, argent & art de vivre — analyses et guides pour décider mieux.',
    site: context.site ?? 'https://www.fr-business.net',
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.excerpt,
      pubDate: new Date(p.data.date),
      link: `/infos/${p.data.slug}.html`,
    })),
    customData: '<language>fr-FR</language>',
  });
};
