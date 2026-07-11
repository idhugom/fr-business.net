#!/usr/bin/env node
/**
 * Regenerate article bodies with gpt-5.6-terra (Responses API), concurrently,
 * with adaptive rate limiting + resume. Each success is merged into the Astro
 * content collection (src/content/posts/{slug}.json): html/excerpt/faq/tags are
 * replaced, slug/title/date/image are preserved, regenerated:true is set.
 *
 * Env: START_CONC (default 14), LIMIT (max posts this run, default all),
 *      ONLY_RECENT=N (only newest N), FORCE=1 (re-do even if regenerated).
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildResponsesBody, parseResponse, loadPosts } from './gen-lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const KEY = process.env.OPENAI_API_KEY;
const FORCE = process.env.FORCE === '1';
const START_CONC = Number(process.env.START_CONC || 14);
const MAX_CONC = Number(process.env.MAX_CONC || 20);
const LIMIT = Number(process.env.LIMIT || 0);
const ONLY_RECENT = Number(process.env.ONLY_RECENT || 0);

let posts = loadPosts(ROOT).sort((a, b) => +new Date(b.date) - +new Date(a.date));
if (ONLY_RECENT) posts = posts.slice(0, ONLY_RECENT);

function collPath(slug) { return path.join(POSTS_DIR, `${slug}.json`); }
function isDone(slug) {
  try { return JSON.parse(fs.readFileSync(collPath(slug), 'utf8')).regenerated === true; }
  catch { return false; }
}
function readingTime(html) {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}

let queue = posts.filter((p) => FORCE || !isDone(p.slug));
if (LIMIT) queue = queue.slice(0, LIMIT);

const totalTodo = queue.length;
let done = 0, failCount = 0, i = 0;
let conc = START_CONC;
const failures = [];
const t0 = Date.now();

async function callOne(post) {
  const body = buildResponsesBody(post);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(240000),
      });
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get('retry-after')) || 0;
        conc = Math.max(4, conc - 1); // back off global concurrency
        await new Promise((r) => setTimeout(r, (ra ? ra * 1000 : 3000) + attempt * 2000 + Math.floor(Math.random()*1500)));
        continue;
      }
      const raw = await res.json();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(raw).slice(0,180)}`);
      if (raw.status === 'incomplete') throw new Error('incomplete: ' + (raw.incomplete_details?.reason || '?'));
      const parsed = parseResponse(raw);
      if (!parsed.html || parsed.html.length < 400) throw new Error('html too short');
      return parsed;
    } catch (e) {
      if (attempt === 5) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

function merge(post, parsed) {
  const p = collPath(post.slug);
  let base = {};
  try { base = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  const merged = {
    ...base,
    id: post.id,
    slug: post.slug,
    title: base.title ?? post.title,
    date: post.date,
    modified: post.modified || post.date,
    excerpt: (parsed.excerpt || base.excerpt || '').slice(0, 300),
    image: base.image ?? null,
    imageAlt: base.imageAlt || '',
    category: 'infos',
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
    html: parsed.html,
    readingTime: readingTime(parsed.html),
    faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    regenerated: true,
  };
  fs.writeFileSync(p, JSON.stringify(merged, null, 1));
}

async function worker() {
  while (i < queue.length) {
    const post = queue[i++];
    try {
      const parsed = await callOne(post);
      merge(post, parsed);
      done++;
    } catch (e) {
      failCount++;
      failures.push({ slug: post.slug, err: String(e).slice(0, 160) });
    }
    if ((done + failCount) % 5 === 0 || done + failCount === totalTodo) {
      const el = (Date.now() - t0) / 1000;
      const rate = done / (el / 60) || 0;
      const eta = rate ? ((totalTodo - done - failCount) / rate).toFixed(0) : '?';
      process.stderr.write(`\r  done=${done} fail=${failCount} / ${totalTodo}  conc=${conc}  ${rate.toFixed(1)}/min  ETA~${eta}min      `);
    }
  }
}

if (!totalTodo) { console.log('nothing to do — all regenerated'); process.exit(0); }
console.error(`Regenerating ${totalTodo} articles (start concurrency ${START_CONC})...`);

// dynamic worker pool that respects the (possibly shrinking) conc value
const running = new Set();
async function pump() {
  while (i < queue.length || running.size) {
    while (running.size < conc && i < queue.length) {
      const pr = worker0();
      running.add(pr);
      pr.finally(() => running.delete(pr));
    }
    await Promise.race(running.size ? [...running] : [Promise.resolve()]);
  }
}
async function worker0() {
  const post = queue[i++];
  if (!post) return;
  try {
    const parsed = await callOne(post);
    merge(post, parsed);
    done++;
    if (conc < MAX_CONC && done % 10 === 0) conc++; // ramp back up slowly
  } catch (e) {
    failCount++;
    failures.push({ slug: post.slug, err: String(e).slice(0, 160) });
  }
  if ((done + failCount) % 5 === 0 || done + failCount === totalTodo) {
    const el = (Date.now() - t0) / 1000;
    const rate = done / (el / 60) || 0;
    const eta = rate ? ((totalTodo - done - failCount) / rate).toFixed(0) : '?';
    process.stderr.write(`\r  done=${done} fail=${failCount} / ${totalTodo}  conc=${conc}  ${rate.toFixed(1)}/min  ETA~${eta}min      `);
  }
}

await pump();
process.stderr.write('\n');
fs.writeFileSync(path.join(ROOT, 'scripts/data/gen-failures.json'), JSON.stringify(failures, null, 1));
console.log(`\nDONE regenerated=${done} failed=${failCount} in ${((Date.now()-t0)/60000).toFixed(1)}min`);
if (failures.length) console.log('failures -> scripts/data/gen-failures.json (re-run to retry)');
