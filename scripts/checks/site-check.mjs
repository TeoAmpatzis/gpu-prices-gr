// End-to-end health check of the site in headless Chromium (live or a local `vite preview`).
//   node scripts/checks/site-check.mjs [https://gpu-prices-gr.vercel.app]
// Data and photo files must be served; deployed list files need the expected cache headers.
// The newest data is under 12 hours old, and every source of every category is under
// 24 hours old (warning over 12; source-age.mjs). Existing Playwright smoke and URL suites
// verify the real routes, product details, builder, text pages and legacy redirects.
// Exit code 1 if anything fails. Importing this module only exposes the pure data checks.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAIL_H, WARN_H, sourceAges } from './source-age.mjs';

const CATS = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler', 'monitor'];

/** Pure manifest/list validation, shared by the CLI and its negative-control tests. */
export function dataChecks(manifest, lists, now = Date.now()) {
  const checks = [];
  const check = (ok, what, detail = '') => checks.push({ ok: !!ok, what, detail });
  check(manifest && typeof manifest === 'object', 'manifest.json served', manifest ? `built ${manifest.builtAt}` : 'missing');
  for (const cat of CATS) {
    const c = manifest?.cats?.[cat];
    check(c && c.models > 0 && c.listings > 0, `${cat}: data`, c ? `${c.models} models, ${c.listings} listings, ${c.historyPoints ?? '?'} history points, updated ${c.updatedAt}` : 'missing');
    check(Array.isArray(lists[cat]?.rows) && lists[cat].rows.length > 0, `${cat}: list.v2.json has listings`);
    check(Object.keys(lists[cat]?.sources ?? {}).length > 0, `${cat}: source timestamps present`);
  }
  // Scrapes run every 6 hours: newest data older than 12 hours means scheduled runs are failing
  // (2026-10-03: selectolax 1.0 broke three runs in a row and nobody noticed for ~15 hours).
  const MAX_AGE_H = 12;
  const newest = Math.max(0, ...CATS.map((cat) => Date.parse(manifest?.cats?.[cat]?.updatedAt ?? '') || 0));
  const ageH = (now - newest) / 36e5;
  check(newest > 0 && ageH <= MAX_AGE_H, `newest data under ${MAX_AGE_H} h old`, newest ? `${ageH.toFixed(1)} h since ${new Date(newest).toISOString()}` : 'no updatedAt in the manifest');
  // Per source (backlog #8): a source that keeps failing keeps its old listings, so its prices age while
  // the newest data above looks fresh (2026-10-04: Skroutz storage 35 h old, the check above green).
  const ages = sourceAges(lists, now);
  // sourceAges rounds display ages; enforce the actual 24-hour boundary before rounding, too.
  const old = ages.filter((r) => r.level === 'fail' || now - Date.parse(r.updatedAt) > FAIL_H * 36e5);
  check(ages.length > 0 && old.length === 0, `every source's data under ${FAIL_H} h old`,
    old.length ? old.map((r) => `${r.cat}/${r.source} ${r.ageH ?? 'never'} h`).join(', ') : `${ages.length} category × source pairs, oldest ${Math.max(...ages.map((r) => r.ageH))} h`);
  return checks;
}

// The photo bitset indexes sorted hist keys (src/lib/columns.ts); photos use the same
// sha1("<cat>\0<model key>") id as src/lib/images.ts and scraper/images.py.
function samplePhoto(lists) {
  for (const cat of CATS) {
    const list = lists[cat];
    const bits = Buffer.from(list?.photos ?? '', 'base64');
    const key = Object.keys(list?.hist ?? {}).sort().find((_, i) => bits[i >> 3] & (1 << (i & 7)));
    if (key !== undefined) {
      const id = createHash('sha1').update(`${cat}\0${key}`).digest('hex').slice(0, 12);
      return `/img/${cat}/${id}-96.webp`;
    }
  }
  return null;
}

async function main(base) {
  let failures = 0;
  const check = (ok, what, detail = '') => {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${detail ? `  (${detail})` : ''}`);
  };
  const get = async (path) => {
    try {
      const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      check(false, `${path} served`, error.message);
      return null;
    }
  };
  const json = async (path) => {
    const response = await get(path);
    try {
      return { response, data: response ? await response.json() : null };
    } catch (error) {
      check(false, `${path} valid JSON`, error.message);
      return { response, data: null };
    }
  };

  // ---- files and headers
  const { data: manifest } = await json('/data/manifest.json');
  const files = await Promise.all(CATS.map(async (cat) => [cat, await json(`/data/${cat}/list.v2.json`)]));
  const lists = Object.fromEntries(files.map(([cat, file]) => [cat, file.data]));
  for (const result of dataChecks(manifest, lists)) check(result.ok, result.what, result.detail);
  for (const r of sourceAges(lists).filter((r) => r.level === 'warn')) {
    console.log(`WARN ${r.cat}/${r.source} data ${r.ageH} h old (over ${WARN_H} h; fails over ${FAIL_H} h)`);
  }
  const cache = files.find(([cat]) => cat === 'gpu')[1].response?.headers.get('cache-control') ?? '';
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname);
  if (local) console.log('SKIP list.v2.json cached 5 min: localhost Vite preview does not implement hosting cache headers');
  else check(/(?:^|,)\s*max-age=300\s*(?:,|$)/i.test(cache), 'list.v2.json cached 5 min', cache);

  // ---- photo file through /img (Vercel → images repo)
  const photo = samplePhoto(lists);
  if (photo) {
    const response = await get(photo);
    const type = response?.headers.get('content-type') ?? '';
    const bytes = response ? (await response.arrayBuffer()).byteLength : 0;
    check(response && type.includes('image/webp') && bytes > 0, 'photos served under /img', `${photo} ${type}, ${bytes} bytes`);
  } else console.log('SKIP photo served check: dataset advertises no model photos');

  // Reuse maintained v2 route tests instead of maintaining a second set of UI selectors.
  // Keep artifacts outside the shared test-results directory: another local suite may be active.
  const output = mkdtempSync(join(tmpdir(), 'builddraft-site-check-'));
  console.log(`Playwright artifacts: ${output}`);
  const require = createRequire(import.meta.url);
  const code = await new Promise((done, reject) => {
    const child = spawn(process.execPath, [require.resolve('@playwright/test/cli'), 'test', 'tests/e2e/smoke.spec.ts', 'tests/e2e/urls.spec.ts', '--max-failures=1', '--output', output], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      env: { ...process.env, E2E_BASE_URL: base },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (status) => done(status ?? 1));
  });
  check(code === 0, 'Playwright smoke and URL suites', `exit ${code}`);
  console.log(failures ? `\n${failures} FAILED` : '\nall checks passed');
  return failures ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = (process.argv[2] || 'https://gpu-prices-gr.vercel.app').replace(/\/$/, '');
  main(base).then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(`FAIL site check: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
