#!/usr/bin/env node
/**
 * OpenAI Batch API pipeline for content regeneration (gpt-5.6-terra, Responses API).
 * Cost-efficient (~50% cheaper) alternative to the synchronous runner (gen-run.mjs),
 * for future full re-runs. Same model / prompt / structured output.
 *
 * Usage:
 *   node scripts/batch.mjs build           # -> scripts/data/batch/input.jsonl
 *   node scripts/batch.mjs submit          # upload + create batch -> batch.id saved
 *   node scripts/batch.mjs status          # poll batch status
 *   node scripts/batch.mjs fetch           # download results + merge into collection
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildResponsesBody, parseResponse, loadPosts } from './gen-lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'scripts/data/batch');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const KEY = process.env.OPENAI_API_KEY;
const API = 'https://api.openai.com/v1';
fs.mkdirSync(DIR, { recursive: true });

const H = { Authorization: `Bearer ${KEY}` };
const cmd = process.argv[2];

function readingTime(html) {
  const w = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(w / 220));
}

if (cmd === 'build') {
  const posts = loadPosts(ROOT).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const lines = posts.map((p) => JSON.stringify({
    custom_id: `${p.id}::${p.slug}`,
    method: 'POST',
    url: '/v1/responses',
    body: buildResponsesBody(p),
  }));
  fs.writeFileSync(path.join(DIR, 'input.jsonl'), lines.join('\n') + '\n');
  console.log(`built ${lines.length} batch requests -> scripts/data/batch/input.jsonl`);

} else if (cmd === 'submit') {
  const fd = new FormData();
  fd.append('purpose', 'batch');
  fd.append('file', new Blob([fs.readFileSync(path.join(DIR, 'input.jsonl'))]), 'input.jsonl');
  const up = await (await fetch(`${API}/files`, { method: 'POST', headers: H, body: fd })).json();
  if (!up.id) { console.error('upload failed', up); process.exit(1); }
  console.log('input file:', up.id);
  const batch = await (await fetch(`${API}/batches`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_file_id: up.id, endpoint: '/v1/responses', completion_window: '24h' }),
  })).json();
  if (!batch.id) { console.error('batch create failed', batch); process.exit(1); }
  fs.writeFileSync(path.join(DIR, 'batch.json'), JSON.stringify(batch, null, 1));
  console.log('batch id:', batch.id, 'status:', batch.status);

} else if (cmd === 'status') {
  const id = JSON.parse(fs.readFileSync(path.join(DIR, 'batch.json'), 'utf8')).id;
  const b = await (await fetch(`${API}/batches/${id}`, { headers: H })).json();
  console.log('status:', b.status, '| counts:', JSON.stringify(b.request_counts), '| output:', b.output_file_id);
  fs.writeFileSync(path.join(DIR, 'batch.json'), JSON.stringify(b, null, 1));

} else if (cmd === 'fetch') {
  const b = JSON.parse(fs.readFileSync(path.join(DIR, 'batch.json'), 'utf8'));
  if (!b.output_file_id) { console.error('no output_file_id yet; run status'); process.exit(1); }
  const text = await (await fetch(`${API}/files/${b.output_file_id}/content`, { headers: H })).text();
  let ok = 0, bad = 0;
  for (const line of text.split('\n').filter(Boolean)) {
    try {
      const row = JSON.parse(line);
      const slug = row.custom_id.split('::')[1];
      const resp = row.response?.body;
      const parsed = parseResponse(resp);
      const p = path.join(POSTS_DIR, `${slug}.json`);
      const base = JSON.parse(fs.readFileSync(p, 'utf8'));
      fs.writeFileSync(p, JSON.stringify({
        ...base,
        excerpt: (parsed.excerpt || base.excerpt).slice(0, 300),
        tags: parsed.tags?.slice(0, 6) || [],
        html: parsed.html,
        readingTime: readingTime(parsed.html),
        faq: parsed.faq || [],
        regenerated: true,
      }, null, 1));
      ok++;
    } catch (e) { bad++; }
  }
  console.log(`merged ok=${ok} bad=${bad}`);

} else {
  console.log('usage: node scripts/batch.mjs build|submit|status|fetch');
}
