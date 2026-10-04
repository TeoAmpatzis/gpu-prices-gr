// Phase 0 (v2 audit, B5): v1's product details have no URL of their own (they open inside the list),
// so Lighthouse cannot load them. This measures opening them instead, in Chromium with Lighthouse's
// mobile throttling (4× CPU slowdown, 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up): time from the
// click until the offers and the price chart are shown, bytes downloaded for it, and long tasks.
//
//   node scripts/audit/details-perf.mjs <baseUrl> <outFile> [runs=3]
/* global document, window */

import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const [BASE, OUT, RUNS_ARG] = process.argv.slice(2);
const RUNS = Number(RUNS_ARG ?? 3);
const CATS = ['gpu', 'ram', 'case'];

const browser = await chromium.launch();
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const results = {};
for (const cat of CATS) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const urls = new Map();
    cdp.on('Network.responseReceived', (e) => urls.set(e.requestId, e.response.url));
    let counting = false;
    const got = [];
    cdp.on('Network.loadingFinished', (e) => counting && got.push({ url: urls.get(e.requestId) ?? '?', bytes: e.encodedDataLength }));
    await page.goto(`${BASE}/#${cat}`);
    // Phones render cards; each card's name is a button with aria-expanded (the Filters and the
    // sources-status buttons above the list are popups: aria-haspopup).
    const opener = page.locator('main button[aria-expanded="false"]:not([aria-haspopup]):visible').first();
    await opener.waitFor({ timeout: 60_000 });
    await page.waitForTimeout(3000); // let photos and idle work settle
    await page.evaluate(() => {
      window.__lt = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__lt += Math.max(0, e.duration - 50)))).observe({ type: 'longtask' });
    });
    counting = true;
    const t0 = Date.now();
    await opener.click();
    await page.waitForFunction(() => !!document.querySelector('main ul a[href]') && !!document.querySelector('main [role=img] svg path'), null, { timeout: 60_000 });
    const ms = Date.now() - t0;
    await page.waitForTimeout(1000);
    counting = false;
    const blockingMs = await page.evaluate(() => window.__lt);
    runs.push({ ms, blockingMs: Math.round(blockingMs), kB: got.reduce((t, r) => t + r.bytes, 0) / 1024, files: got.map((r) => `${r.url.split('/').pop().split('?')[0]} ${(r.bytes / 1024).toFixed(1)}`) });
    await ctx.close();
  }
  results[cat] = { medianMs: median(runs.map((r) => r.ms)), medianBlockingMs: median(runs.map((r) => r.blockingMs)), medianKB: median(runs.map((r) => r.kB)), runs };
  console.log(cat, results[cat].medianMs, 'ms', results[cat].medianKB.toFixed(1), 'kB');
}
await browser.close();
writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
