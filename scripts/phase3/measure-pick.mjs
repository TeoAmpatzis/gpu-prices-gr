// Step 3 (pick mode) measurements, roadmap task 6 / A8. Two modes:
//
//   node scripts/phase3/measure-pick.mjs bytes <baseUrl> <outFile>
//     Playwright: first-load bytes (gzip of every response body, level 6) of /mobo, /cpu, /case ?pick=1 for
//     builds (a) empty, (b) typical (cpu, mobo, ram, gpu, psu WITH compat fields), (c) worst (old keys-only
//     build with a part in every slot). "First load" = until the pick check has finished (status line no
//     longer "Checking...") and the network is idle. JS, data and fonts are reported separately.
//
//   node scripts/phase3/measure-pick.mjs lighthouse <baseUrl> <outDir> <rawDir> [runs=3] [filter]
//     The same median method as scripts/audit/lighthouse-baseline.mjs (the existing script is not changed;
//     this one re-implements its summarize/median, because that file runs on import). Pages carry a
//     precondition: a fresh Chromium profile per run (cold HTTP cache) with localStorage `pcBuild` preset
//     through Playwright, then `lighthouse --port=<that Chromium> --disable-storage-reset`. Raw JS/data KB in
//     the Lighthouse JSON are compressed transfer sizes (response headers included): compare them with
//     Phase 2's the same way; exact gzip body bytes come from the `bytes` mode.
//
// The builds use real keys from dist/data/compat (run `npm run build` first). Lighthouse needs `npx`.

import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';

const [MODE, BASE, A3, A4, A5, A6] = process.argv.slice(2);

// ---- builds -------------------------------------------------------------------------------------------
const rowsOf = (slot) => {
  const out = {};
  for (const f of readdirSync('dist/data/compat').filter((x) => x.startsWith(`${slot}-`)))
    Object.assign(out, JSON.parse(readFileSync(`dist/data/compat/${f}`, 'utf8')).rows);
  return out;
};
const pick = (slot, test) => {
  const e = Object.entries(rowsOf(slot)).find(([, v]) => test(v));
  if (!e) throw new Error(`no ${slot} row for the test build`);
  return { key: e[0], fields: e[1] };
};
const PARTS = {
  cpu: pick('cpu', (v) => v.socket === 'AM5' && v.chip === 'Ryzen 7 7700'),
  mobo: pick('mobo', (v) => v.socket === 'AM5' && v.memory === 'DDR5' && v.formFactor === 'ATX'),
  ram: pick('ram', (v) => v.type === 'DDR5' && v.capacity === 32 && v.modules === 2),
  gpu: pick('gpu', (v) => v.lengthMm > 250 && v.minPsu > 500),
  cooler: pick('cooler', (v) => v.type === 'Air' && String(v.sockets).includes('AM5') && v.heightMm > 140),
  storage: pick('storage', (v) => v.iface === 'NVMe'),
  case: pick('case', (v) => v.gpuMaxMm > 300 && v.maxBoard === 'ATX'),
  fan: pick('fan', (v) => v.size === 120),
  psu: pick('psu', (v) => v.watts === 750),
};
const builtAt = JSON.parse(readFileSync('dist/data/mobo/list.json', 'utf8')).builtAt;
const typical = { compat: {} };
for (const s of ['cpu', 'mobo', 'ram', 'gpu', 'psu']) {
  typical[s] = PARTS[s].key;
  typical.compat[s] = { fields: PARTS[s].fields, builtAt };
}
const worst = Object.fromEntries(Object.entries(PARTS).map(([s, p]) => [s, p.key])); // keys only (old build)
const BUILDS = { a: null, b: typical, c: worst };

// ---- helpers ------------------------------------------------------------------------------------------
async function withStorage(ctx, build) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/favicon.svg`);
  await page.evaluate((b) => {
    localStorage.clear();
    localStorage.setItem('lang', 'en');
    if (b) localStorage.setItem('pcBuild', JSON.stringify(b));
  }, build);
  return page;
}

if (MODE === 'bytes') {
  const rows = [];
  for (const cat of ['mobo', 'cpu', 'case']) {
    for (const [name, build] of Object.entries(BUILDS)) {
      const browser = await chromium.launch();
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const setup = await withStorage(ctx, build);
      await setup.close();
      const page = await ctx.newPage();
      const files = [];
      const pending = [];
      page.on('response', (r) => {
        pending.push(
          r.body().then((b) => files.push({ url: new URL(r.url()).pathname, type: r.request().resourceType(), raw: b.length, gz: gzipSync(b, { level: 6 }).length })).catch(() => {}),
        );
      });
      await page.goto(`${BASE}/${cat}?pick=1`, { waitUntil: 'networkidle' });
      const status = page.locator('main [data-pick=bar] [role=status]:visible');
      let checked = true;
      try {
        await status.waitFor({ timeout: 20000 });
        await page.waitForFunction(() => !/Checking compatibility/.test(document.querySelector('main [data-pick=bar] [role=status]')?.textContent ?? ''), null, { timeout: 20000 });
      } catch { checked = false; }
      await page.waitForLoadState('networkidle');
      await Promise.all(pending);
      const sum = (pred, k = 'gz') => files.filter(pred).reduce((t, f) => t + f[k], 0) / 1024;
      const isData = (f) => /^\/data\/.+\.json$/.test(f.url);
      rows.push({
        page: `/${cat}?pick=1`, build: name, checked,
        jsKB: sum((f) => f.type === 'script'), dataKB: sum(isData), fontKB: sum((f) => f.type === 'font'),
        js: files.filter((f) => f.type === 'script').map((f) => `${f.url.split('/').pop()} ${(f.gz / 1024).toFixed(1)}`),
        data: files.filter(isData).map((f) => `${f.url.replace('/data/', '')} ${(f.gz / 1024).toFixed(1)}`),
      });
      console.log(rows.at(-1).page, name, 'checked', checked, 'js', rows.at(-1).jsKB.toFixed(1), 'data', rows.at(-1).dataKB.toFixed(1), 'font', rows.at(-1).fontKB.toFixed(1));
      await browser.close();
    }
  }
  writeFileSync(A3, `${JSON.stringify({ builds: { typical: Object.keys(typical), worst: Object.keys(worst), parts: Object.fromEntries(Object.entries(PARTS).map(([s, p]) => [s, p.key])) }, rows }, null, 2)}\n`);
} else if (MODE === 'lighthouse') {
  const OUT = A3, RAW = A4, RUNS = Number(A5 ?? 3), ONLY = A6;
  mkdirSync(OUT, { recursive: true });
  mkdirSync(RAW, { recursive: true });
  const PAGES = [
    { id: 'gpu', path: '/gpu' },
    { id: 'gpu-pick-a', path: '/gpu?pick=1', build: 'a' },
    { id: 'gpu-pick-b', path: '/gpu?pick=1', build: 'b' },
    { id: 'gpu-pick-c', path: '/gpu?pick=1', build: 'c' },
    { id: 'case', path: '/case' },
    { id: 'case-pick-a', path: '/case?pick=1', build: 'a' },
    { id: 'case-pick-b', path: '/case?pick=1', build: 'b' },
    { id: 'case-pick-c', path: '/case?pick=1', build: 'c' },
    { id: 'builder-guided', path: '/builder' },
  ];
  const median = (xs) => {
    const s = xs.filter((x) => x != null).sort((a, b) => a - b);
    if (!s.length) return null;
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const summarize = (lhr) => {
    const a = lhr.audits;
    const reqs = a['network-requests']?.details?.items ?? [];
    const bytes = (pred) => reqs.filter(pred).reduce((t, r) => t + (r.transferSize ?? 0), 0);
    return {
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      fcpMs: a['first-contentful-paint']?.numericValue, lcpMs: a['largest-contentful-paint']?.numericValue,
      tbtMs: a['total-blocking-time']?.numericValue, cls: a['cumulative-layout-shift']?.numericValue, siMs: a['speed-index']?.numericValue,
      totalKB: bytes(() => true) / 1024, jsKB: bytes((r) => r.resourceType === 'Script') / 1024,
      dataKB: bytes((r) => /\/data\/.+\.json/.test(r.url)) / 1024, fontKB: bytes((r) => r.resourceType === 'Font') / 1024,
      scripts: reqs.filter((r) => r.resourceType === 'Script').map((r) => `${r.url.split('/').pop()} ${(r.transferSize / 1024).toFixed(1)}`),
      data: reqs.filter((r) => /\/data\/.+\.json/.test(r.url)).map((r) => `${r.url.split('/data/').pop().split('?')[0]} ${(r.transferSize / 1024).toFixed(1)}`),
    };
  };
  const results = {};
  let port = 9400;
  for (const p of PAGES) {
    if (ONLY && !ONLY.split(',').includes(p.id)) continue;
    for (const form of ['mobile', 'desktop']) {
      const runs = [];
      for (let i = 1; i <= RUNS; i++) {
        const thisPort = port++;
        const profile = mkdtempSync(join(tmpdir(), 'lhprof-'));
        // Chromium started here (headless=new, own profile) so Lighthouse can attach to it; Playwright only
        // presets localStorage over CDP first.
        const proc = spawn(chromium.executablePath(), ['--headless=new', `--remote-debugging-port=${thisPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
        let br;
        for (let t = 0; t < 40 && !br; t++) { try { br = await chromium.connectOverCDP(`http://127.0.0.1:${thisPort}`); } catch { await new Promise((r) => setTimeout(r, 500)); } }
        const ctx = br.contexts()[0];
        const setup = await withStorage(ctx, p.build ? BUILDS[p.build] : null);
        await setup.goto('about:blank');
        await br.close();
        const file = join(RAW, `${p.id}-${form}-${i}.json`);
        const args = ['-y', 'lighthouse@12', `${BASE}${p.path}`, '--quiet', '--output=json', `--output-path=${file}`,
          '--only-categories=performance,accessibility', `--port=${thisPort}`, '--disable-storage-reset'];
        if (form === 'desktop') args.push('--preset=desktop');
        try { execFileSync('npx', args, { stdio: 'inherit', shell: true, timeout: 240000 }); } finally { proc.kill(); await new Promise((r) => setTimeout(r, 1500)); }
        runs.push(summarize(JSON.parse(readFileSync(file, 'utf8'))));
        console.log(`${p.id} ${form} run ${i}: perf ${runs.at(-1).performance}, LCP ${(runs.at(-1).lcpMs / 1000).toFixed(2)} s, js ${runs.at(-1).jsKB.toFixed(1)} data ${runs.at(-1).dataKB.toFixed(1)}`);
      }
      const keys = ['performance', 'accessibility', 'fcpMs', 'lcpMs', 'tbtMs', 'cls', 'siMs', 'totalKB', 'jsKB', 'dataKB', 'fontKB'];
      results[`${p.id}/${form}`] = {
        median: Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))])),
        runs: runs.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]]))),
        scripts: runs[0].scripts, data: runs[0].data,
      };
      writeFileSync(join(OUT, 'lighthouse.json'), `${JSON.stringify(results, null, 2)}\n`);
    }
  }
} else {
  console.error('usage: measure-pick.mjs bytes|lighthouse ...');
  process.exit(1);
}
