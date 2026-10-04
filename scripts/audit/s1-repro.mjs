// Phase 0 (v2 audit): reproduce the S1 issues D-01 (air cooler height) and D-02 (card minimum PSU) in the
// v1 UI through share links, and record the Review labels, their tooltips and the summary lines.
//
//   node scripts/audit/s1-repro.mjs <outDir>   (needs the audit preview on http://localhost:4180)
/* global document */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4180';
const OUT = process.argv[2];
const cases = {
  'D-01': { case: 'sharkoonmsy1000', cooler: 'deepcoolak400g2', cpu: 'Ryzen 7 9700X|false' },
  'D-02': { gpu: 'skroutz:60811441', psu: '350W Bronze ATX', cpu: 'Ryzen 7 9700X|false' },
};
const browser = await chromium.launch();
for (const [id, params] of Object.entries(cases)) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1100 }, locale: 'en-US' });
  await ctx.addInitScript(() => { localStorage.setItem('lang', 'en'); localStorage.setItem('theme', 'light'); });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?repro=${id}#builder?${new URLSearchParams(params)}`);
  await page.locator('#share-link').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
  const facts = await page.evaluate(() => {
    const s = document.querySelector('section[aria-labelledby="step-title"]');
    const items = [...(s?.querySelectorAll('ul.divide-y > li') ?? [])].map((li) => `${li.querySelector('.font-medium')?.textContent?.trim()} → ${li.querySelector('.badge')?.textContent?.trim()} [${li.querySelector('.badge')?.getAttribute('title') ?? ''}]`);
    const aside = document.querySelector('aside')?.innerText.split('\n').filter((l) => /PSU|fit|Incompatible|W\b/.test(l)).slice(0, 6);
    return { items, aside };
  });
  await page.screenshot({ path: `${OUT}/${id}-review-1366-en-light.jpg`, type: 'jpeg', quality: 70 });
  console.log(id, JSON.stringify(facts, null, 1));
  await ctx.close();
}
await browser.close();
