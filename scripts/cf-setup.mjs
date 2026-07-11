#!/usr/bin/env node
/**
 * Cloudflare Pages setup for fr-business.net.
 *   node scripts/cf-setup.mjs create        # create git-connected Pages project
 *   node scripts/cf-setup.mjs deploy         # trigger a production deployment (build from main)
 *   node scripts/cf-setup.mjs status         # latest deployment status + preview URL
 *   node scripts/cf-setup.mjs domains        # attach www + apex custom domains + DNS + apex→www redirect
 */
import fs from 'node:fs';
import path from 'node:path';

const ACC = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API = 'https://api.cloudflare.com/client/v4';
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const ROOT = path.resolve(import.meta.dirname, '..');
const STATE = path.join(ROOT, 'scripts/data/cf.json');

const PROJECT = process.env.CF_PROJECT || 'fr-business';
const OWNER = 'idhugom';
const REPO = 'fr-business.net';
const APEX = 'fr-business.net';
const WWW = 'www.fr-business.net';

async function cf(method, url, body) {
  const res = await fetch(API + url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  return { ok: res.ok && json.success, status: res.status, json };
}
function save(o) { fs.writeFileSync(STATE, JSON.stringify(o, null, 1)); }
function load() { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; } }

const cmd = process.argv[2];

if (cmd === 'create') {
  // find existing?
  let name = PROJECT;
  const existing = await cf('GET', `/accounts/${ACC}/pages/projects/${name}`);
  if (existing.ok) { console.log('project already exists:', name, '->', existing.json.result.subdomain); save({ project: name, subdomain: existing.json.result.subdomain }); process.exit(0); }

  const payload = {
    name,
    production_branch: 'main',
    build_config: { build_command: 'npm run build', destination_dir: 'dist', root_dir: '' },
    source: {
      type: 'github',
      config: {
        owner: OWNER, repo_name: REPO, production_branch: 'main',
        pr_comments_enabled: true, deployments_enabled: true,
        production_deployments_enabled: true,
        preview_deployment_setting: 'custom',
        preview_branch_includes: ['preview'], preview_branch_excludes: [],
        path_includes: ['*'], path_excludes: [],
      },
    },
    deployment_configs: {
      production: { compatibility_date: '2024-11-06', compatibility_flags: [], env_vars: {} },
      preview: { compatibility_date: '2024-11-06', compatibility_flags: [], env_vars: {} },
    },
  };
  let r = await cf('POST', `/accounts/${ACC}/pages/projects`, payload);
  if (!r.ok && JSON.stringify(r.json).match(/unique|already|taken|8000007/i)) {
    name = 'fr-business-net';
    payload.name = name;
    r = await cf('POST', `/accounts/${ACC}/pages/projects`, payload);
  }
  if (!r.ok) { console.error('create failed', JSON.stringify(r.json.errors || r.json)); process.exit(1); }
  console.log('created project:', name, '->', r.json.result.subdomain);
  save({ project: name, subdomain: r.json.result.subdomain });

} else if (cmd === 'deploy') {
  const { project } = load();
  const r = await cf('POST', `/accounts/${ACC}/pages/projects/${project}/deployments`);
  if (!r.ok) { console.error('deploy trigger failed', JSON.stringify(r.json.errors || r.json)); process.exit(1); }
  console.log('deployment triggered:', r.json.result.id, '| url:', r.json.result.url);

} else if (cmd === 'status') {
  const { project } = load();
  const r = await cf('GET', `/accounts/${ACC}/pages/projects/${project}/deployments?per_page=1`);
  const dep = r.json.result?.[0];
  if (!dep) { console.log('no deployments yet'); process.exit(0); }
  const st = dep.latest_stage;
  console.log('deployment:', dep.id);
  console.log('  stage:', st?.name, st?.status);
  console.log('  url:', dep.url);
  console.log('  aliases:', dep.aliases);

} else if (cmd === 'domains') {
  const { project, subdomain } = load();
  const zoneR = await cf('GET', `/zones?name=${APEX}`);
  const zone = zoneR.json.result?.[0];
  if (!zone) { console.error('zone not found for', APEX); process.exit(1); }
  const zid = zone.id;
  console.log('zone:', zid, 'status:', zone.status);

  // 1. attach custom domains to the Pages project
  for (const dom of [WWW, APEX]) {
    const r = await cf('POST', `/accounts/${ACC}/pages/projects/${project}/domains`, { name: dom });
    console.log('attach domain', dom, ':', r.ok ? 'ok' : JSON.stringify(r.json.errors));
  }

  // 2. DNS records -> point to the pages.dev project (CNAME, proxied).
  //    Attaching a custom domain in the same account usually auto-creates the
  //    record; only create if missing (never delete a Pages-managed record).
  const dns = [
    { type: 'CNAME', name: WWW, content: subdomain, proxied: true },
    { type: 'CNAME', name: APEX, content: subdomain, proxied: true }, // CNAME flattening at apex
  ];
  for (const rec of dns) {
    const ex = await cf('GET', `/zones/${zid}/dns_records?name=${rec.name}`);
    const has = (ex.json.result || []).some((o) => ['A', 'AAAA', 'CNAME'].includes(o.type));
    if (has) { console.log('dns', rec.name, ': already present (kept)'); continue; }
    const r = await cf('POST', `/zones/${zid}/dns_records`, rec);
    console.log('dns', rec.name, '->', rec.content, ':', r.ok ? 'created' : JSON.stringify(r.json.errors));
  }

  // 3. apex -> www 301 redirect (single redirect ruleset)
  const rule = {
    action: 'redirect',
    expression: `(http.host eq "${APEX}")`,
    description: 'apex to www',
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: { expression: `concat("https://${WWW}", http.request.uri.path)` },
        preserve_query_string: true,
      },
    },
  };
  // get or create the http_request_dynamic_redirect ruleset (entrypoint)
  const entry = await cf('GET', `/zones/${zid}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
  if (entry.ok && entry.json.result?.id) {
    const rules = entry.json.result.rules || [];
    if (!rules.some((x) => x.description === 'apex to www')) {
      const upd = await cf('PUT', `/zones/${zid}/rulesets/${entry.json.result.id}`, {
        rules: [...rules.map(({ id, version, ...r }) => r), rule],
      });
      console.log('redirect rule:', upd.ok ? 'added' : JSON.stringify(upd.json.errors));
    } else console.log('redirect rule: already present');
  } else {
    const cr = await cf('POST', `/zones/${zid}/rulesets`, {
      name: 'redirects', kind: 'zone', phase: 'http_request_dynamic_redirect', rules: [rule],
    });
    console.log('redirect ruleset:', cr.ok ? 'created' : JSON.stringify(cr.json.errors));
  }
  console.log('\nDONE. Custom domains + DNS + redirect configured (effective once nameservers delegate).');
} else {
  console.log('usage: node scripts/cf-setup.mjs create|deploy|status|domains');
}
