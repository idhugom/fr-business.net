#!/usr/bin/env node
/**
 * Build the Astro content collection (src/content/posts/*.json) from the
 * extracted WordPress data. This creates the BASELINE (original content,
 * lightly cleaned) so every legacy URL resolves. The regeneration pipeline
 * later overwrites `html` + sets regenerated:true, keeping slug/title/image.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'scripts/data/wp-posts.json');
const OUT = path.join(ROOT, 'src/content/posts');
const MEDIA = path.join(ROOT, 'public/media');
fs.mkdirSync(OUT, { recursive: true });
const hasImage = (id) => fs.existsSync(path.join(MEDIA, `${id}.webp`));

const posts = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const ENT = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'",
  '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”',
  '&#8211;': '–', '&#8212;': '—', '&#8230;': '…', '&nbsp;': ' ',
  '&#8242;': '′', '&#233;': 'é', '&#232;': 'è', '&#224;': 'à',
};
function decode(s = '') {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z0-9]+;/gi, (m) => ENT[m] ?? m)
    .trim();
}
function stripTags(s = '') { return decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')); }

function cleanHtml(html = '') {
  return html
    .replace(/\sclass="[^"]*"/g, '')
    .replace(/\sstyle="[^"]*"/g, '')
    .replace(/\s(id|data-[a-z-]+|aria-[a-z-]+)="[^"]*"/g, '')
    .replace(/<!--\s*\/?\s*wp:[^>]*-->/g, '')
    .replace(/<figure[^>]*>\s*<\/figure>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readingTime(html) {
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}

let n = 0;
for (const p of posts) {
  const slug = p.slug;
  if (!slug) continue;
  const image = (p.featured_image && hasImage(p.id)) ? `/media/${p.id}.webp` : null;
  const entry = {
    id: p.id,
    slug,
    title: decode(p.title),
    date: p.date,
    modified: p.modified || p.date,
    excerpt: stripTags(p.excerpt_html).slice(0, 300),
    image,
    imageAlt: decode(p.featured_alt) || decode(p.title),
    category: 'infos',
    tags: [],
    html: cleanHtml(p.content_html),
    readingTime: readingTime(p.content_html),
    faq: [],
    regenerated: false,
  };
  fs.writeFileSync(path.join(OUT, `${slug}.json`), JSON.stringify(entry, null, 1));
  n++;
}
console.log(`wrote ${n} collection entries to src/content/posts/`);
