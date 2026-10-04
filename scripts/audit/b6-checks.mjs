// Phase 0 (v2 audit, B6 — the owner's own list): browser evidence for
//   1. going back while choosing parts in the guided builder (in-page Back, browser/phone Back),
//   3. the motherboard socket filters (pills, "Πλατφόρμα", "Socket": names, order, grouping, counts),
//   4. the dual-core + RTX 5060 build (CPU step sorted by "Αξία για τα λεφτά", then the defaults).
// Records texts, positions and screenshots; the judgement is in docs/audit-v1.md (B6).
//
//   node scripts/audit/b6-checks.mjs <baseUrl> <outDir>
/* global document, window, location, history */

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [BASE, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const out = {};

async function context(lang, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 780 : 900 }, isMobile: width < 1024, hasTouch: width < 1024 });
  await ctx.addInitScript(([l]) => {
    if (!sessionStorage.getItem('b6')) {
      localStorage.setItem('lang', l);
      localStorage.setItem('theme', 'light');
      sessionStorage.setItem('b6', '1');
    }
  }, [lang]);
  return ctx;
}
const shot = (page, name, opts = {}) => page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 70, ...opts });
const step = (page) => page.locator('section[aria-labelledby="step-title"]');
const waitCards = (page) =>
  page.waitForFunction(() => {
    const s = document.querySelector('section[aria-labelledby="step-title"]');
    return s && !/Loading|Φόρτωση/.test(s.innerText) && s.querySelector('ul.grid > li.card');
  }, null, { timeout: 30_000 });

// ---------- 3. Motherboard socket filters ----------
async function socketFilters(lang) {
  const ctx = await context(lang, 1366);
  const page = await ctx.newPage();
  const res = {};
  const read = () =>
    page.evaluate(() => {
      const aside = document.querySelector('aside') ?? document.body;
      const sections = [...aside.querySelectorAll('div, section')].filter((d) => d.children.length && /^(Socket|Πλατφόρμα|Platform)$/.test(d.firstElementChild?.textContent?.trim() ?? ''));
      const pills = [...aside.querySelectorAll('button[aria-pressed]')].map((b) => `${b.innerText.replace(/\s+/g, ' ').trim()}${b.getAttribute('aria-pressed') === 'true' ? ' ✓' : ''}${b.disabled ? ' (disabled)' : ''}`);
      const selects = [...aside.querySelectorAll('label')].filter((l) => l.querySelector('select')).map((l) => ({
        label: l.querySelector('span')?.textContent?.trim(),
        options: [...l.querySelectorAll('option')].map((o) => `${o.textContent.trim()}${o.disabled ? ' [disabled]' : ''}`),
      }));
      const count = (document.querySelector('main')?.innerText.match(/(\d[\d.]*)\s+(μοντέλα|models)/) ?? [])[0] ?? null;
      return { sectionsFound: sections.length, pills, selects: selects.filter((s) => /Socket|Πλατφόρμα|Platform|Chipset/.test(s.label ?? '')), count, hash: location.hash };
    });
  for (const seg of ['main', 'pro', 'all']) {
    await page.goto(`${BASE}/?b6=${seg}#mobo${seg === 'main' ? '' : `?seg=${seg}`}`);
    await page.locator('main tbody tr button[aria-expanded]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(800);
    res[seg] = await read();
    await shot(page, `socket-${seg}-1366-${lang}-light`, { fullPage: false });
  }
  // Interplay: the "Socket" dropdown says AM4 while the AM4 pill is unticked.
  await page.goto(`${BASE}/?b6=mix#mobo`);
  await page.locator('main tbody tr button[aria-expanded]').first().waitFor();
  const socketSelect = page.locator('aside label', { hasText: /^Socket/ }).locator('select');
  await socketSelect.selectOption({ index: 0 });
  const am4 = await socketSelect.locator('option').evaluateAll((os) => os.find((o) => /^AM4/.test(o.textContent.trim()))?.value ?? null);
  if (am4) await socketSelect.selectOption(am4);
  await page.waitForTimeout(600);
  const afterDropdown = await read();
  await page.locator('aside button[aria-pressed]', { hasText: /^AM4/ }).first().click();
  await page.waitForTimeout(600);
  const afterPill = await read();
  await shot(page, `socket-dropdown-am4-pill-off-1366-${lang}-light`);
  res.interplay = { am4Value: am4, afterDropdown: { count: afterDropdown.count, hash: afterDropdown.hash, pills: afterDropdown.pills.slice(0, 6) }, afterPill: { count: afterPill.count, hash: afterPill.hash, pills: afterPill.pills.slice(0, 6) } };
  await ctx.close();
  return res;
}

// ---------- 1. Going back in the guided builder ----------
async function goingBack(lang, width) {
  const ctx = await context(lang, width);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?b6=back#gpu`);
  await page.locator('main button[aria-expanded]:visible').first().waitFor({ timeout: 30_000 });
  const lenStart = await page.evaluate(() => history.length);
  // The builder tab (a hash link: a real history entry).
  await page.locator('a[href="#builder"]').first().click();
  await page.locator('#step-title').waitFor();
  await page.getByRole('button', { name: /Gaming/ }).first().click();
  const next = () => step(page).getByRole('button', { name: /^(Next|Skip|Επόμενο|Παράλειψη)$/ }).last();
  await next().click();
  await waitCards(page);
  await step(page).locator('ul.grid > li.card').first().getByRole('button', { name: /^(Choose|Επιλογή)$/ }).click();
  // Where is the step's own Back button after choosing?
  const backCount = await step(page).getByRole('button', { name: /^(Back|Πίσω)$/ }).count();
  const pos = await page.evaluate(() => {
    const s = document.querySelector('section[aria-labelledby="step-title"]');
    const b = [...(s?.querySelectorAll('button') ?? [])].find((x) => /^(Back|Πίσω)$/.test(x.textContent.trim()));
    const r = b?.getBoundingClientRect();
    const bar = [...document.querySelectorAll('aside button[aria-label]')].map((x) => `${x.getAttribute('aria-label')} "${x.textContent.trim()}" ${Math.round(x.getBoundingClientRect().width)}×${Math.round(x.getBoundingClientRect().height)}`);
    return { backTop: r ? Math.round(r.top) : null, viewport: window.innerHeight, scrollY: Math.round(window.scrollY), phoneBarButtons: bar };
  });
  await shot(page, `back-cpu-chosen-${width}-${lang}-light`);
  await next().click();
  await waitCards(page);
  const before = { hash: await page.evaluate(() => location.hash), title: (await page.locator('#step-title').textContent())?.trim(), historyLength: await page.evaluate(() => history.length) };
  // The browser's (or the phone's) Back button.
  await page.goBack();
  await page.waitForTimeout(1200);
  const after = { hash: await page.evaluate(() => location.hash), title: (await page.locator('#step-title').textContent().catch(() => null))?.trim() ?? null, h1: (await page.locator('main h1').first().textContent().catch(() => null))?.trim() ?? null };
  await shot(page, `back-after-browser-back-${width}-${lang}-light`);
  await ctx.close();
  return { lenStart, backButtonsInStep: backCount, pos, before, after };
}

// ---------- 4. Dual-core + RTX 5060 ----------
async function dualCore(lang) {
  const ctx = await context(lang, 1366);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?b6=dual#builder?step=cpu`);
  await waitCards(page);
  const defaultFirst = (await step(page).locator('ul.grid > li.card').first().innerText()).replace(/\s+/g, ' ').slice(0, 160);
  await step(page).locator('select').first().selectOption('value');
  await page.waitForTimeout(500);
  const valueFirst = (await step(page).locator('ul.grid > li.card').first().innerText()).replace(/\s+/g, ' ').slice(0, 160);
  await shot(page, `dual-cpu-value-sort-1366-${lang}-light`);
  await step(page).locator('ul.grid > li.card').first().getByRole('button', { name: /^(Choose|Επιλογή)$/ }).click();
  await page.locator('nav[aria-label] ol li').nth(4).getByRole('button').click(); // GPU step
  await waitCards(page);
  const gpuSort = await step(page).locator('select').first().inputValue();
  const gpuFirst = (await step(page).locator('ul.grid > li.card').first().innerText()).replace(/\s+/g, ' ').slice(0, 160);
  await step(page).locator('ul.grid > li.card').first().getByRole('button', { name: /^(Choose|Επιλογή)$/ }).click();
  await page.waitForTimeout(500);
  const summary = (await page.locator('aside').innerText()).replace(/\s+/g, ' ').slice(0, 700);
  await shot(page, `dual-gpu-step-1366-${lang}-light`);
  await ctx.close();
  return { defaultFirst, valueFirst, gpuSort, gpuFirst, summary };
}

for (const lang of ['el', 'en']) {
  out[lang] = {};
  for (const [name, fn] of [['socket', () => socketFilters(lang)], ['back1366', () => goingBack(lang, 1366)], ['back360', () => goingBack(lang, 360)], ['dual', () => dualCore(lang)]]) {
    try {
      out[lang][name] = await fn();
      console.log(`${lang} ${name}: ok`);
    } catch (e) {
      out[lang][name] = { failed: String(e).slice(0, 400) };
      console.log(`${lang} ${name}: FAILED ${String(e).slice(0, 200)}`);
    }
  }
}
await browser.close();
writeFileSync(join(OUT, 'b6-checks.json'), `${JSON.stringify(out, null, 2)}\n`);
