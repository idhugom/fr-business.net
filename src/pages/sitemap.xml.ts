import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://www.fr-business.net';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('posts')).sort(
    (a, b) => +new Date(b.data.date) - +new Date(a.data.date)
  );

  const statics = [
    { loc: `${SITE}/`, pr: '1.0', freq: 'daily' },
    { loc: `${SITE}/articles`, pr: '0.9', freq: 'daily' },
    { loc: `${SITE}/a-propos`, pr: '0.5', freq: 'monthly' },
    { loc: `${SITE}/contact`, pr: '0.4', freq: 'yearly' },
  ];

  const urls = [
    ...statics.map((s) => `  <url><loc>${s.loc}</loc><changefreq>${s.freq}</changefreq><priority>${s.pr}</priority></url>`),
    ...posts.map((p) => {
      const loc = `${SITE}/infos/${p.data.slug}.html`;
      const lastmod = new Date(p.data.modified || p.data.date).toISOString();
      return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    }),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
