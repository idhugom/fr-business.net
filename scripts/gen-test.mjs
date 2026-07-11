#!/usr/bin/env node
import path from 'node:path';
import { buildResponsesBody, parseResponse, loadPosts } from './gen-lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const posts = loadPosts(ROOT);
// pick a sample by slug arg or default the most recent
const slugArg = process.argv[2];
const post = slugArg ? posts.find((p) => p.slug === slugArg) : posts[0];
if (!post) { console.error('post not found'); process.exit(1); }

console.error(`Generating: "${post.title}"`);
const body = buildResponsesBody(post);
const t0 = Date.now();
const res = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const raw = await res.json();
if (!res.ok) { console.error('HTTP', res.status); console.error(JSON.stringify(raw, null, 2).slice(0, 2000)); process.exit(1); }
console.error(`status=${raw.status} in ${((Date.now()-t0)/1000).toFixed(1)}s`);
console.error('usage:', JSON.stringify(raw.usage));
const parsed = parseResponse(raw);
console.error('--- excerpt ---'); console.error(parsed.excerpt);
console.error('--- tags ---'); console.error(parsed.tags);
console.error('--- faq count ---', parsed.faq.length);
console.error('--- html length ---', parsed.html.length, 'chars');
console.error('--- html preview ---');
console.log(parsed.html.slice(0, 2600));
console.error('--- has table? ', /table-wrap|<table/.test(parsed.html));
console.error('--- has callout? ', /callout/.test(parsed.html));
console.error('--- has takeaways? ', /takeaways/.test(parsed.html));
console.error('--- has compare? ', /compare/.test(parsed.html));
