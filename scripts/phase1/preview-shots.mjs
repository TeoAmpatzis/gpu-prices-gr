// Screenshots of the v2 component catalogue (/_preview, `npm run dev`). At Stop 2 it showed every
// logo × palette × theme (those images are in docs/phase1/preview/); since Stop 3 there is one identity
// (logo C, Indigo, dark only), so it shoots Greek at 1366 and 360 px and English at 1366 px.
//
//   node scripts/phase1/preview-shots.mjs <outDir> [baseUrl=http://localhost:5174] [--sections] [--only=el-1366]
//
// --sections: one image per section of the first shot (for review). Waits for today's data, the phone
// frames and the product photos.
/* global document, window */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = process.argv[2];
const BASE = (process.argv.find((a, i) => i > 2 && a.startsWith('http')) ?? 'http://localhost:5174').replace(/\/$/, '');
const SECTIONS = process.argv.includes('--sections');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
if (!OUT) throw new Error('usage: preview-shots.mjs <outDir> [baseUrl] [--sections] [--only=el-1366]');
mkdirSync(OUT, { recursive: true });

const shots = [
  { lang: 'el', width: 1366 },
  { lang: 'el', width: 360 },
  { lang: 'en', width: 1366 },
];

const browser = await chromium.launch();
async function open(s) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: 900 }, deviceScaleFactor: 1, locale: s.lang === 'el' ? 'el-GR' : 'en-US' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/_preview?lang=${s.lang}`);
  await page.locator('#shell').waitFor({ timeout: 60_000 });
  // Scroll through once so lazy photos and phone frames load, then back to the top.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  // Every product photo loaded (or failed to its icon), so the shots show photos, not loading tiles.
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const f of page.frames().filter((x) => x.url().includes('frame='))) await f.locator('main, [role=dialog]').first().waitFor({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  return { ctx, page };
}

for (const s of shots) {
  const name = `${s.lang}-${s.width}`;
  if (ONLY && !name.startsWith(ONLY)) continue;
  const { ctx, page } = await open(s);
  if (SECTIONS) {
    await page.addStyleTag({ content: '.sticky{position:static!important}' });
    for (const id of await page.$$eval('main section[id]', (els) => els.map((e) => e.id))) {
      await page.locator(`#${id}`).screenshot({ path: `${OUT}/${name}-${id}.png` });
    }
    console.log('sections', name);
    await ctx.close();
    break;
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, fullPage: true, type: 'jpeg', quality: 60 });
  console.log('shot', name, overflow > 0 ? `OVERFLOW ${overflow}px` : 'no horizontal overflow');
  await ctx.close();
}
await browser.close();
