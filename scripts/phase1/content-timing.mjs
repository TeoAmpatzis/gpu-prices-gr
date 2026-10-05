// When does the content people came for appear? Lighthouse's LCP on v2's category pages is the page
// title (it paints with the first script), so this measures, on Lighthouse's phone profile (412 px,
// CPU 4× slower, 150 ms latency, 1.6 Mbit/s down, 750 kbit/s up), the time from navigation until the
// first contentful paint and until the first product row/card is visible (builder: the first product card
// of the CPU step). v1 and v2 side by side, median of 3, fresh browser context each run (no cache).
//
//   node scripts/phase1/content-timing.mjs <v1Url> <v2Url> [outFile]
/* global document, window, requestAnimationFrame, MutationObserver */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [V1, V2, OUT] = process.argv.slice(2);
const PAGES = [
  { id: 'gpu', v1: '/#gpu', v2: '/gpu', target: 'main li.card button[aria-expanded], main tbody tr button[aria-expanded]' },
  { id: 'ram', v1: '/#ram', v2: '/ram', target: 'main li.card button[aria-expanded], main tbody tr button[aria-expanded]' },
  { id: 'case', v1: '/#case', v2: '/case', target: 'main li.card button[aria-expanded], main tbody tr button[aria-expanded]' },
  { id: 'builder', v1: '/#builder?step=cpu', v2: '/builder?step=cpu', target: 'main li.card' },
];
const RUNS = 3;

const browser = await chromium.launch();
async function measure(url, target) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
  await ctx.addInitScript((sel) => {
    localStorage.setItem('lang', 'el');
    window.__t = {};
    const check = () => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0);
      if (el && !window.__t.content) requestAnimationFrame(() => (window.__t.content = performance.now()));
    };
    new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true });
  }, target);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(url);
  await page.waitForFunction(() => window.__t.content, null, { timeout: 60_000 });
  const r = await page.evaluate(() => ({
    fcp: Math.round(performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime ?? 0),
    content: Math.round(window.__t.content),
  }));
  await ctx.close();
  return r;
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const results = {};
for (const p of PAGES) {
  for (const [ver, base] of [['v1', V1], ['v2', V2]]) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(base + p[ver], p.target));
    results[`${p.id}/${ver}`] = { fcp: median(runs.map((r) => r.fcp)), content: median(runs.map((r) => r.content)), runs };
    console.log(`${p.id} ${ver}: first paint ${results[`${p.id}/${ver}`].fcp} ms, products visible ${results[`${p.id}/${ver}`].content} ms`);
  }
}
await browser.close();
if (OUT) writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
