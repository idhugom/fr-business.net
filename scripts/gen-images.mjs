#!/usr/bin/env node
/**
 * Generate ultra-realistic featured images (gpt-image-2) for the articles that
 * have no image, then optimize to webp and wire them into the collection.
 *   model gpt-image-2 · size 1536x1024 · quality medium
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const MEDIA = path.join(ROOT, 'public/media');
const KEY = process.env.OPENAI_API_KEY;

const targets = [];
for (const f of fs.readdirSync(POSTS_DIR)) {
  const d = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
  if (!d.image && !fs.existsSync(path.join(MEDIA, `${d.id}.webp`))) targets.push(d);
}
console.log(`${targets.length} articles need a generated image`);

function prompt(title) {
  return `Ultra-realistic editorial magazine photograph illustrating the topic: "${title}". `
    + `Cinematic natural soft lighting, shallow depth of field, tasteful and conceptual, modern and clean composition, `
    + `subtle cyan/aqua accent in the palette. No text, no letters, no watermark, no logo, no charts. Photorealistic, high detail.`;
}

let ok = 0, fail = 0;
const CONC = 3;
let i = 0;
async function one(post) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-2', prompt: prompt(post.title), size: '1536x1024', quality: 'medium', n: 1 }),
        signal: AbortSignal.timeout(180000),
      });
      const j = await res.json();
      if (!res.ok) {
        if ((j.error?.code === 'moderation_blocked' || /safety|moderation/i.test(JSON.stringify(j)))) {
          console.log(`  skip (moderation): ${post.slug}`); return false;
        }
        throw new Error(JSON.stringify(j.error || j).slice(0, 160));
      }
      const b64 = j.data?.[0]?.b64_json;
      if (!b64) throw new Error('no image data');
      const buf = Buffer.from(b64, 'base64');
      await sharp(buf).resize({ width: 1600, height: 1067, fit: 'inside' }).webp({ quality: 82 }).toFile(path.join(MEDIA, `${post.id}.webp`));
      // wire into collection
      const p = path.join(POSTS_DIR, `${post.slug}.json`);
      const d = JSON.parse(fs.readFileSync(p, 'utf8'));
      d.image = `/media/${post.id}.webp`;
      d.imageAlt = d.imageAlt || d.title;
      fs.writeFileSync(p, JSON.stringify(d, null, 1));
      return true;
    } catch (e) {
      if (attempt === 2) { console.log(`  fail ${post.slug}: ${String(e).slice(0,120)}`); return false; }
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}
async function worker() {
  while (i < targets.length) {
    const post = targets[i++];
    const r = await one(post);
    if (r) ok++; else fail++;
    process.stderr.write(`\r  ok=${ok} fail=${fail} / ${targets.length}   `);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
process.stderr.write('\n');
console.log(`DONE images ok=${ok} fail=${fail}`);
