// Motion check (v2 Phase 1, plan A4): do the shell's transitions run smoothly on a slow phone?
// For each interaction, 3 runs on a fresh page: frame-to-frame times (requestAnimationFrame) for 1.5 s
// after the input, long animation frames, and the input's Event Timing duration (input → next paint).
// Phone: 360 × 780, touch, CPU slowed 4× (Lighthouse's phone). Desktop: 1366 × 900, mouse, also 4×.
// Pass per interaction (median of 3): no frame > 50 ms, at most 1 frame > 33 ms, input → paint ≤ 100 ms.
// Interactions marked `report` are measured but outside the pass (v1 page work, Phase 3; plan A4).
// Shell pages run on the production preview; the catalogue's sheet, dialog and toast exist only in
// the dev server (React's development build, slower than production — a pass there is conservative).
//
//   node scripts/checks/motion-check.mjs <previewUrl> <devUrl> <outFile> [ids]
/* global window, requestAnimationFrame */

import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const [PROD, DEV, OUT, ONLY] = process.argv.slice(2);
const RUNS = 3;
const WINDOW = 1500;

const h1 = (p) => p.locator('main h1').first().waitFor({ timeout: 30_000 });
const tiles = (p) => p.locator('main ul a[href="/gpu"]').first().waitFor({ timeout: 30_000 });
const catalogue = (p) => p.locator('#overlays').waitFor({ timeout: 60_000 });
const visible = (p, sel) => p.locator(sel).filter({ visible: true }).first();
const phoneSearchOpen = async (p) => {
  await visible(p, 'header button:has(svg.lucide-search)').click();
  await p.locator('[role=dialog] input[role=combobox]').waitFor();
  await p.waitForTimeout(1500); // the search index arrives and is parsed in idle time
};
const typed = async (p, sel) => {
  await p.locator(sel).click();
  await p.keyboard.type('rtx 50');
  await p.locator('[role=listbox] [role=option]').first().waitFor({ timeout: 10_000 });
  await p.waitForTimeout(300);
};

const INTERACTIONS = [
  { id: 'P1-open-parts-tiles', form: 'phone', path: '/', ready: tiles, target: (p) => visible(p, 'header a[href="/parts"]') },
  { id: 'P2-close-parts-tiles', form: 'phone', path: '/', ready: tiles, pre: async (p) => { await visible(p, 'header a[href="/parts"]').click(); await p.locator('main h1').waitFor(); await p.waitForTimeout(600); }, script: () => window.history.back() },
  { id: 'P3-open-search-panel', form: 'phone', path: '/', ready: tiles, target: (p) => visible(p, 'header button:has(svg.lucide-search)') },
  { id: 'P4-type-rtx-50', form: 'phone', path: '/', ready: tiles, pre: phoneSearchOpen, text: 'rtx 50' },
  { id: 'P5-search-arrow-down', form: 'phone', path: '/', ready: tiles, pre: async (p) => { await phoneSearchOpen(p); await p.keyboard.type('rtx 50'); await p.locator('[role=listbox] [role=option]').first().waitFor(); await p.waitForTimeout(300); }, key: 'ArrowDown' },
  { id: 'P6-search-enter', form: 'phone', path: '/', ready: tiles, report: true, pre: async (p) => { await phoneSearchOpen(p); await p.keyboard.type('rtx 50'); await p.locator('[role=listbox] [role=option]').first().waitFor(); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(300); }, key: 'Enter' },
  { id: 'P7-language-switch', form: 'phone', path: '/parts', ready: h1, target: (p) => visible(p, 'main button[lang="en"]') },
  { id: 'P8-home-to-builder', form: 'phone', path: '/', ready: tiles, target: (p) => visible(p, 'header a[href="/builder"]') },
  { id: 'D1-open-mega-menu', form: 'desktop', path: '/', ready: tiles, target: (p) => p.locator('header button[aria-controls]') },
  { id: 'D2-close-mega-menu', form: 'desktop', path: '/', ready: tiles, pre: async (p) => { await p.locator('header button[aria-controls]').click(); await p.waitForTimeout(500); }, key: 'Escape' },
  { id: 'D3-focus-search', form: 'desktop', path: '/', ready: tiles, target: (p) => p.locator('header input[role=combobox]:visible') },
  { id: 'D4-type-rtx-50', form: 'desktop', path: '/', ready: tiles, pre: async (p) => { await p.locator('header input[role=combobox]:visible').click(); await p.waitForTimeout(1500); }, text: 'rtx 50' },
  { id: 'D5-search-arrow-down', form: 'desktop', path: '/', ready: tiles, pre: (p) => typed(p, 'header input[role=combobox]:visible'), key: 'ArrowDown' },
  { id: 'D6-search-enter', form: 'desktop', path: '/', ready: tiles, report: true, pre: async (p) => { await typed(p, 'header input[role=combobox]:visible'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(300); }, key: 'Enter' },
  { id: 'D7-language-switch', form: 'desktop', path: '/', ready: tiles, target: (p) => p.locator('header button[lang="en"]') },
  { id: 'D8-home-to-builder', form: 'desktop', path: '/', ready: tiles, target: (p) => p.locator('header a[href="/builder"]').first() },
  { id: 'C1-open-bottom-sheet', form: 'phone', dev: true, path: '/_preview', ready: catalogue, target: (p) => p.locator('#overlays button').filter({ hasText: /Άνοιγμα sheet/ }) },
  { id: 'C2-close-bottom-sheet', form: 'phone', dev: true, path: '/_preview', ready: catalogue, pre: async (p) => { await p.locator('#overlays button').filter({ hasText: /Άνοιγμα sheet/ }).click(); await p.waitForTimeout(800); }, key: 'Escape' },
  { id: 'C3-open-dialog', form: 'desktop', dev: true, path: '/_preview', ready: catalogue, target: (p) => p.locator('#overlays button').filter({ hasText: /Άνοιγμα διαλόγου/ }) },
  { id: 'C4-close-dialog', form: 'desktop', dev: true, path: '/_preview', ready: catalogue, pre: async (p) => { await p.locator('#overlays button').filter({ hasText: /Άνοιγμα διαλόγου/ }).click(); await p.waitForTimeout(800); }, key: 'Escape' },
  { id: 'C5-show-toast', form: 'desktop', dev: true, path: '/_preview', ready: catalogue, target: (p) => p.locator('#overlays button').filter({ hasText: /Εμφάνιση toast/ }) },
];

const KEYS = { ArrowDown: 40, Enter: 13, Escape: 27 };

/** Requests in flight per page (all frames), to wait for a quiet network. */
const inflight = new WeakMap();
function track(page) {
  inflight.set(page, 0);
  page.on('request', () => inflight.set(page, inflight.get(page) + 1));
  const done = () => inflight.set(page, Math.max(0, inflight.get(page) - 1));
  page.on('requestfinished', done);
  page.on('requestfailed', done);
}
/** Waits until no request has been in flight for `ms` (max 30 s): scrolling the catalogue brings lazily
 *  loaded parts into view (its 360 px frames run the whole app), whose data loads would land in the window. */
async function quiet(page, ms = 1500) {
  const end = Date.now() + 30_000;
  let since = Date.now();
  while (Date.now() < end) {
    await page.waitForTimeout(100);
    if (inflight.get(page) > 0) since = Date.now();
    else if (Date.now() - since >= ms) return;
  }
}

/** Prepare the input outside the measured window; return the function that sends it as raw CDP events. */
async function prepare(it, page, cdp) {
  if (it.script) return () => page.evaluate(it.script);
  if (it.text) return () => cdp.send('Input.insertText', { text: it.text });
  if (it.key) return async () => {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: it.key, code: it.key, windowsVirtualKeyCode: KEYS[it.key] });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: it.key, code: it.key, windowsVirtualKeyCode: KEYS[it.key] });
  };
  const loc = it.target(page);
  await loc.scrollIntoViewIfNeeded();
  await quiet(page);
  await page.waitForTimeout(300);
  const b = await loc.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  if (it.form === 'phone') return async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  return async () => {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
}

const browser = await chromium.launch();
async function run(it) {
  const phone = it.form === 'phone';
  const ctx = await browser.newContext(phone
    ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('lang', 'el'));
  const page = await ctx.newPage();
  track(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${it.dev ? DEV : PROD}${it.path}`);
  await it.ready(page);
  // Measure a settled page: the catalogue (and its five 360 px frames) keeps loading every category's data
  // for seconds, and those JSON parses otherwise land inside the measured window.
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(2000); // fonts, photos, idle work
  if (it.pre) await it.pre(page);
  await quiet(page);
  const send = await prepare(it, page, cdp);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__m = { frames: [], events: [], loaf: [], on: true };
    const loop = (t) => { window.__m.frames.push(t); if (window.__m.on) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.events.push({ start: e.startTime, dur: e.duration, id: e.interactionId }))).observe({ type: 'event', durationThreshold: 16 });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.loaf.push({ start: e.startTime, dur: e.duration }))).observe({ type: 'long-animation-frame' });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__m.t0 = performance.now(); });
  await send();
  await page.waitForTimeout(WINDOW);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const r = await page.evaluate((W) => {
    const m = window.__m;
    m.on = false;
    const f = m.frames.filter((t) => t >= m.t0 - 20 && t <= m.t0 + W);
    const gaps = f.slice(1).map((t, i) => t - f[i]);
    const ev = m.events.filter((e) => e.start >= m.t0 - 50 && e.id);
    return {
      longestFrameMs: Math.round(Math.max(0, ...gaps)),
      framesOver33: gaps.filter((g) => g > 33.4).length,
      framesOver50: gaps.filter((g) => g > 50).length,
      inputToPaintMs: ev.length ? Math.round(Math.max(...ev.map((e) => e.dur))) : null,
      longAnimationFrames: m.loaf.filter((l) => l.start >= m.t0 - 50).map((l) => Math.round(l.dur)),
    };
  }, WINDOW);
  await ctx.close();
  return r;
}

const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

const results = {};
for (const it of INTERACTIONS) {
  if (ONLY && !ONLY.split(',').some((x) => it.id.startsWith(`${x}-`))) continue;
  try {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await run(it));
    const med = {
      longestFrameMs: median(runs.map((r) => r.longestFrameMs)),
      framesOver33: median(runs.map((r) => r.framesOver33)),
      framesOver50: median(runs.map((r) => r.framesOver50)),
      inputToPaintMs: median(runs.map((r) => r.inputToPaintMs)),
    };
    const pass = med.framesOver50 === 0 && med.framesOver33 <= 1 && (med.inputToPaintMs == null || med.inputToPaintMs <= 100);
    results[it.id] = { form: it.form, server: it.dev ? 'dev' : 'preview', inPass: !it.report, pass, median: med, runs };
    console.log(`${it.id}: ${it.report ? 'reported' : pass ? 'PASS' : 'FAIL'} — longest frame ${med.longestFrameMs} ms, >33 ms ${med.framesOver33}, >50 ms ${med.framesOver50}, input→paint ${med.inputToPaintMs ?? '—'} ms`);
  } catch (e) {
    results[it.id] = { error: String(e.message ?? e).split('\n')[0] };
    console.log(`${it.id}: ERROR ${results[it.id].error}`);
  }
  writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
}
await browser.close();
const failed = Object.entries(results).filter(([, r]) => r.inPass && !r.pass);
console.log(failed.length ? `\n${failed.length} failed: ${failed.map(([k]) => k).join(', ')}` : '\nall passed');
