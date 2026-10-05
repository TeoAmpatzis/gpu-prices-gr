// Keyboard walk of the shell (Phase 1 gate): every Tab stop from the top of the page, whether it shows
// a focus outline, and how many presses reach the first product on a category page — with the skip link
// (Tab, Enter, then Tab) and without it (the v1 audit counted 37 presses, UX-05). Desktop 1366 px, Greek.
//
//   node scripts/phase1/keyboard-walk.mjs [baseUrl=http://localhost:4173] [outFile]
/* global document, getComputedStyle */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.argv[3];

const focused = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
    const ring = cs.boxShadow !== 'none' && /rgb/.test(cs.boxShadow);
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    const product = !!el.closest('tbody') && el.matches('button[aria-expanded]');
    const where = el.closest('header') ? 'header' : el.closest('footer') ? 'footer' : el.closest('main') ? 'main' : 'other';
    return { name, tag: el.tagName.toLowerCase(), href: el.getAttribute('href'), where, visible: outline || ring, product };
  });

const browser = await chromium.launch();
async function open(path) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('lang', 'el'));
  const page = await ctx.newPage();
  await page.goto(BASE + path);
  await page.locator('main h1').first().waitFor();
  await page.waitForTimeout(1500);
  return { ctx, page };
}

const report = {};
for (const path of ['/', '/gpu', '/builder']) {
  const { ctx, page } = await open(path);
  const stops = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const f = await focused(page);
    if (!f) break;
    stops.push(f);
    if (f.product || f.where === 'footer') break;
  }
  report[path] = {
    stops: stops.length,
    withoutOutline: stops.filter((s) => !s.visible).map((s) => s.name),
    firstProductAt: stops.findIndex((s) => s.product) + 1 || null,
    order: stops.map((s) => `${s.where}: ${s.name}`),
  };
  await ctx.close();
}

// /gpu with the skip link: Tab (skip link), Enter, then Tab until the first product.
{
  const { ctx, page } = await open('/gpu');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  let presses = 2;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    presses++;
    const f = await focused(page);
    if (f?.product) break;
  }
  report['/gpu'].firstProductWithSkipLink = presses;
  await ctx.close();
}
await browser.close();

for (const [path, r] of Object.entries(report)) {
  console.log(`${path}: ${r.stops} stops walked, without visible focus: ${r.withoutOutline.length ? r.withoutOutline.join(', ') : 'none'}${r.firstProductAt ? `, first product at Tab ${r.firstProductAt}` : ''}${r.firstProductWithSkipLink ? ` (${r.firstProductWithSkipLink} key presses with the skip link)` : ''}`);
  console.log(`   ${r.order.slice(0, 12).join(' → ')}${r.order.length > 12 ? ' → …' : ''}`);
}
if (OUT) writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
