// Focused screenshots of the component catalogue for a written hand-off (readable sizes: 1248 px wide,
// at most ~1900 px tall each; longer parts are split into -a, -b…). Needs `npm run dev` running.
//   node scripts/phase1/handoff-shots.mjs <outDir> [baseUrl=http://localhost:5174]
/* global document, window */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const OUT = resolve(process.argv[2] ?? '');
const BASE = (process.argv[3] ?? 'http://localhost:5174').replace(/\/$/, '');
if (!process.argv[2]) throw new Error('usage: handoff-shots.mjs <outDir> [baseUrl]');
mkdirSync(OUT, { recursive: true });
const MAX_H = 1900;
const browser = await chromium.launch();

async function open({ logo = 'a', palette = 'blue', theme = 'light', lang = 'el' }) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: lang === 'el' ? 'el-GR' : 'en-US' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/_preview?logo=${logo}&palette=${palette}&theme=${theme}&lang=${lang}`);
  await page.locator('#shell').waitFor({ timeout: 60_000 });
  await page.addStyleTag({ content: '.sticky{position:static!important}' });
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(100);
  }
  for (const f of page.frames().filter((x) => x.url().includes('frame='))) await f.locator('main, [role=dialog]').first().waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  return { ctx, page };
}

/** From the top of section `from` to the bottom of section `to` (optionally only its first `maxH` px). */
async function region(page, name, from, to = from, maxH = Infinity) {
  const box = await page.evaluate(
    ([a, b]) => {
      const ra = document.getElementById(a).getBoundingClientRect();
      const rb = document.getElementById(b).getBoundingClientRect();
      return { x: ra.left + window.scrollX - 8, y: ra.top + window.scrollY - 8, w: ra.width + 16, h: rb.bottom - ra.top + 16 };
    },
    [from, to],
  );
  const h = Math.min(box.h, maxH);
  const parts = Math.ceil(h / MAX_H);
  for (let i = 0; i < parts; i++) {
    const ph = Math.ceil(h / parts);
    const file = parts > 1 ? `${name}-${'abcdef'[i]}.png` : `${name}.png`;
    await page.screenshot({ path: join(OUT, file), fullPage: true, clip: { x: box.x, y: box.y + i * ph, width: box.w, height: Math.min(ph, h - i * ph) } });
    console.log('saved', file);
  }
}

const shots = [
  { v: { palette: 'blue' }, list: [['01-logos-blue-light', 'logos'], ['04-colours-blue-light', 'colours', 'colours', 1150], ['06-buttons-chips-compatibility-blue-light', 'buttons', 'compat'], ['07-price-cell-spec-line-blue-light', 'price', 'specs'], ['08-filters-blue-light', 'filters'], ['12-shell-header-menu-footer-phones-blue-light', 'shell']] },
  { v: { palette: 'indigo' }, list: [['02-logos-indigo-light', 'logos'], ['05-colours-indigo-light', 'colours', 'colours', 1150], ['09-table-cards-partlist-indigo-light', 'lists'], ['10-overlays-states-404-indigo-light', 'paging', 'states'], ['11-breadcrumbs-status-search-indigo-light', 'nav']] },
  { v: { palette: 'indigo', theme: 'dark' }, list: [['13-dark-buttons-chips-compatibility-indigo', 'buttons', 'compat'], ['15-dark-shell-phones-indigo', 'shell']] },
  { v: { palette: 'blue', theme: 'dark' }, list: [['14-dark-table-cards-partlist-blue', 'lists']] },
  { v: { palette: 'indigo', lang: 'en' }, list: [['16-english-price-cell-spec-line-indigo', 'price', 'specs']] },
];
for (const s of shots) {
  const { ctx, page } = await open(s.v);
  for (const [name, from, to, maxH] of s.list) await region(page, name, from, to, maxH);
  await ctx.close();
}

// 03: the header with every logo × palette × theme, one under the other.
const tmp = join(OUT, '_headers');
mkdirSync(tmp, { recursive: true });
const rows = [];
for (const theme of ['light', 'dark'])
  for (const palette of ['blue', 'indigo'])
    for (const logo of ['a', 'b', 'c']) {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/_preview?logo=${logo}&palette=${palette}&theme=${theme}&lang=el`);
      await page.locator('#shell header').first().waitFor({ timeout: 60_000 });
      await page.waitForTimeout(400);
      const file = `${logo}-${palette}-${theme}.png`;
      await page.locator('#shell header').first().screenshot({ path: join(tmp, file) });
      rows.push({ file, label: `${logo.toUpperCase()} · ${palette === 'blue' ? 'Blue' : 'Indigo'} · ${theme}` });
      await ctx.close();
    }
writeFileSync(
  join(tmp, 'index.html'),
  `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:16px;background:#e5e7eb;font:600 14px system-ui">${rows
    .map((r) => `<div style="margin:0 0 4px">${r.label}</div><img src="${r.file}" style="display:block;width:1232px;margin:0 0 14px;border:1px solid #9ca3af">`)
    .join('')}</body>`,
);
const ctx = await browser.newContext({ viewport: { width: 1266, height: 900 } });
const page = await ctx.newPage();
await page.goto(pathToFileURL(join(tmp, 'index.html')).href);
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, '03-header-every-logo-palette-theme.png'), fullPage: true });
console.log('saved 03-header-every-logo-palette-theme.png');
await ctx.close();
rmSync(tmp, { recursive: true, force: true });
await browser.close();
