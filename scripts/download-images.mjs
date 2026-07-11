#!/usr/bin/env node
/**
 * Download every featured image from the legacy WordPress site and store it as
 * an optimized webp under public/media/{id}.webp. Resumable + concurrent.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/wp-posts.json'), 'utf8'));
const OUT = path.join(ROOT, 'public/media');
fs.mkdirSync(OUT, { recursive: true });

const jobs = posts.filter((p) => p.featured_image).map((p) => ({ id: p.id, url: p.featured_image }));
const CONC = 12;
let ok = 0, skip = 0, fail = 0;
const failed = [];

async function download(job) {
  const dest = path.join(OUT, `${job.id}.webp`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 800) { skip++; return; }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(job.url, { headers: { 'User-Agent': 'migrator/1.0' }, signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf)
        .rotate()
        .resize({ width: 1600, height: 1067, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(dest);
      ok++;
      return;
    } catch (e) {
      if (attempt === 2) { fail++; failed.push({ id: job.id, url: job.url, err: String(e).slice(0, 80) }); }
      else await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function run() {
  let i = 0;
  const workers = Array.from({ length: CONC }, async () => {
    while (i < jobs.length) {
      const job = jobs[i++];
      await download(job);
      if ((ok + skip + fail) % 50 === 0) process.stderr.write(`\r  ok=${ok} skip=${skip} fail=${fail} / ${jobs.length}   `);
    }
  });
  await Promise.all(workers);
  process.stderr.write(`\n`);
  fs.writeFileSync(path.join(ROOT, 'scripts/data/image-failures.json'), JSON.stringify(failed, null, 1));
  console.log(`DONE ok=${ok} skip=${skip} fail=${fail} (of ${jobs.length})`);
  if (failed.length) console.log('failures written to scripts/data/image-failures.json');
}
run();
