#!/usr/bin/env node
// One-off dev tool — not part of the app bundle. Logs into your own QUL
// (Quranic Universal Library, qul.tarteel.ai) account, discovers recitation
// resources on their public listing page, and downloads each one's export
// (JSON or SQLite) — the actual export file sits behind a login wall, but
// the listing/tagging itself doesn't.
//
// Usage:
//   QUL_EMAIL=... QUL_PASSWORD=... node scripts/download-qul-export.mjs [--format=json|sqlite] [--all] [--id=<resourceId>] [nameFilter...]
//
// Default (no --all): only considers resources tagged "With segments" —
// the ones with word-level highlighting data. With no nameFilter args,
// downloads every one found (~59 at time of writing); pass substrings to
// narrow it, e.g.:
//   node scripts/download-qul-export.mjs maher yasser
//
// --all: considers every recitation resource regardless of the "with
// segments" tag (most don't have word-level data — just per-ayah or
// per-surah audio/timing — but you may still want the export for other
// reasons). Requires at least one nameFilter, so it's an explicit choice,
// not an accidental bulk-download of everything:
//   node scripts/download-qul-export.mjs --all noreen siddiq
//
// --id=<resourceId>: skip discovery/filtering entirely and download that
// one resource id directly — use this once you have the exact id from a
// qul.tarteel.ai/resources/recitation/<id> URL:
//   node scripts/download-qul-export.mjs --id=401
//
// Credentials are read from env vars only — never hardcode them here, and
// never commit a .env file containing them. Downloaded files are saved to
// ./qul-exports/<id>-<slug>.<format> (gitignored — see .gitignore).
//
// This reverse-engineers QUL's actual (undocumented) login form and page
// markup as observed on their site. If QUL changes their site, this will
// need updating — the script prints diagnostics at each step so a failure
// is traceable rather than silent, and keeps going on a per-resource
// failure instead of aborting the whole batch.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://qul.tarteel.ai';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const DELAY_MS = 400;

const rawArgs = process.argv.slice(2);
const formatArg = rawArgs.find((a) => a.startsWith('--format='));
const format = (formatArg ? formatArg.split('=')[1] : 'json').toLowerCase();
const idArg = rawArgs.find((a) => a.startsWith('--id='));
const directId = idArg ? idArg.split('=')[1] : null;
const includeAll = rawArgs.includes('--all');
const nameFilters = rawArgs.filter((a) => !a.startsWith('--')).map((s) => s.toLowerCase());

const email = process.env.QUL_EMAIL;
const password = process.env.QUL_PASSWORD;

if (!['json', 'sqlite'].includes(format)) {
  console.error(`Unknown format "${format}" — expected "json" or "sqlite".`);
  process.exit(1);
}
if (includeAll && nameFilters.length === 0 && !directId) {
  console.error('--all requires at least one name filter (to avoid bulk-downloading every resource).');
  process.exit(1);
}
if (!email || !password) {
  console.error('Missing QUL_EMAIL / QUL_PASSWORD environment variables.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal cookie jar — Node's fetch doesn't do this automatically. */
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  storeFromResponse(res) {
    const setCookies =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : res.headers.get('set-cookie')
          ? [res.headers.get('set-cookie')]
          : [];
    for (const sc of setCookies) {
      const pair = sc.split(';')[0];
      const idx = pair.indexOf('=');
      if (idx > -1) this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

const jar = new CookieJar();

/** fetch() that carries cookies across requests and manually follows
 * redirects so Set-Cookie headers on the redirect response itself aren't
 * lost (native `redirect: 'follow'` would swallow them). */
async function request(url, options = {}, hops = 0) {
  if (hops > 5) throw new Error(`Too many redirects following ${url}`);
  const res = await fetch(url, {
    ...options,
    redirect: 'manual',
    headers: {
      'User-Agent': UA,
      Cookie: jar.header(),
      ...options.headers,
    },
  });
  jar.storeFromResponse(res);
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get('location');
    if (!location) return res;
    const nextUrl = new URL(location, url).toString();
    // A 303 (and browsers' handling of 302 on a POST) turns any subsequent
    // request into a GET with no body — mirror that.
    const nextMethod = options.method && options.method !== 'GET' ? 'GET' : options.method;
    return request(nextUrl, { method: nextMethod, headers: options.headers }, hops + 1);
  }
  return res;
}

function extractCsrfToken(html) {
  const match = html.match(/name="csrf-token"\s+content="([^"]+)"/);
  if (!match) throw new Error('Could not find csrf-token meta tag on the sign-in page — QUL may have changed its markup.');
  return match[1];
}

function looksLoggedOut(html) {
  // The nav shows a plain "Login" link pointing at /users/sign_in when
  // signed out; a signed-in session replaces this with account/profile UI.
  return /href="\/users\/sign_in"[^>]*>\s*Login\s*</.test(html);
}

/** Finds the real download link/data-url for a resource page's "Download
 * json"/"Download sqlite" button. When logged out, this button's data-url
 * points at /users/sign_in?modal=true&user_return_to=... instead — treated
 * as "not found" here so callers can tell the difference. */
function extractDownloadLink(html, format) {
  const label = format === 'json' ? 'Download json' : 'Download sqlite';
  const labelIdx = html.indexOf(label);
  if (labelIdx === -1) return null;
  const anchorStart = html.lastIndexOf('<a', labelIdx);
  if (anchorStart === -1) return null;
  const anchorTag = html.slice(anchorStart, labelIdx);
  const dataUrlMatch = anchorTag.match(/data-url="([^"]+)"/);
  const hrefMatch = anchorTag.match(/href="([^"]+)"/);
  const link = dataUrlMatch?.[1] ?? hrefMatch?.[1] ?? null;
  if (!link || link.includes('/users/sign_in')) return null;
  return link.replace(/&amp;/g, '&');
}

function decodeEntities(s) {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function slugify(name) {
  return decodeEntities(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Parses the public "/resources/recitation" listing page for every card,
 * returning { id, name, searchText, hasSegments }. This listing page
 * itself doesn't require login. Callers filter by hasSegments/name as
 * needed — see main(). */
function parseResources(html) {
  const results = [];
  const re = /<li id="downloadable_resource_(\d+)"[^>]*data-search="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const [, id, searchText] = m;
    const decoded = decodeEntities(searchText);
    // Grab the display name from the card's own <span>NAME</span> — cleaner
    // casing/punctuation than the lowercased data-search blob.
    const windowHtml = html.slice(m.index, m.index + 1500);
    const nameMatch = windowHtml.match(/<span>([^<]+)<\/span>/);
    const name = nameMatch ? decodeEntities(nameMatch[1]) : decoded;
    results.push({ id, name, searchText: decoded, hasSegments: /with segments/i.test(decoded) });
  }
  return results;
}

async function login() {
  console.log('Logging in to QUL...');
  const signInRes = await request(`${BASE}/users/sign_in`);
  const signInHtml = await signInRes.text();
  const token = extractCsrfToken(signInHtml);

  const body = new URLSearchParams({
    authenticity_token: token,
    'user[email]': email,
    'user[password]': password,
    'user[remember_me]': '0',
  });
  await request(`${BASE}/users/sign_in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml',
    },
    body: body.toString(),
  });

  const checkRes = await request(`${BASE}/resources`);
  const checkHtml = await checkRes.text();
  if (looksLoggedOut(checkHtml)) {
    throw new Error(
      'Login does not appear to have succeeded (still seeing a logged-out nav). ' +
        'Double-check QUL_EMAIL/QUL_PASSWORD, or re-run with QUL_DEBUG=1 to dump the sign-in response.'
    );
  }
  console.log('Logged in.');
}

async function downloadOne(resource, outDir) {
  const resourceUrl = `${BASE}/resources/recitation/${resource.id}`;
  const resourceRes = await request(resourceUrl);
  if (!resourceRes.ok) throw new Error(`resource page returned HTTP ${resourceRes.status}`);
  const resourceHtml = await resourceRes.text();

  const downloadLink = extractDownloadLink(resourceHtml, format);
  if (!downloadLink) {
    throw new Error(`no authenticated "Download ${format}" link found on the resource page`);
  }

  const fileUrl = new URL(downloadLink, BASE).toString();
  const fileRes = await request(fileUrl);
  if (!fileRes.ok) throw new Error(`download request returned HTTP ${fileRes.status}`);

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const ext = format === 'json' ? 'json' : 'sqlite';
  const outPath = path.join(outDir, `${resource.id}-${slugify(resource.name)}.${ext}`);
  await writeFile(outPath, buffer);
  return { outPath, bytes: buffer.length };
}

async function main() {
  await login();

  let candidates;
  if (directId) {
    // Skip discovery entirely — fetch the resource page directly and pull
    // its name from the <title> tag (format: "Name - recitation(...)").
    const res = await request(`${BASE}/resources/recitation/${directId}`);
    if (!res.ok) throw new Error(`Resource ${directId} page returned HTTP ${res.status}`);
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    const name = titleMatch ? decodeEntities(titleMatch[1]).split(' - ')[0].trim() : `resource-${directId}`;
    candidates = [{ id: directId, name }];
    console.log(`Targeting resource ${directId} directly: "${name}"`);
  } else {
    console.log('Loading the recitation resources listing...');
    const listRes = await request(`${BASE}/resources/recitation`);
    if (!listRes.ok) throw new Error(`Listing page returned HTTP ${listRes.status}`);
    const listHtml = await listRes.text();

    const all = parseResources(listHtml);
    candidates = includeAll ? all : all.filter((r) => r.hasSegments);
    console.log(
      includeAll
        ? `Considering all ${candidates.length} recitation resources.`
        : `Found ${candidates.length} resources tagged "with segments".`
    );

    if (nameFilters.length > 0) {
      candidates = candidates.filter((r) => nameFilters.some((f) => r.searchText.includes(f)));
      console.log(`Filtered to ${candidates.length} matching: ${nameFilters.join(', ')}`);
    }
  }

  if (candidates.length === 0) {
    console.log('Nothing to download.');
    return;
  }

  const outDir = path.join(process.cwd(), 'qul-exports');
  await mkdir(outDir, { recursive: true });

  const succeeded = [];
  const failed = [];

  for (const [i, resource] of candidates.entries()) {
    process.stdout.write(`[${i + 1}/${candidates.length}] ${resource.name} (id ${resource.id})... `);
    try {
      const { outPath, bytes } = await downloadOne(resource, outDir);
      console.log(`OK — ${bytes.toLocaleString()} bytes -> ${outPath}`);
      succeeded.push(resource.name);
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failed.push({ name: resource.name, reason: err.message });
    }
    await sleep(DELAY_MS);
  }

  console.log('\n--- Summary ---');
  console.log(`Succeeded: ${succeeded.length}`);
  console.log(`Failed: ${failed.length}`);
  for (const f of failed) console.log(`  - ${f.name}: ${f.reason}`);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
