// Phase 0 (v2 audit, B6 item 2): which transitions/animations stutter, where, and why.
// For each interaction: 3 plain runs (frame intervals for 1.5 s after the input, the input-to-paint
// time from the Event Timing API, long animation frames), then 1 profiled run (CPU profile mapped
// through the build's source maps → functions; Chrome trace → style, layout, paint time).
// Phones: 360 px, touch, 4× CPU slowdown (as Lighthouse mobile). Desktop: 1366 px, no slowdown.
// Needs a `vite build --sourcemap` copy served at <baseUrl> and its folder as <distDir>.
//
//   node scripts/audit/animation-profile.mjs <baseUrl> <distDir> <outDir> [ids]
/* global document, window, requestAnimationFrame */

import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SourceMapConsumer } from 'source-map-js';

const [BASE, DIST, OUT, ONLY] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const RUNS = 3;
const WINDOW = 1500;

const listReady = (p) => p.locator('main button[aria-expanded="false"]:not([aria-haspopup]):visible').first().waitFor({ timeout: 60_000 });
const cardsReady = (p) => p.waitForFunction(() => {
  const s = document.querySelector('section[aria-labelledby="step-title"]');
  return s && !/Loading|Φόρτωση/.test(s.innerText) && s.querySelector('ul.grid > li.card');
}, null, { timeout: 60_000 });
const openSheet = async (p) => { await p.getByRole('button', { name: /^Φίλτρα/ }).click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(800); };

// `target` is resolved (and scrolled into view) BEFORE measuring; the input is then sent as raw CDP
// touch/mouse/key events, so Playwright's own element lookups don't run inside the measured window.
const firstOpener = (p) => p.locator('main button[aria-expanded="false"]:not([aria-haspopup]):visible').first();
const themeBtn = (p) => p.locator('button[aria-label*="θέμα"]').first();
const INTERACTIONS = [
  { id: 'P1-case-open-filter-sheet', form: 'phone', hash: '#case', ready: listReady, target: (p) => p.getByRole('button', { name: /^Φίλτρα/ }) },
  { id: 'P2-case-sheet-tap-chip', form: 'phone', hash: '#case', ready: listReady, pre: openSheet, target: (p) => p.getByRole('dialog').getByRole('button', { name: /^Μόνο προσφορές/ }) },
  { id: 'P3-case-close-filter-sheet', form: 'phone', hash: '#case', ready: listReady, pre: openSheet, key: 'Escape' },
  { id: 'P4-case-expand-card', form: 'phone', hash: '#case', ready: listReady, target: firstOpener },
  { id: 'P5-gpu-expand-card', form: 'phone', hash: '#gpu', ready: listReady, target: firstOpener },
  { id: 'P6-gpu-scroll-fling', form: 'phone', hash: '#gpu', ready: listReady, scroll: true },
  { id: 'P7-tab-gpu-to-case', form: 'phone', hash: '#gpu', ready: listReady, target: (p) => p.locator('a[href="#case"]').first() },
  { id: 'P8-case-theme-toggle', form: 'phone', hash: '#case', ready: listReady, target: themeBtn },
  { id: 'P9-builder-next-step', form: 'phone', hash: '#builder?step=cpu', ready: cardsReady, target: (p) => p.locator('aside button[aria-label="Επόμενο"]') },
  { id: 'P10-builder-open-summary-bar', form: 'phone', hash: '#builder?step=cpu', ready: cardsReady, target: (p) => p.locator('aside button[aria-expanded]').first() },
  { id: 'P11-builder-show-more', form: 'phone', hash: '#builder?step=cpu', ready: cardsReady, target: (p) => p.getByRole('button', { name: /^Περισσότερα/ }) },
  { id: 'D1-gpu-expand-row', form: 'desktop', hash: '#gpu', ready: listReady, target: (p) => p.locator('main tbody button[aria-expanded="false"]').first() },
  { id: 'D2-ram-expand-row', form: 'desktop', hash: '#ram', ready: listReady, target: (p) => p.locator('main tbody button[aria-expanded="false"]').first() },
  { id: 'D3-case-click-filter-chip', form: 'desktop', hash: '#case', ready: listReady, target: (p) => p.locator('aside').getByRole('button', { name: /^Μόνο προσφορές/ }) },
  { id: 'D4-case-change-sort', form: 'desktop', hash: '#case', ready: listReady, select: { selector: 'aside select', value: 'price-asc' } },
  { id: 'D5-case-theme-toggle', form: 'desktop', hash: '#case', ready: listReady, target: themeBtn },
  { id: 'D6-tab-gpu-to-case', form: 'desktop', hash: '#gpu', ready: listReady, target: (p) => p.locator('a[href="#case"]').first() },
  { id: 'D7-builder-next-step', form: 'desktop', hash: '#builder?step=cpu', ready: cardsReady, target: (p) => p.locator('section[aria-labelledby="step-title"]').getByRole('button', { name: /^Επόμενο$/ }) },
];

/** Prepare the input (outside the measured window), return the function that sends it. */
async function prepare(it, page, cdp) {
  if (it.scroll) return () => cdp.send('Input.synthesizeScrollGesture', { x: 180, y: 600, yDistance: -2400, speed: 2400, gestureSourceType: 'touch' });
  if (it.key) return async () => {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: it.key, code: it.key, windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: it.key, code: it.key, windowsVirtualKeyCode: 27 });
  };
  if (it.select) return () => page.evaluate(({ selector, value }) => {
    const s = document.querySelector(selector);
    s.value = value;
    s.dispatchEvent(new Event('change', { bubbles: true }));
  }, it.select);
  const loc = it.target(page);
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
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
async function setup(it) {
  const phone = it.form === 'phone';
  const ctx = await browser.newContext(phone
    ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem('lang', 'el'); localStorage.setItem('theme', 'light'); });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${BASE}/${it.hash}`);
  await it.ready(page);
  await page.waitForTimeout(2500); // photos, deferred counts, idle work
  if (it.pre) await it.pre(page);
  const send = await prepare(it, page, cdp);
  if (phone) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__m = { frames: [], events: [], loaf: [], on: true };
    const loop = (t) => { window.__m.frames.push(t); if (window.__m.on) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.events.push({ name: e.name, start: e.startTime, dur: e.duration, ps: e.processingStart, pe: e.processingEnd, id: e.interactionId }))).observe({ type: 'event', durationThreshold: 16 });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.loaf.push({
      start: e.startTime, dur: e.duration, block: e.blockingDuration, render: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
      scripts: e.scripts.map((s) => ({ invoker: s.invoker, type: s.invokerType, fn: s.sourceFunctionName, url: s.sourceURL, pos: s.sourceCharPosition, dur: Math.round(s.duration), forced: Math.round(s.forcedStyleAndLayoutDuration) })),
    }))).observe({ type: 'long-animation-frame' });
  });
  await page.waitForTimeout(300);
  return { ctx, page, cdp, send };
}
async function measure(page) {
  return page.evaluate((W) => {
    const m = window.__m;
    m.on = false;
    const t0 = m.t0;
    const f = m.frames.filter((t) => t >= t0 - 20 && t <= t0 + W);
    const gaps = f.slice(1).map((t, i) => t - f[i]);
    const ev = m.events.filter((e) => e.start >= t0 - 50 && e.id);
    return {
      frames: f.length,
      longestFrameMs: Math.round(Math.max(0, ...gaps)),
      framesOver33: gaps.filter((g) => g > 33.4).length,
      framesOver50: gaps.filter((g) => g > 50).length,
      droppedFrameTimeMs: Math.round(gaps.filter((g) => g > 17).reduce((s, g) => s + g - 16.7, 0)),
      inputToPaintMs: ev.length ? Math.round(Math.max(...ev.map((e) => e.dur))) : null,
      inputDelayMs: ev.length ? Math.round(Math.max(...ev.map((e) => e.ps - e.start))) : null,
      loaf: m.loaf.filter((l) => l.start >= t0 - 50).sort((a, b) => b.dur - a.dur).slice(0, 3).map((l) => ({ dur: Math.round(l.dur), block: Math.round(l.block), renderMs: Math.round(l.render), scripts: l.scripts.slice(0, 4) })),
    };
  }, WINDOW);
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// Source maps for the profile's minified positions.
const consumers = new Map();
function original(url, line, col) {
  const file = url.split('/assets/')[1];
  if (!file) return null;
  if (!consumers.has(file)) {
    const map = join(DIST, 'assets', `${file}.map`);
    consumers.set(file, existsSync(map) ? new SourceMapConsumer(JSON.parse(readFileSync(map, 'utf8'))) : null);
  }
  const c = consumers.get(file);
  if (!c) return null;
  const o = c.originalPositionFor({ line: line + 1, column: col });
  return o.source ? { source: o.source.replace(/^.*node_modules\//, 'node_modules/').replace(/^(\.\.\/)+/, ''), line: o.line, name: o.name } : null;
}

async function profiled(it) {
  const { ctx, page, cdp, send } = await setup(it);
  const events = [];
  cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
  const traced = new Promise((res) => cdp.once('Tracing.tracingComplete', res));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] }, transferMode: 'ReportEvents' });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await page.evaluate(() => { window.__m.t0 = performance.now(); });
  await send();
  await page.waitForTimeout(WINDOW);
  const { profile } = await cdp.send('Profiler.stop');
  await cdp.send('Tracing.end');
  await traced;
  await ctx.close();
  // Self time per original function.
  const self = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => {
    const n = byId.get(id);
    const dt = (profile.timeDeltas[i] ?? 0) / 1000;
    const cf = n.callFrame;
    const o = cf.url ? original(cf.url, cf.lineNumber, cf.columnNumber) : null;
    const key = o ? `${o.source}:${o.line} ${o.name ?? cf.functionName ?? ''}`.trim() : cf.url ? `${cf.url.split('/').pop()} ${cf.functionName}` : cf.functionName || '(anonymous)';
    self.set(key, (self.get(key) ?? 0) + dt);
  });
  const top = [...self].filter(([k]) => k !== '(idle)').sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${Math.round(v)} ms ${k}`);
  const bySource = new Map();
  for (const [k, v] of self) {
    if (k === '(idle)') continue;
    const src = k.startsWith('node_modules/react-dom') ? 'react-dom' : k.startsWith('node_modules/') ? k.split(':')[0] : k.startsWith('src/') ? k.split(':')[0] : k.startsWith('(') ? k : 'other';
    bySource.set(src, (bySource.get(src) ?? 0) + v);
  }
  // Main-thread work from the trace.
  const threads = new Map(events.filter((e) => e.name === 'thread_name').map((e) => [`${e.pid}:${e.tid}`, e.args?.name]));
  const mainKeys = [...threads].filter(([, n]) => n === 'CrRendererMain').map(([k]) => k);
  const sum = (names) => Math.round(events.filter((e) => e.ph === 'X' && mainKeys.includes(`${e.pid}:${e.tid}`) && names.includes(e.name)).reduce((s, e) => s + (e.dur ?? 0), 0) / 1000);
  return {
    jsSelfTopMs: top,
    jsBySourceMs: Object.fromEntries([...bySource].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, Math.round(v)])),
    traceMs: { tasks: sum(['RunTask']), style: sum(['UpdateLayoutTree']), layout: sum(['Layout']), paint: sum(['Paint', 'PrePaint', 'Layerize']), script: sum(['FunctionCall', 'EvaluateScript', 'TimerFire', 'FireAnimationFrame', 'EventDispatch']) },
  };
}

const results = {};
for (const it of INTERACTIONS) {
  if (ONLY && !ONLY.split(',').some((x) => it.id.startsWith(`${x}-`))) continue;
  try {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const { ctx, page, send } = await setup(it);
      await page.evaluate(() => { window.__m.t0 = performance.now(); });
      await send();
      await page.waitForTimeout(WINDOW);
      runs.push(await measure(page));
      await ctx.close();
    }
    const keys = ['frames', 'longestFrameMs', 'framesOver33', 'framesOver50', 'droppedFrameTimeMs', 'inputToPaintMs', 'inputDelayMs'];
    results[it.id] = {
      form: it.form,
      median: Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k] ?? 0))])),
      loafExample: runs[Math.floor(RUNS / 2)].loaf,
      profile: await profiled(it),
    };
    console.log(it.id, JSON.stringify(results[it.id].median));
  } catch (e) {
    results[it.id] = { failed: String(e).slice(0, 300) };
    console.log(it.id, 'FAILED', String(e).slice(0, 160));
  }
  writeFileSync(join(OUT, 'animation-profile.json'), `${JSON.stringify(results, null, 1)}\n`);
}
await browser.close();
