// Phase 0 (v2 audit, B2): the v1 PC builder's flows in a real browser (Playwright, Chromium), in Greek
// and English at 1366 and 360 px. Records facts — texts, numbers, localStorage, clipboard, console
// errors — and screenshots; the judgement is written in docs/audit-v1.md.
//
//   node scripts/audit/builder-flows.mjs <baseUrl> <outDir> [flows]   (flows: comma list, default all)

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [BASE, OUT, ONLY] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const CONFIGS = [
  { lang: 'el', width: 1366 },
  { lang: 'en', width: 1366 },
  { lang: 'el', width: 360 },
  { lang: 'en', width: 360 },
];
const want = (f) => !ONLY || ONLY.split(',').includes(f);
const RX = {
  next: /^(Next|Skip|Επόμενο|Παράλειψη)$/,
  skip: /^(Skip|Παράλειψη)$/,
  choose: /^(Choose|Επιλογή)$/,
  onlyCompatible: /^(Only compatible|Μόνο συμβατά)$/,
};

const browser = await chromium.launch();
const results = {};
const errorsOf = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  return errors;
};
async function newContext({ lang, width }, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height: width <= 400 ? 780 : 900 },
    isMobile: width < 1024,
    hasTouch: width < 1024,
    permissions: ['clipboard-read', 'clipboard-write'],
    ...opts,
  });
  await ctx.addInitScript(
    ([l]) => {
      if (!sessionStorage.getItem('audit-init')) {
        localStorage.setItem('lang', l);
        localStorage.setItem('theme', 'light');
        sessionStorage.setItem('audit-init', '1');
      }
    },
    [lang],
  );
  return ctx;
}
let shot = 0;
const snap = async (page, name) => {
  const file = `${String(++shot).padStart(3, '0')}-${name}.jpg`;
  await page.screenshot({ path: join(OUT, file), type: 'jpeg', quality: 70, fullPage: false });
  return file;
};
const price = (s, lang) => {
  const t = String(s).replace(/[^\d.,]/g, '');
  return Number(lang === 'el' ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, ''));
};
const step = (page) => page.locator('section[aria-labelledby="step-title"]');
async function waitCards(page) {
  await page.waitForFunction(() => {
    const s = document.querySelector('section[aria-labelledby="step-title"]');
    return s && !s.innerText.includes('Loading') && !s.innerText.includes('Φόρτωση') && (s.querySelector('ul.grid > li.card') || /No parts|Κανένα προϊόν/.test(s.innerText));
  }, null, { timeout: 30_000 });
}
async function chooseFirst(page, index = 0) {
  await waitCards(page);
  const cards = step(page).locator('ul.grid > li.card:not([aria-disabled="true"])');
  if (!(await cards.count())) return null;
  const card = cards.nth(index);
  const name = (await card.locator('.line-clamp-2').first().textContent())?.trim();
  const priceText = (await card.locator('span.font-semibold.tabular-nums').first().textContent())?.trim();
  const label = (await card.locator('.badge').first().textContent().catch(() => null))?.trim() ?? null;
  await card.getByRole('button', { name: RX.choose }).click();
  return { name, priceText, label };
}
const nextBtn = (page) => step(page).getByRole('button', { name: RX.next }).last();
async function summaryFacts(page, lang) {
  return page.evaluate((l) => {
    const aside = document.querySelector('aside');
    const text = aside?.innerText ?? '';
    const bar = aside?.querySelector('div.h-2 > div');
    const rows = [...(aside?.querySelectorAll('ul li button') ?? [])].map((b) => b.innerText.replace(/\s+/g, ' ').trim());
    return { lang: l, text, barWidth: bar?.style.width ?? null, rows };
  }, lang);
}
async function reviewFacts(page) {
  return page.evaluate(() => {
    const s = document.querySelector('section[aria-labelledby="step-title"]');
    const items = [...(s?.querySelectorAll('ul.divide-y > li') ?? [])].map((li) => ({
      label: li.querySelector('.text-xs')?.textContent?.trim(),
      name: li.querySelector('.font-medium')?.textContent?.trim() ?? null,
      price: li.querySelector('a span.font-semibold')?.textContent?.trim() ?? null,
      href: li.querySelector('a')?.getAttribute('href') ?? null,
      fit: li.querySelector('.badge')?.textContent?.trim() ?? null,
    }));
    const total = s?.querySelector('span.text-2xl')?.textContent?.trim() ?? null;
    const link = s?.querySelector('#share-link')?.value ?? null;
    return { items, total, link };
  });
}
const saved = (page) => page.evaluate(() => localStorage.getItem('pcBuild'));

// ---------- G1: guided, a full build (first compatible card on every step) ----------
async function guidedFull(cfg) {
  const ctx = await newContext(cfg);
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  await page.goto(`${BASE}/?flow=g1#builder`);
  await page.getByRole('button', { name: /Gaming/ }).first().click();
  await page.getByRole('button', { name: /^1000 €$/ }).click();
  const picks = [];
  const shots = [await snap(page, `g1-${cfg.lang}-${cfg.width}-use`)];
  await nextBtn(page).click();
  for (let i = 0; i < 9; i++) {
    const title = (await page.locator('#step-title').textContent())?.trim();
    const pick = await chooseFirst(page);
    picks.push({ step: title, ...pick });
    if (i === 0 || i === 6) shots.push(await snap(page, `g1-${cfg.lang}-${cfg.width}-step${i + 2}`));
    await nextBtn(page).click();
  }
  const review = await reviewFacts(page);
  const summary = await summaryFacts(page, cfg.lang);
  shots.push(await snap(page, `g1-${cfg.lang}-${cfg.width}-review`));
  if (cfg.width < 1024) {
    await page.locator('aside button[aria-expanded]').first().click();
    shots.push(await snap(page, `g1-${cfg.lang}-${cfg.width}-summary-open`));
  }
  const sum = review.items.filter((x) => x.price).reduce((t, x) => t + price(x.price, cfg.lang), 0);
  const out = { picks, review, summary, sumOfShownPrices: Math.round(sum * 100) / 100, reviewTotal: price(review.total, cfg.lang), saved: await saved(page), errors, shots };
  await ctx.close();
  return out;
}

// ---------- G2: guided, skipping the optional steps ----------
async function guidedSkip(cfg) {
  const ctx = await newContext(cfg);
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  await page.goto(`${BASE}/?flow=g2#builder?step=cpu`);
  await waitCards(page);
  // A CPU with integrated graphics and a cooler in the box (Ryzen 5 7600 "with cooler").
  await step(page).getByRole('textbox').fill('Ryzen 5 7600');
  await waitCards(page);
  const card = step(page).locator('ul.grid > li.card', { hasText: /με ψύκτρα|cooler included/ }).filter({ hasText: /Ryzen 5 7600(?![X\d])/ }).first();
  const cpu = (await card.locator('.line-clamp-2').textContent())?.trim();
  await card.getByRole('button', { name: RX.choose }).click();
  const seen = [];
  for (let i = 0; i < 10; i++) {
    const btn = nextBtn(page);
    const title = (await page.locator('#step-title').textContent())?.trim();
    const label = (await btn.textContent())?.trim();
    const why = (await step(page).locator('p.font-medium').first().textContent().catch(() => null))?.trim() ?? null;
    seen.push({ step: title, button: label, why });
    if (/Review|Σύνοψη/.test(title)) break;
    const isSkip = RX.skip.test(label ?? '');
    if (!isSkip && !/Processor|Επεξεργαστής/.test(title)) await chooseFirst(page);
    await btn.click();
  }
  const review = await reviewFacts(page);
  const summary = await summaryFacts(page, cfg.lang);
  const shots = [await snap(page, `g2-${cfg.lang}-${cfg.width}-review-skipped`)];
  await ctx.close();
  return { cpu, seen, review, notes: summary.text, errors, shots };
}

// ---------- G3: change the CPU after later parts are chosen ----------
async function guidedChangeCpu(cfg) {
  const ctx = await newContext(cfg);
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  // AM5 CPU + board + RAM chosen through the UI.
  await page.goto(`${BASE}/?flow=g3#builder?step=cpu`);
  await step(page).getByRole('textbox').fill('9700X');
  const cpu1 = await chooseFirst(page);
  await nextBtn(page).click();
  const board = await chooseFirst(page);
  await nextBtn(page).click();
  const ram = await chooseFirst(page);
  // Back to the CPU step and look for an Intel CPU.
  await page.locator('nav[aria-label] ol li').nth(1).getByRole('button').click();
  await waitCards(page);
  await step(page).getByRole('textbox').fill('14600K');
  await waitCards(page);
  const countOn = (await step(page).getByText(/(shown|εμφανίζονται)/).first().textContent())?.trim();
  const shots = [await snap(page, `g3-${cfg.lang}-${cfg.width}-intel-hidden`)];
  await step(page).getByRole('button', { name: RX.onlyCompatible }).click();
  await waitCards(page);
  const intel = step(page).locator('ul.grid > li.card').first();
  const intelState = {
    disabled: await intel.getAttribute('aria-disabled'),
    chooseDisabled: await intel.getByRole('button', { name: RX.choose }).isDisabled().catch(() => null),
    reason: (await intel.locator('p.text-xs').first().textContent().catch(() => null))?.trim() ?? null,
  };
  shots.push(await snap(page, `g3-${cfg.lang}-${cfg.width}-intel-greyed`));
  // Remove the AM5 CPU, choose the Intel one: what happens to the board and RAM?
  await step(page).getByRole('textbox').fill('9700X');
  await waitCards(page);
  await step(page).locator('ul.grid > li.card', { has: page.getByRole('button', { name: /^(Remove|Αφαίρεση)$/ }) }).getByRole('button', { name: /^(Remove|Αφαίρεση)$/ }).click();
  await step(page).getByRole('textbox').fill('14600K');
  await waitCards(page);
  const cpu2 = await chooseFirst(page);
  const after = await summaryFacts(page, cfg.lang);
  shots.push(await snap(page, `g3-${cfg.lang}-${cfg.width}-after-intel`));
  // The board step: is the chosen (now incompatible) board visible, and how is it labelled?
  await page.locator('nav[aria-label] ol li').nth(2).getByRole('button').click();
  await waitCards(page);
  const chosenVisibleOn = await step(page).locator('ul.grid > li.card.ring-2').count();
  const boardCount = (await step(page).getByText(/(shown|εμφανίζονται)/).first().textContent())?.trim();
  shots.push(await snap(page, `g3-${cfg.lang}-${cfg.width}-board-step`));
  // A build that already clashes (AM5 CPU + LGA1700 board, as a share link or changed data can give):
  // what does the board step show with "Only compatible" on?
  const clash = new URLSearchParams({ cpu: 'Ryzen 7 9700X|false', mobo: 'asusprimeb760plusd4', step: 'mobo' });
  await page.goto(`${BASE}/?flow=g3b#builder?${clash}`);
  await waitCards(page);
  const clashBoardCount = (await step(page).getByText(/(shown|εμφανίζονται)/).first().textContent())?.trim();
  const clashChosenVisible = await step(page).locator('ul.grid > li.card.ring-2').count();
  const clashSummary = (await summaryFacts(page, cfg.lang)).text;
  shots.push(await snap(page, `g3-${cfg.lang}-${cfg.width}-clashing-board-step`));
  await step(page).getByRole('button', { name: RX.onlyCompatible }).click();
  await waitCards(page);
  const clashChosenVisibleOff = await step(page).locator('ul.grid > li.card.ring-2').count();
  const out = {
    cpu1, board, ram, countOn, intelState, cpu2, summaryAfter: after.text, chosenBoardVisibleWithOnlyCompatible: chosenVisibleOn, boardCount,
    clashBoardCount, clashChosenVisible, clashChosenVisibleOff, clashSummary, saved: await saved(page), errors, shots,
  };
  await ctx.close();
  return out;
}

// ---------- Q1: quick list: add, replace, remove, switch modes ----------
async function quickList(cfg) {
  const ctx = await newContext(cfg);
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  await page.goto(`${BASE}/?flow=q1#builder?mode=quick`);
  const rows = page.locator('div.card.divide-y > div');
  await rows.first().waitFor();
  const choose = async (i, option = 0) => {
    await rows.nth(i).getByRole('button', { name: /^(Choose|Change|Επιλογή|Αλλαγή)$/ }).click();
    const list = rows.nth(i).locator('ul.max-h-80 > li button');
    await list.first().waitFor({ timeout: 30_000 });
    const name = (await list.nth(option).locator('span.font-medium').first().textContent())?.trim();
    await list.nth(option).click();
    return name;
  };
  const cpu = await choose(0);
  const board = await choose(1);
  const ram1 = await choose(2);
  const ram2 = await choose(2, 1); // replace
  const shots = [await snap(page, `q1-${cfg.lang}-${cfg.width}-replaced`)];
  const afterReplace = (await rows.nth(2).locator('.font-semibold').first().textContent())?.trim();
  await rows.nth(2).getByTitle(/^(Remove|Αφαίρεση)$/).click();
  const afterRemove = (await rows.nth(2).innerText()).replace(/\s+/g, ' ').trim();
  // Empty picker state with a search that matches nothing.
  await rows.nth(3).getByRole('button', { name: /^(Choose|Επιλογή)$/ }).click();
  await rows.nth(3).getByRole('textbox').fill('zzzzqqq');
  const emptyText = (await rows.nth(3).locator('div.rounded-xl').innerText()).replace(/\s+/g, ' ').trim();
  shots.push(await snap(page, `q1-${cfg.lang}-${cfg.width}-empty-search`));
  // Switch to guided in the middle of the build.
  await page.getByRole('radio', { name: /Guided|Βήμα-βήμα/ }).click();
  await page.locator('#step-title').waitFor();
  const guidedStep = (await page.locator('#step-title').textContent())?.trim();
  const progressDone = await page.locator('nav[aria-label] ol li svg.lucide-check').count();
  const summaryGuided = await summaryFacts(page, cfg.lang);
  shots.push(await snap(page, `q1-${cfg.lang}-${cfg.width}-switched-to-guided`));
  const out = { cpu, board, ram1, ram2, afterReplace, afterRemove, emptyText, guidedStep, progressDone, summaryGuided: summaryGuided.rows, saved: await saved(page), errors, shots };
  await ctx.close();
  return out;
}

// ---------- S: saved build, reload, share link in a clean profile, shared build vs the saved one ----------
async function savedAndShared(cfg) {
  const ctx = await newContext(cfg);
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  await page.goto(`${BASE}/?flow=s#builder?step=cpu`);
  const cpu = await chooseFirst(page);
  await nextBtn(page).click();
  const board = await chooseFirst(page);
  await nextBtn(page).click();
  const ram = await chooseFirst(page);
  const savedA = await saved(page);
  await page.reload();
  await page.locator('#step-title').waitFor();
  const rowsAfterReload = (await summaryFacts(page, cfg.lang)).rows;
  // The share link from the review.
  await page.locator('nav[aria-label] ol li').last().getByRole('button').click();
  await page.locator('#share-link').waitFor();
  const link = await page.locator('#share-link').inputValue();
  const reviewA = await reviewFacts(page);
  // Clean profile.
  const ctx2 = await newContext(cfg);
  const page2 = await ctx2.newPage();
  errorsOf(page2);
  await page2.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
  await page2.locator('#share-link').waitFor({ timeout: 30_000 });
  await page2.waitForTimeout(500);
  const reviewB = await reviewFacts(page2);
  const notice = (await page2.locator('aside .notice-warn').first().textContent().catch(() => null))?.trim() ?? null;
  const savedInClean = await saved(page2);
  const shots = [await snap(page2, `s-${cfg.lang}-${cfg.width}-shared-clean-profile`)];
  await ctx2.close();
  // A different shared build opened where build A is saved: A must stay until the user changes something.
  const other = `${BASE}/?flow=s2#builder?cpu=${encodeURIComponent('Core i5-14400F|false')}&mobo=asusprimeb760plusd4`;
  await page.goto(other);
  await page.locator('#share-link').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  const savedWhileViewing = await saved(page);
  const sharedReview = await reviewFacts(page);
  // A change makes it the user's own build.
  await page.locator('nav[aria-label] ol li').nth(3).getByRole('button').click();
  await chooseFirst(page);
  const savedAfterChange = await saved(page);
  const hashAfterChange = await page.evaluate(() => location.hash);
  await ctx.close();
  return {
    picks: { cpu, board, ram }, savedA, rowsAfterReload, link, reviewA, reviewB, notice, savedInClean,
    savedWhileViewing, sharedReview, savedAfterChange, hashAfterChange, errors, shots,
  };
}

// ---------- C: Copy list ----------
async function copyList(cfg, { slowExtra = false } = {}) {
  const ctx = await newContext(cfg);
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  if (slowExtra) await page.route('**/data/builder-extra.json*', async (r) => { await new Promise((res) => setTimeout(res, 15_000)); await r.continue(); });
  const q = new URLSearchParams({ cpu: 'Ryzen 7 9700X|false', mobo: 'asusprimex870pwifi', ram: 'DDR5 32GB (2×16GB) 6000MHz Desktop', gpu: 'bestprice:2160617918', storage: 'samsung990pro1tbssd', psu: '750W Gold ATX', case: 'kolinkobservatorymxmesh', cooler: 'endorfyfera5' });
  await page.goto(`${BASE}/?flow=c#builder?${q}`);
  await page.locator('#share-link').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(slowExtra ? 300 : 2500);
  const review = await reviewFacts(page);
  await step(page).getByRole('button', { name: /^(Copy list|Αντιγραφή λίστας)$/ }).click();
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const shots = [await snap(page, `c-${cfg.lang}-${cfg.width}${slowExtra ? '-slow-extra' : ''}`)];
  await ctx.close();
  return { review, clipboard: clip, errors, shots };
}

// ---------- W: recommended PSU shown in the summary for the wattage builds ----------
async function wattage(cfg) {
  const builds = {
    S12: { cpu: 'Ryzen 7 9700X|false', gpu: 'bestprice:2160322211', psu: '550W Bronze ATX' },
    S25: { cpu: 'Ryzen 5 7600|true', mobo: 'gigabyteb650eagleax', ram: 'DDR5 32GB (2×16GB) 6000MHz Desktop', gpu: 'bestprice:2160617918', storage: 'samsung990pro1tbssd', psu: '650W Gold ATX' },
    S59: { cpu: 'Core i7-14700K|false', mobo: 'asusprimeb760plusd4', ram: 'DDR4 32GB (2×16GB) 3200MHz Desktop', gpu: 'bestprice:2160396062', storage: 'samsung990pro1tbssd', psu: '750W Gold ATX' },
    S62: { cpu: 'Ryzen 9 9950X|false', mobo: 'asusprimex870pwifi', ram: 'DDR5 64GB (4×16GB) 6000MHz Desktop', gpu: 'bestprice:2160340915', storage: 'samsung990pro1tbssd', fan: 'arcticp12pro120mm3', psu: '1000W Gold ATX' },
    S63: { cpu: 'Core i9-14900K|false', mobo: 'asusprimeb760plusd4', ram: 'DDR4 32GB (2×16GB) 3200MHz Desktop', storage: 'samsung990pro1tbssd', psu: '550W Bronze ATX' },
    S64: { cpu: 'Ryzen 7 9800X3D|false', mobo: 'asusprimex870pwifi', ram: 'DDR5 32GB (2×16GB) 6000MHz Desktop', gpu: 'bestprice:2160485242', storage: 'samsung990pro1tbssd', psu: '750W Gold ATX' },
  };
  const ctx = await newContext(cfg);
  const out = {};
  for (const [id, b] of Object.entries(builds)) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?flow=w${id}#builder?${new URLSearchParams(b)}`);
    await page.locator('#share-link').waitFor({ timeout: 30_000 });
    const text = (await summaryFacts(page, cfg.lang)).text;
    out[id] = { psuLine: text.split('\n').find((l) => /PSU|τροφοδοτικό/i.test(l)) ?? null, status: text.split('\n').find((l) => /fit|χωρ|incompatible|ασύμβατα|Everything|Όλα/i.test(l)) ?? null };
    await page.close();
  }
  await ctx.close();
  return out;
}

// ---------- ST/FAN: storage step, case fans step and the fan advice ----------
async function storageAndFans(cfg) {
  const ctx = await newContext(cfg);
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  const q = new URLSearchParams({ cpu: 'Ryzen 9 9950X|false', mobo: 'asusprimex870pwifi', gpu: 'bestprice:2160340915', case: 'lianlilancool207', step: 'storage' });
  await page.goto(`${BASE}/?flow=st#builder?${q}`);
  await waitCards(page);
  const storageCount = (await step(page).getByText(/(shown|εμφανίζονται)/).first().textContent())?.trim();
  const storageFirst = await step(page).locator('ul.grid > li.card').first().innerText();
  const shots = [await snap(page, `st-${cfg.lang}-${cfg.width}-storage`)];
  await page.locator('nav[aria-label] ol li').nth(7).getByRole('button').click(); // case
  await waitCards(page);
  const caseAdvice = (await step(page).locator('div.rounded-xl.bg-sunken').first().innerText()).trim();
  const caseCardFans = (await step(page).locator('ul.grid > li.card').first().locator('div.flex.flex-col.text-xs').first().innerText().catch(() => '')).trim();
  shots.push(await snap(page, `st-${cfg.lang}-${cfg.width}-case-step`));
  await page.locator('nav[aria-label] ol li').nth(9).getByRole('button').click(); // fans
  await waitCards(page);
  const fanAdvice = (await step(page).locator('div.rounded-xl.bg-sunken').first().innerText()).trim();
  const fanChips = await step(page).locator('button[aria-pressed="true"]').allInnerTexts();
  const fanCount = (await step(page).getByText(/(shown|εμφανίζονται)/).first().textContent())?.trim();
  shots.push(await snap(page, `st-${cfg.lang}-${cfg.width}-fan-step`));
  await ctx.close();
  return { storageCount, storageFirst, caseAdvice, caseCardFans, fanAdvice, fanChips, fanCount, errors, shots };
}

// ---------- N: slow or failing builder-storage.json / builder-extra.json ----------
async function network(cfg) {
  const out = {};
  // 1) builder-storage.json arrives 8 s late.
  {
    const ctx = await newContext(cfg);
    const page = await ctx.newPage();
    const errors = errorsOf(page);
    await page.route('**/data/builder-storage.json*', async (r) => { await new Promise((res) => setTimeout(res, 8000)); await r.continue(); });
    const t0 = Date.now();
    await page.goto(`${BASE}/?flow=n1#builder?step=storage`);
    await page.waitForTimeout(2500);
    const during = (await step(page).innerText()).replace(/\s+/g, ' ').slice(0, 300);
    const shots = [await snap(page, `n-${cfg.lang}-${cfg.width}-storage-loading`)];
    await waitCards(page);
    out.slowStorage = { during, readyAfterMs: Date.now() - t0, errors, shots };
    await ctx.close();
  }
  // 2) builder-storage.json fails.
  {
    const ctx = await newContext(cfg);
    const page = await ctx.newPage();
    const errors = errorsOf(page);
    await page.route('**/data/builder-storage.json*', (r) => r.fulfill({ status: 503, body: 'unavailable' }));
    await page.goto(`${BASE}/?flow=n2#builder?step=storage`);
    await page.waitForTimeout(12_000);
    const after12s = (await step(page).innerText()).replace(/\s+/g, ' ').slice(0, 300);
    const shots = [await snap(page, `n-${cfg.lang}-${cfg.width}-storage-failed`)];
    out.failedStorage = { after12s, errors, shots };
    await ctx.close();
  }
  // 3) A saved build with a drive, builder-storage.json late: is the drive kept, and the total?
  {
    const ctx = await newContext(cfg);
    const page = await ctx.newPage();
    const errors = errorsOf(page);
    await page.goto(`${BASE}/?flow=n3#builder`);
    await page.evaluate(() => localStorage.setItem('pcBuild', JSON.stringify({ cpu: 'Ryzen 7 9700X|false', storage: 'samsung990pro1tbssd' })));
    await page.route('**/data/builder-storage.json*', async (r) => { await new Promise((res) => setTimeout(res, 8000)); await r.continue(); });
    await page.reload();
    await page.waitForTimeout(2500);
    const early = await summaryFacts(page, cfg.lang);
    const savedEarly = await saved(page);
    await page.waitForTimeout(9000);
    const late = await summaryFacts(page, cfg.lang);
    out.savedDriveLate = { earlyRows: early.rows, savedEarly, lateRows: late.rows, savedLate: await saved(page), errors };
    await ctx.close();
  }
  // 4) Copy list before builder-extra.json arrives.
  out.copyBeforeExtra = await copyList(cfg, { slowExtra: true });
  return out;
}

// ---------- M: phone bottom bar ----------
async function phoneBar(cfg) {
  if (cfg.width >= 1024) return null;
  const ctx = await newContext(cfg);
  const page = await ctx.newPage();
  const errors = errorsOf(page);
  await page.goto(`${BASE}/?flow=m#builder?step=gpu`);
  await waitCards(page);
  const bar = page.locator('aside');
  const barBox = await bar.boundingBox();
  const backFwd = await bar.locator('button[aria-label]').evaluateAll((bs) => bs.map((b) => `${b.getAttribute('aria-label')} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`));
  // Scroll to the bottom: is the last control above the bar?
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const lastControl = await page.evaluate(() => {
    const s = document.querySelector('section[aria-labelledby="step-title"]');
    const btns = [...(s?.querySelectorAll('button') ?? [])];
    const last = btns[btns.length - 1];
    const r = last?.getBoundingClientRect();
    const a = document.querySelector('aside')?.getBoundingClientRect();
    return r && a ? { lastBottom: Math.round(r.bottom), barTop: Math.round(a.top), coveredBy: Math.max(0, Math.round(r.bottom - a.top)) } : null;
  });
  const shots = [await snap(page, `m-${cfg.lang}-${cfg.width}-bottom`)];
  await bar.locator('button[aria-expanded]').click();
  await page.waitForTimeout(300);
  const open = await bar.boundingBox();
  shots.push(await snap(page, `m-${cfg.lang}-${cfg.width}-bar-open`));
  // Next from the bar.
  await bar.locator('button[aria-expanded]').click();
  const before = (await page.locator('#step-title').textContent())?.trim();
  await bar.locator('button[aria-label]').last().click();
  const after = (await page.locator('#step-title').textContent())?.trim();
  await ctx.close();
  return { barBox, backFwd, lastControl, openHeight: open?.height, before, after, errors, shots };
}

const FLOWS = { g1: guidedFull, g2: guidedSkip, g3: guidedChangeCpu, q1: quickList, s: savedAndShared, c: copyList, w: wattage, st: storageAndFans, n: network, m: phoneBar };
for (const cfg of CONFIGS) {
  const key = `${cfg.lang}-${cfg.width}`;
  results[key] = {};
  for (const [name, fn] of Object.entries(FLOWS)) {
    if (!want(name)) continue;
    // Wattage and network don't depend on width; run them at 1366 only.
    if ((name === 'w' || name === 'n') && cfg.width !== 1366) continue;
    try {
      results[key][name] = await fn(cfg);
      console.log(`${key} ${name}: ok`);
    } catch (e) {
      results[key][name] = { failed: String(e).slice(0, 500) };
      console.log(`${key} ${name}: FAILED ${String(e).slice(0, 200)}`);
    }
  }
}
await browser.close();
writeFileSync(join(OUT, `builder-flows${ONLY ? `-${ONLY.replace(/,/g, '_')}` : ''}.json`), `${JSON.stringify(results, null, 2)}\n`);
