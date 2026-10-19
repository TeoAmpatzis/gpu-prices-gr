// What loads before the first product appears? (step 4 Task 14). Same phone profile as
// scripts/phase1/content-timing.mjs (412 px, CPU 4x slower, 150 ms latency, 1.6 Mbit/s down, 750 kbit/s up,
// fresh context, Greek): every request of the page with its start/end (ms from navigation), transfer size
// and whether it starts before or after the first contentful paint, the main thread's long tasks, FCP and
// "products visible". Prints the run nearest the median of RUNS runs per URL.
//
//   node scripts/phase3/first-product-waterfall.mjs <url> [<url> …] [--out file.json] [--runs 3]
/* global document, window, location, requestAnimationFrame, MutationObserver */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const OUT = flag('--out');
const RUNS = Number(flag('--runs', '3'));
const URLS = args;
const TARGET = 'main li.card button[aria-expanded], main tbody tr button[aria-expanded]';

const browser = await chromium.launch();
async function measure(url) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
  await ctx.addInitScript((sel) => {
    localStorage.setItem('lang', 'el');
    window.__t = { long: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__t.long.push([Math.round(e.startTime), Math.round(e.duration)]);
    }).observe({ type: 'longtask', buffered: true });
    const check = () => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0);
      if (el && !window.__t.content) requestAnimationFrame(() => (window.__t.content = performance.now()));
    };
    new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true });
  }, TARGET);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(url);
  await page.waitForFunction(() => window.__t.content, null, { timeout: 60_000 });
  await page.waitForTimeout(1500); // requests that start right after the products (facet worker, photos)
  const r = await page.evaluate(() => {
    const fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime ?? 0;
    const nav = performance.getEntriesByType('navigation')[0];
    const res = [nav, ...performance.getEntriesByType('resource')].map((e) => ({
      name: e.name.replace(location.origin, '').replace(/\?.*$/, ''),
      type: e.initiatorType,
      start: Math.round(e.startTime),
      reqStart: Math.round(e.requestStart),
      end: Math.round(e.responseEnd),
      kb: Math.round(e.transferSize / 102.4) / 10,
      beforeFcp: e.startTime < fcp,
    }));
    return { fcp: Math.round(fcp), content: Math.round(window.__t.content), res, long: window.__t.long };
  });
  await ctx.close();
  return r;
}

const out = {};
for (const url of URLS) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await measure(url));
  const sorted = [...runs].sort((a, b) => a.content - b.content);
  const med = sorted[Math.floor(RUNS / 2)];
  out[url] = { fcp: med.fcp, content: med.content, contentRuns: runs.map((r) => r.content), median: med };
  console.log(`\n${url}  FCP ${med.fcp} ms, products visible ${med.content} ms (runs ${runs.map((r) => r.content).join('/')})`);
  for (const q of [...med.res].sort((a, b) => a.start - b.start)) {
    console.log(`  ${String(q.start).padStart(5)} → ${String(q.end).padStart(5)}  ${String(q.kb).padStart(6)} KB  ${q.beforeFcp ? 'before' : 'after '}  ${q.type.padEnd(10)} ${q.name}`);
  }
  console.log(`  long tasks (start, ms): ${med.long.map(([s, d]) => `${s}+${d}`).join(', ')}`);
}
await browser.close();
if (OUT) writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
