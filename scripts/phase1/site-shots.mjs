// Screenshots of the v2 site at the Phase 1 gate (real pages, production preview), for docs/phase1/shots/.
// Desktop 1366 × 900 and phone 360 × 780 (touch), Greek and English, dark only; also the print style.
// Waits for data, fonts and photos. JPEG, the visible window unless the name ends in "-full".
//
//   node scripts/phase1/site-shots.mjs <outDir> [baseUrl=http://localhost:4173]
/* global document, window */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = process.argv[2];
const BASE = (process.argv[3] ?? 'http://localhost:4173').replace(/\/$/, '');
if (!OUT) throw new Error('usage: site-shots.mjs <outDir> [baseUrl]');
mkdirSync(OUT, { recursive: true });

const rows = (p) => p.locator('main tbody tr button[aria-expanded], main li.card button[aria-expanded]').filter({ visible: true }).first().waitFor({ timeout: 30_000 });
const cards = (p) => p.locator('main li.card').first().waitFor({ timeout: 30_000 });
const h1 = (p) => p.locator('main h1').first().waitFor({ timeout: 30_000 });
const typeSearch = async (p, sel) => {
  await p.locator(sel).click();
  await p.keyboard.type('rtx 50');
  await p.locator('[role=listbox] [role=option]').first().waitFor({ timeout: 10_000 });
};

const SHOTS = [
  // Desktop, Greek
  { name: '01-home-el-1366-full', w: 1366, lang: 'el', path: '/', ready: h1, full: true },
  { name: '02-mega-menu-el-1366', w: 1366, lang: 'el', path: '/', ready: h1, act: (p) => p.locator('header button[aria-controls]').click() },
  { name: '03-search-el-1366', w: 1366, lang: 'el', path: '/', ready: h1, act: (p) => typeSearch(p, 'header input[role=combobox]:visible') },
  { name: '04-gpu-el-1366', w: 1366, lang: 'el', path: '/gpu', ready: rows },
  { name: '05-gpu-details-el-1366', w: 1366, lang: 'el', path: '/gpu', ready: rows, act: async (p) => { await p.locator('main tbody tr button[aria-expanded="false"]').filter({ visible: true }).first().click(); await p.waitForTimeout(1500); } },
  { name: '06-storage-filters-el-1366', w: 1366, lang: 'el', path: '/storage?seg=nas&type=hdd', ready: rows },
  { name: '07-builder-el-1366', w: 1366, lang: 'el', path: '/builder?step=cpu', ready: cards },
  { name: '08-builder-quick-el-1366', w: 1366, lang: 'el', path: '/builder?mode=quick', ready: h1 },
  { name: '09-footer-el-1366', w: 1366, lang: 'el', path: '/', ready: h1, act: (p) => p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)) },
  { name: '10-privacy-el-1366-full', w: 1366, lang: 'el', path: '/privacy', ready: h1, full: true },
  { name: '11-404-el-1366', w: 1366, lang: 'el', path: '/gpus', ready: h1 },
  { name: '12-gpu-print-el-1366-full', w: 1366, lang: 'el', path: '/gpu', ready: rows, print: true, full: true },
  // Desktop, English
  { name: '13-home-en-1366', w: 1366, lang: 'en', path: '/', ready: h1 },
  { name: '14-gpu-en-1366', w: 1366, lang: 'en', path: '/gpu', ready: rows },
  { name: '15-builder-en-1366', w: 1366, lang: 'en', path: '/builder?step=cpu', ready: cards },
  // Phone, Greek
  { name: '16-home-el-360-full', w: 360, lang: 'el', path: '/', ready: h1, full: true },
  { name: '17-parts-tiles-el-360-full', w: 360, lang: 'el', path: '/parts', ready: h1, full: true },
  { name: '18-search-panel-el-360', w: 360, lang: 'el', path: '/', ready: h1, act: async (p) => { await p.locator('header button:has(svg.lucide-search)').filter({ visible: true }).click(); await p.keyboard.type('rtx 50'); await p.locator('[role=listbox] [role=option]').first().waitFor({ timeout: 10_000 }); } },
  { name: '19-gpu-el-360', w: 360, lang: 'el', path: '/gpu', ready: rows },
  { name: '20-gpu-filter-sheet-el-360', w: 360, lang: 'el', path: '/gpu', ready: rows, act: async (p) => { await p.locator('button[aria-haspopup="dialog"]').filter({ visible: true }).first().click(); await p.waitForTimeout(600); } },
  { name: '21-builder-el-360', w: 360, lang: 'el', path: '/builder?step=cpu', ready: cards },
  { name: '22-footer-el-360', w: 360, lang: 'el', path: '/', ready: h1, act: (p) => p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)) },
  { name: '23-404-el-360', w: 360, lang: 'el', path: '/gpus', ready: h1 },
  // Phone, English
  { name: '24-home-en-360', w: 360, lang: 'en', path: '/', ready: h1 },
  { name: '25-gpu-en-360', w: 360, lang: 'en', path: '/gpu', ready: rows },
];

const browser = await chromium.launch();
for (const s of SHOTS) {
  const phone = s.w < 1024;
  const ctx = await browser.newContext(phone
    ? { viewport: { width: s.w, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: s.w, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((l) => localStorage.setItem('lang', l), s.lang);
  const page = await ctx.newPage();
  await page.goto(BASE + s.path);
  await s.ready(page);
  await page.evaluate(() => document.fonts.ready);
  // Let lazy photos load (scroll through once when shooting the full page).
  if (s.full) {
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 20_000 }).catch(() => {});
  if (s.act) await s.act(page);
  if (s.print) await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}/${s.name}.jpg`, fullPage: !!s.full, type: 'jpeg', quality: 70 });
  console.log('shot', s.name, overflow > 0 ? `OVERFLOW ${overflow}px` : '');
  await ctx.close();
}
await browser.close();
