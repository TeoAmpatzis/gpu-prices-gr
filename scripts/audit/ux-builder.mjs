// UX audit of the PC builder (v2 Phase 0, B4): Guided and Quick list modes at 1366 and 360, a full
// walk to the Review, "Clear build", a build with a clash (from a saved build), a saved part that no
// longer exists, the share link, "Copy list", loading, keyboard focus, tap targets and contrast.
// Curated JPEGs go to docs/audit/ux/, raw measurements to docs/audit/ux-full/builder.json.
// Usage: node scripts/audit/ux-builder.mjs   (BASE_URL overrides http://localhost:4180)
/* global document, location, HTMLElement */
import { mkdirSync, writeFileSync } from 'node:fs';
import { BASE, FULL, OUT, clickText, contrastScan, launch, open, ready, scrollTo, shot, sleep, tapTargets } from './ux-lib.mjs';

mkdirSync(OUT, { recursive: true });
const R = {};
const errors = [];
const browser = await launch();

async function scenario(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    errors.push({ name, error: String(e?.message ?? e).slice(0, 300) });
    console.log(`FAIL ${name}: ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

const NEXT = /^\s*(Επόμενο|Next|Παράλειψη|Skip)\s*$/;
const CHOOSE = /^\s*(Επιλογή|Choose)\s*$/;
const stepTitle = (page) => page.evaluate(() => document.querySelector('#step-title')?.textContent?.trim() ?? null);
const cards = (page) => page.waitForFunction(() => [...document.querySelectorAll('li.card button')].some((b) => /^(Επιλογή|Choose)$/.test(b.textContent?.trim() ?? '')), null, { timeout: 20000 });
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'));
/** Summary text (desktop card or the phone bar's details). */
const summary = (page) =>
  page.evaluate(() => {
    const a = [...document.querySelectorAll('aside')].find((e) => e instanceof HTMLElement && e.offsetParent !== null && /Σύνολο|Total/.test(e.innerText));
    return a ? a.innerText.trim() : null;
  });

async function goBuilder(page, hash = '#builder') {
  await page.goto(`${BASE}/?ux=${encodeURIComponent(hash)}${hash}`);
  await ready(page);
}

/** Guided: from the use step, choose Gaming + 1000 € and walk every step choosing the first card. */
async function walk(page, prefix, width) {
  const visited = [];
  await clickText(page, 'button[aria-pressed="false"]', /Gaming/);
  await clickText(page, 'button[aria-pressed="false"]', /^\s*1000 €\s*$/);
  await sleep(300);
  await scrollTo(page, 0);
  await shot(page, `${OUT}/${prefix}-use-${width}-el-light.jpg`);
  await clickText(page, 'button', NEXT);
  for (let i = 0; i < 12; i++) {
    const title = await stepTitle(page);
    if (/Έλεγχος|Review|Σύνοψη/.test(title ?? '') || !title) break;
    try {
      await cards(page);
    } catch {
      // a step without cards (nothing to choose): move on
    }
    await sleep(300);
    if (i === 0) {
      await scrollTo(page, 0);
      await shot(page, `${OUT}/${prefix}-cpu-${width}-el-light.jpg`);
    }
    const before = await stepTitle(page);
    await clickText(page, 'li.card button:not([disabled])', CHOOSE);
    await sleep(400);
    const after = await stepTitle(page);
    visited.push({ step: before, autoAdvanced: before !== after });
    if (i === 1) {
      await scrollTo(page, 0);
      await shot(page, `${OUT}/${prefix}-mobo-chosen-${width}-el-light.jpg`);
    }
    if (!(await clickText(page, 'button', NEXT))) break;
    await sleep(500);
  }
  return visited;
}

// ---------- 1. Guided at 1366: use step, cards, walk, review, clear ----------
await scenario('guided 1366', async () => {
  const { context, page } = await open(browser, { width: 1366, permissions: ['clipboard-read', 'clipboard-write'] });
  const dialogs = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });
  await goBuilder(page);
  await shot(page, `${OUT}/ux-builder-guided-1366-el-light.jpg`);
  R.guidedEmpty = { step: await stepTitle(page), summary: await summary(page) };
  R.guidedEmpty.tap = (await tapTargets(page)).length;
  const visited = await walk(page, 'ux-builder-guided', 1366);
  await sleep(800);
  await scrollTo(page, 0);
  await shot(page, `${OUT}/ux-builder-guided-review-1366-el-light.jpg`);
  await shot(page, `${FULL}/builder-review-full-1366-el-light.jpg`, { fullPage: true });
  R.guidedWalk = { visited, review: await stepTitle(page), summary: await summary(page), saved: await saved(page) };
  R.shareLink = await page.evaluate(() => document.querySelector('#share-link')?.value ?? null);
  // Copy list
  await clickText(page, 'button', /Αντιγραφή λίστας|Copy list/);
  await sleep(500);
  R.copyList = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => `clipboard read failed: ${e.message}`);
  // Clear build: is there a confirmation or an undo?
  const totalBefore = await summary(page);
  await clickText(page, 'aside button', /^\s*(Καθαρισμός|Clear build)\s*$/);
  await sleep(600);
  await scrollTo(page, 0);
  await shot(page, `${OUT}/ux-builder-cleared-1366-el-light.jpg`);
  R.clear = {
    dialogs,
    summaryBefore: totalBefore?.slice(0, 120),
    summaryAfter: (await summary(page))?.slice(0, 300),
    undo: await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Αναίρεση|Undo/i.test(b.textContent ?? ''))),
    saved: await saved(page),
    prefsKept: await page.evaluate(() => localStorage.getItem('pcBuild')),
  };
  await context.close();
});

// ---------- 2. Guided at 360: use step, cards with the bottom bar, summary opened, tap targets ----------
await scenario('guided 360', async () => {
  const { context, page } = await open(browser, { width: 360 });
  await goBuilder(page);
  await shot(page, `${OUT}/ux-builder-guided-360-el-light.jpg`);
  R.tap360 = { use: (await tapTargets(page)).filter((t) => !t.inline && !t.disabled) };
  R.guided360Empty = { bar: await page.evaluate(() => document.querySelector('aside')?.innerText.trim()) };
  const visited = await walk(page, 'ux-builder-guided', 360);
  R.guided360 = { visited };
  // Summary bar opened on the review
  await page.locator('aside button[aria-expanded="false"]').first().click();
  await sleep(500);
  await shot(page, `${OUT}/ux-builder-summary-open-360-el-light.jpg`);
  R.tap360.reviewSummaryOpen = (await tapTargets(page)).filter((t) => !t.inline && !t.disabled);
  await context.close();
  // The CPU step's cards with the fixed bar (tap targets on the cards)
  const again = await open(browser, { width: 360 });
  await goBuilder(again.page, '#builder?step=cpu');
  await cards(again.page);
  R.tap360.cpu = (await tapTargets(again.page)).filter((t) => !t.inline && !t.disabled);
  R.cpu360Bar = await again.page.evaluate(() => {
    const a = document.querySelector('aside');
    const r = a.getBoundingClientRect();
    return { top: Math.round(r.top), height: Math.round(r.height), text: a.innerText.trim() };
  });
  await again.context.close();
});

// ---------- 3. Quick list at 1366 and 360; keys for a clash build ----------
const keys = {};
await scenario('quick list', async () => {
  for (const width of [1366, 360]) {
    const { context, page } = await open(browser, { width });
    await goBuilder(page, '#builder?mode=quick');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /^(Επιλογή|Choose)$/.test(b.textContent?.trim() ?? '')));
    await sleep(500);
    await shot(page, `${OUT}/ux-builder-quick-${width}-el-light.jpg`);
    await clickText(page, 'button', CHOOSE);
    await sleep(1500);
    await shot(page, `${OUT}/ux-builder-quick-picker-${width}-el-light.jpg`);
    if (width === 1366) {
      // An Intel CPU …
      await page.locator('.bg-sunken input[aria-label]').first().fill('14600K');
      await sleep(800);
      await page.locator('ul.max-h-80 li button').first().click();
      await sleep(400);
      keys.cpu = (await saved(page)).cpu;
      await clickText(page, 'aside button', /^\s*(Καθαρισμός|Clear build)\s*$/);
      await sleep(400);
      // … and an AM5 board, chosen on their own.
      const mobo = page.locator('div.p-4', { hasText: /Μητρικές|Motherboards/ }).getByRole('button', { name: CHOOSE });
      await mobo.first().click();
      await sleep(800);
      await page.locator('.bg-sunken input[aria-label]').first().fill('B650');
      await sleep(800);
      await page.locator('ul.max-h-80 li button').first().click();
      await sleep(400);
      keys.mobo = (await saved(page)).mobo;
      R.quickPickerTap = null;
    } else {
      R.quickPickerTap = (await tapTargets(page)).filter((t) => !t.inline && !t.disabled);
    }
    await context.close();
  }
  R.keys = keys;
});

// ---------- 4. A saved build that clashes (Intel CPU + AM5 board) ----------
await scenario('clash build', async () => {
  if (!keys.cpu || !keys.mobo) throw new Error(`keys missing ${JSON.stringify(keys)}`);
  R.clash = {};
  for (const width of [1366, 360]) {
    const { context, page } = await open(browser, { width, build: { cpu: keys.cpu, mobo: keys.mobo, use: 'gaming' } });
    await goBuilder(page, '#builder?mode=quick');
    await sleep(2000);
    await shot(page, `${OUT}/ux-builder-clash-quick-${width}-el-light.jpg`);
    R.clash[`quick-${width}`] = await summary(page);
    await goBuilder(page, '#builder?step=review');
    await sleep(2000);
    if (width === 360) {
      await page.locator('aside button[aria-expanded="false"]').first().click();
      await sleep(400);
    }
    await shot(page, `${OUT}/ux-builder-clash-review-${width}-el-light.jpg`);
    R.clash[`review-${width}`] = await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 1500));
    // The board step with the clash: is the chosen board marked?
    if (width === 1366) {
      await goBuilder(page, '#builder?step=mobo');
      await cards(page);
      await shot(page, `${OUT}/ux-builder-clash-mobo-step-1366-el-light.jpg`);
      R.clash.moboStep = await page.evaluate(() => document.querySelector('section')?.innerText.slice(0, 600));
    }
    await context.close();
  }
});

// ---------- 5. A saved part that is no longer in the data ----------
await scenario('vanished part', async () => {
  const { context, page } = await open(browser, { width: 1366, build: { cpu: 'Ryzen 9 9999X|true', mobo: keys.mobo ?? 'x', gpu: 'skroutz:0' } });
  await goBuilder(page, '#builder?mode=quick');
  await sleep(2500);
  await shot(page, `${OUT}/ux-builder-vanished-part-1366-el-light.jpg`);
  R.vanished = { summary: await summary(page), saved: await saved(page), mentions: await page.evaluate(() => /9999X|δεν υπάρχει|no longer|αφαιρέθηκε|removed/i.test(document.body.innerText)) };
  await context.close();
});

// ---------- 6. Opening a share link ----------
await scenario('share link', async () => {
  if (!R.shareLink) throw new Error('no share link');
  const url = R.shareLink.replace(/^https?:\/\/[^/]+/, BASE);
  for (const width of [1366, 360]) {
    const { context, page } = await open(browser, { width });
    await page.goto(url);
    await ready(page);
    await sleep(2000);
    await shot(page, `${OUT}/ux-builder-shared-${width}-el-light.jpg`);
    R[`shared${width}`] = { step: await stepTitle(page), hash: await page.evaluate(() => location.hash.slice(0, 80)), summary: (await summary(page))?.slice(0, 400) };
    await context.close();
  }
});

// ---------- 7. Loading: builder.json slow ----------
await scenario('builder loading', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await page.route('**/data/builder.json*', async (route) => {
    await sleep(8000);
    await route.continue();
  });
  await page.goto(`${BASE}/#builder?step=cpu`);
  await sleep(2000);
  await shot(page, `${OUT}/ux-builder-loading-1366-el-light.jpg`);
  R.loading = await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 500));
  await context.close();
});

// ---------- 8. Keyboard on the builder (use step → first card) ----------
await scenario('builder keyboard', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await goBuilder(page, '#builder?step=cpu');
  await cards(page);
  const steps = [];
  for (let i = 1; i <= 80; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      return { tag: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40) };
    });
    steps.push(info);
    if (info && /^(Επιλογή|Choose)$/.test(info.text)) {
      await page.evaluate(() => document.activeElement?.scrollIntoView({ block: 'center' }));
      await shot(page, `${FULL}/focus-builder-choose-1366-el-light.jpg`);
      break;
    }
  }
  R.keyboard = { pressesToFirstChoose: steps.length, steps };
  await context.close();
});

// ---------- 9. Contrast screening on builder views ----------
await scenario('builder contrast', async () => {
  R.contrast = {};
  for (const theme of ['light', 'dark']) {
    const { context, page } = await open(browser, { width: 1366, theme, build: keys.cpu ? { cpu: keys.cpu, mobo: keys.mobo } : undefined });
    await goBuilder(page, '#builder?step=ram');
    await cards(page);
    await sleep(500);
    if (theme === 'dark') await shot(page, `${OUT}/ux-builder-guided-ram-1366-el-dark.jpg`);
    const low = await contrastScan(page);
    R.contrast[theme] = { count: low.length, items: low.slice(0, 25) };
    await context.close();
  }
});

await browser.close();
writeFileSync(`${FULL}/builder.json`, JSON.stringify({ base: BASE, errors, ...R }, null, 1));
console.log(`done; ${errors.length} failed scenarios`);
