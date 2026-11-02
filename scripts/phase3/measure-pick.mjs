/* global document */
// Step 3 (pick mode) measurements, roadmap task 6 / A8 (+ 6b). Three modes:
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
//   node scripts/phase3/measure-pick.mjs trace <baseUrl> <outFile> [path] [build] [mobile|desktop]
//     Task 6b: long tasks (with the functions behind them, from a V8 CPU profile) and layout shifts (with the
//     shifted nodes) of one page and build; see the mode's comment below.
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
const builtAt = JSON.parse(readFileSync('dist/data/mobo/list.v2.json', 'utf8')).builtAt;
const typical = { compat: {} };
for (const s of ['cpu', 'mobo', 'ram', 'gpu', 'psu']) {
  typical[s] = PARTS[s].key;
  typical.compat[s] = { fields: PARTS[s].fields, builtAt };
}
const worst = Object.fromEntries(Object.entries(PARTS).map(([s, p]) => [s, p.key])); // keys only (old build)
const BUILDS = { a: null, b: typical, c: worst, gate: process.env.GATE_BUILD ? JSON.parse(readFileSync(process.env.GATE_BUILD, 'utf8')) : null };

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
  // Step 4: plain pages (no build): category pages, the builder and product pages, until the network is idle
  // (product pages: and the offers table is shown).
  for (const path of ['/gpu', '/case', '/storage', '/builder', '/gpu/rtx-5060-8gb', '/case/corsair-3500x', '/storage/crucial-p310-1tb-ssd']) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const setup = await withStorage(ctx, null);
    await setup.close();
    const page = await ctx.newPage();
    const files = [];
    const pending = [];
    page.on('response', (r) => {
      pending.push(
        r.body().then((b) => files.push({ url: new URL(r.url()).pathname, type: r.request().resourceType(), raw: b.length, gz: gzipSync(b, { level: 6 }).length })).catch(() => {}),
      );
    });
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');
    await Promise.all(pending);
    const sum = (pred) => files.filter(pred).reduce((t, f) => t + f.gz, 0) / 1024;
    const isData = (f) => /^\/data\/.+\.json$/.test(f.url);
    rows.push({
      page: path, build: '-', checked: true,
      jsKB: sum((f) => f.type === 'script'), dataKB: sum(isData), fontKB: sum((f) => f.type === 'font'),
      js: files.filter((f) => f.type === 'script').map((f) => `${f.url.split('/').pop()} ${(f.gz / 1024).toFixed(1)}`),
      data: files.filter(isData).map((f) => `${f.url.replace('/data/', '')} ${(f.gz / 1024).toFixed(1)}`),
    });
    console.log(path, 'js', rows.at(-1).jsKB.toFixed(1), 'data', rows.at(-1).dataKB.toFixed(1), 'font', rows.at(-1).fontKB.toFixed(1), rows.at(-1).data.join(' | '));
    await browser.close();
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
    { id: 'storage', path: '/storage' },
    { id: 'builder-guided', path: '/builder' },
    // Phase 4 gate (step 5 task 16): the builder with the gate's build b saved (GATE_BUILD = a file holding its
    // `pcBuild` JSON, from scripts/phase4/drive.mjs) and a deep link into the case step.
    { id: 'builder-gate-b', path: '/builder', build: 'gate' },
    { id: 'builder-step-case', path: '/builder?step=case' },
    // Step 4 product pages: models listed by all five shops, then by most listings (from list.v2.json).
    { id: 'p-gpu', path: '/gpu/rtx-5060-8gb' },
    { id: 'p-case', path: '/case/corsair-3500x' },
    { id: 'p-storage', path: '/storage/crucial-p310-1tb-ssd' },
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
} else if (MODE === 'trace') {
  // node scripts/phase3/measure-pick.mjs trace <baseUrl> <outFile> [path=/case?pick=1] [build=b] [form=mobile]
  // Task 6b: where the blocking time and the layout shifts of a pick page come from. Playwright Chromium with
  // the CPU slowed 4× on `mobile` (Lighthouse's phone factor), a V8 CPU profile from navigation until the check
  // finished + 2 s, and the page's own `longtask` / `layout-shift` entries (with the shifted nodes). Busy periods
  // ≥ 50 ms in the profile (consecutive non-idle samples) are listed with the functions that took most of them
  // (inclusive time); read it on a build made with `vite build --minify false` so the names are the source's.
  const OUT = A3, PATH = A4 ?? '/case?pick=1', BUILD = A5 ?? 'b', FORM = A6 ?? 'mobile';
  const browser = await chromium.launch();
  const ctx = await browser.newContext(FORM === 'mobile' ? { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true } : { viewport: { width: 1350, height: 940 } });
  const setup = await withStorage(ctx, BUILDS[BUILD] ?? null);
  await setup.close();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const w = /** @type {any} */ (globalThis);
    w.__lt = []; w.__ls = [];
    const name = (n) => (n && n.nodeType === 1 ? `${n.tagName.toLowerCase()}${n.className && typeof n.className === 'string' ? `.${n.className.trim().split(/\s+/).slice(0, 4).join('.')}` : ''} "${(n.textContent ?? '').trim().slice(0, 60)}"` : String(n?.nodeName));
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__lt.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__ls.push({ t: Math.round(e.startTime), value: e.value, input: e.hadRecentInput, sources: (e.sources ?? []).map((s) => ({ node: name(s.node), from: s.previousRect && [s.previousRect.y, s.previousRect.height], to: s.currentRect && [s.currentRect.y, s.currentRect.height] })) });
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const cdp = await ctx.newCDPSession(page);
  if (FORM === 'mobile') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await page.goto(`${BASE}${PATH}`);
  if (PATH.includes('pick=1')) {
    await page.locator('main [data-pick=bar] [role=status]:visible').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => !/Checking compatibility/.test(document.querySelector('main [data-pick=bar] [role=status]')?.textContent ?? ''), null, { timeout: 60000 });
  } else await page.locator('main tbody tr:visible, main li.card:visible').first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(2000);
  const { profile } = await cdp.send('Profiler.stop');
  const { longtasks, shifts } = await page.evaluate(() => ({ longtasks: /** @type {any} */ (globalThis).__lt, shifts: /** @type {any} */ (globalThis).__ls }));
  await browser.close();
  // Busy periods from the samples.
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const IDLE = new Set(['(idle)', '(program)', '(root)']);
  const stackOf = (id) => { const s = []; for (let x = id; x !== undefined; x = parent.get(x)) s.push(byId.get(x).callFrame); return s; };
  const label = (f) => `${f.functionName || '(anonymous)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
  let t = profile.startTime;
  const periods = [];
  const totals = new Map();
  let cur = null;
  for (let i = 0; i < profile.samples.length; i++) {
    t += profile.timeDeltas[i];
    const leaf = byId.get(profile.samples[i]).callFrame.functionName;
    const dt = (profile.timeDeltas[i + 1] ?? 0) / 1000;
    if (IDLE.has(leaf)) { if (cur) { periods.push(cur); cur = null; } continue; }
    if (!cur) cur = { startMs: (t - profile.startTime) / 1000, ms: 0, fns: new Map() };
    cur.ms += dt;
    for (const f of new Set(stackOf(profile.samples[i]).map(label))) {
      cur.fns.set(f, (cur.fns.get(f) ?? 0) + dt);
      totals.set(f, (totals.get(f) ?? 0) + dt);
    }
  }
  if (cur) periods.push(cur);
  const busy = periods.filter((p) => p.ms >= 50).map((p) => ({
    startMs: Math.round(p.startMs), ms: Math.round(p.ms),
    top: [...p.fns].filter(([f]) => !/^\(/.test(f)).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([f, ms]) => `${Math.round(ms)} ms ${f}`),
  }));
  const cls = shifts.filter((s) => !s.input).reduce((x, s) => x + s.value, 0);
  // Whole-run main-thread time per app function (inclusive; React's minified internals left out).
  const app = [...totals].filter(([f]) => !/^\(/.test(f) && !/^(\S{1,3}|react\S*|useMemo|useState|useEffect) index-/.test(f))
    .sort((a, b) => b[1] - a[1]).slice(0, 30).map(([f, ms]) => `${Math.round(ms)} ms ${f}`);
  const out = { path: PATH, build: BUILD, form: FORM, cpuSlowdown: FORM === 'mobile' ? 4 : 1, longtasks, tbtMs: longtasks.reduce((x, l) => x + Math.max(0, l.ms - 50), 0), cls, shifts, busy, app };
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${PATH} ${BUILD} ${FORM}: long tasks ${longtasks.map((l) => l.ms).join(', ')} ms (TBT ${out.tbtMs}), CLS ${cls.toFixed(3)} over ${shifts.length} shifts`);
  for (const b of busy) console.log(`  busy ${b.ms} ms at ${b.startMs}:\n    ${b.top.slice(0, 8).join('\n    ')}`);
} else {
  console.error('usage: measure-pick.mjs bytes|lighthouse|trace ...');
  process.exit(1);
}
