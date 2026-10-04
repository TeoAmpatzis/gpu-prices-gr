// UX audit of the category pages (v2 Phase 0, B4): first visit, list pages, product details, filter
// sidebar and phone sheet, applied filters, tab bar, empty / loading / error states, keyboard focus,
// tap targets, hover-only information and contrast screening. Curated JPEGs go to docs/audit/ux/,
// raw measurements to docs/audit/ux-full/lists.json.
// Usage: node scripts/audit/ux-lists.mjs   (BASE_URL overrides http://localhost:4180)
/* global document, window, location, getComputedStyle, HTMLElement, HTMLSelectElement */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  BASE,
  CATEGORY_PAGES,
  FULL,
  INFO_PAGES,
  OUT,
  clickText,
  contrastScan,
  go,
  hoverOnly,
  launch,
  open,
  ready,
  scrollTo,
  shot,
  sleep,
  tapTargets,
} from './ux-lib.mjs';

mkdirSync(OUT, { recursive: true });
mkdirSync(FULL, { recursive: true });
const R = {}; // results
const errors = [];
const browser = await launch();

/** Runs one scenario; a failure is logged and the next scenario still runs. */
async function scenario(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    errors.push({ name, error: String(e?.message ?? e).slice(0, 300) });
    console.log(`FAIL ${name}: ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

const firstNames = (page, n = 5) =>
  page.evaluate((n) => {
    const rows = [...document.querySelectorAll('main tbody button[aria-expanded], main li.card > button[aria-expanded]')].filter(
      (e) => e instanceof HTMLElement && e.offsetParent !== null,
    );
    return rows.slice(0, n).map((b) => b.innerText.trim().split('\n')[0]);
  }, n);

const modelCount = (page) =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('main span.font-semibold.text-fg')].find((e) => e instanceof HTMLElement && e.offsetParent !== null);
    return el ? el.textContent : null;
  });

const activeChips = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('main [aria-label="Ενεργά φίλτρα"] button, main [aria-label="Active filters"] button')]
      .filter((e) => e instanceof HTMLElement && e.offsetParent !== null)
      .map((b) => b.innerText.trim()),
  );

// ---------- 1. First visit at "/" (nothing stored; a Greek browser) ----------
await scenario('first visit', async () => {
  R.firstVisit = {};
  for (const width of [1366, 360]) {
    const { context, page } = await open(browser, { width, fresh: true, lang: 'el' });
    await page.goto(`${BASE}/`);
    await ready(page);
    await shot(page, `${OUT}/ux-first-visit-${width}-el-light.jpg`);
    R.firstVisit[width] = await page.evaluate(() => {
      const nav = document.querySelector('header nav');
      const vw = document.documentElement.clientWidth;
      const tabs = [...nav.querySelectorAll('a')].map((a) => {
        const r = a.getBoundingClientRect();
        return { text: a.innerText.trim(), left: Math.round(r.left), right: Math.round(r.right), inView: r.left >= 0 && r.right <= vw };
      });
      return {
        h1: document.querySelector('h1')?.innerText,
        subtitle: document.querySelector('h1 + p')?.innerText,
        title: document.title,
        hash: location.hash,
        lang: document.documentElement.lang,
        dark: document.documentElement.classList.contains('dark'),
        tabsInView: tabs.filter((t) => t.inView).map((t) => t.text),
        builderTab: tabs[tabs.length - 1],
        aboveFold: window.innerHeight,
        firstRowTop: Math.round(
          [...document.querySelectorAll('main tbody tr, main li.card')].find((e) => e instanceof HTMLElement && e.offsetParent !== null)?.getBoundingClientRect().top ?? -1,
        ),
      };
    });
    await context.close();
  }
});

// ---------- 2. Every category at 1366 and 360 (el, light) + filter/column inventory ----------
await scenario('category pages + inventory', async () => {
  R.inventory = {};
  for (const width of [1366, 360]) {
    const { context, page } = await open(browser, { width, lang: 'el', theme: 'light' });
    for (const cat of CATEGORY_PAGES) {
      await page.goto(`${BASE}/?ux=${cat}#${cat}`);
      await ready(page);
      await shot(page, `${OUT}/ux-list-${width}-el-light-${cat}.jpg`);
      if (width !== 1366) continue;
      R.inventory[cat] = await page.evaluate(() => {
        const vis = (e) => e instanceof HTMLElement && e.offsetParent !== null;
        const aside = [...document.querySelectorAll('main aside')].find(vis);
        const sections = [...aside.querySelectorAll('.label')].map((l) => l.innerText.trim());
        const chips = [...aside.querySelectorAll('button[aria-pressed]')].map((b) => ({
          text: b.innerText.trim().replace(/\s+/g, ' '),
          pressed: b.getAttribute('aria-pressed') === 'true',
        }));
        const selects = [...aside.querySelectorAll('select')].map((s) => {
          const label = s.getAttribute('aria-label') || s.previousElementSibling?.textContent?.trim() || '';
          const opts = [...s.options].map((o) => o.textContent.trim());
          return { label, options: opts.length - (label === 'Ταξινόμηση' || label === 'Sort' ? 0 : 1), sample: opts.slice(0, 6), multiple: s.multiple };
        });
        const numbers = [...aside.querySelectorAll('input[type=number]')].map((i) => i.closest('label')?.innerText.trim());
        const ths = [...document.querySelectorAll('main thead th')].filter((th) => getComputedStyle(th).display !== 'none');
        const headers = ths.map((th) => ({
          text: th.innerText.trim(),
          interactive: !!th.querySelector('button, a') || th.hasAttribute('aria-sort') || getComputedStyle(th).cursor === 'pointer',
        }));
        return { sections, chips, selects, numbers, headers };
      });
      R.inventory[cat].models = await modelCount(page);
      R.inventory[cat].first = await firstNames(page);
    }
    await context.close();
  }
});

// ---------- 3. Column header click: does the table sort? ----------
await scenario('header click', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, 'gpu');
  const before = await firstNames(page, 6);
  await page.locator('main thead th', { hasText: 'VRAM' }).first().click();
  await sleep(500);
  const afterVram = await firstNames(page, 6);
  await page.locator('main thead th', { hasText: /Φθηνότερη/ }).first().click();
  await sleep(500);
  R.headerClick = { before, afterVram, afterPrice: await firstNames(page, 6), hash: await page.evaluate(() => location.hash) };
  await context.close();
});

// ---------- 4. Group pills start all selected: clicking one removes it ----------
await scenario('pill semantics', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, 'gpu');
  const before = { count: await modelCount(page), first: await firstNames(page, 4) };
  await clickText(page, 'main aside button[aria-pressed]', /^\s*NVIDIA/);
  await sleep(600);
  await scrollTo(page, 0);
  await shot(page, `${OUT}/ux-pill-click-nvidia-1366-el-light-gpu.jpg`);
  R.pills = {
    before,
    after: { count: await modelCount(page), first: await firstNames(page, 4), chips: await activeChips(page), hash: await page.evaluate(() => location.hash) },
  };
  // Every pill off: what does the list say?
  await clickText(page, 'main aside button[aria-pressed="true"]', /^\s*AMD/);
  await clickText(page, 'main aside button[aria-pressed="true"]', /^\s*Intel/);
  await sleep(600);
  R.pills.none = { count: await modelCount(page), chips: await activeChips(page) };
  await shot(page, `${OUT}/ux-pill-none-1366-el-light-gpu.jpg`);
  await context.close();
});

// ---------- 5. Product details (opened inside the list) ----------
await scenario('details', async () => {
  R.details = {};
  for (const [width, cat] of [
    [1366, 'gpu'],
    [1366, 'ram'],
    [360, 'gpu'],
    [768, 'storage'],
  ]) {
    const { context, page } = await open(browser, { width });
    await go(page, cat);
    const sel = width >= 1024 ? 'main tbody button[aria-expanded="false"]' : 'main li.card > button[aria-expanded="false"]';
    await page.locator(sel).first().click();
    await page.waitForFunction(() => !document.querySelector('main .skeleton'), null, { timeout: 15000 });
    await sleep(1200);
    await page.evaluate((sel) => {
      const b = document.querySelector(sel.replace('"false"', '"true"'));
      b?.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -12);
    }, sel);
    await sleep(300);
    await shot(page, `${OUT}/ux-details-${width}-el-light-${cat}.jpg`);
    R.details[`${width}-${cat}`] = await page.evaluate(() => {
      const list = [...document.querySelectorAll('main ul.max-h-80')].find((e) => e instanceof HTMLElement && e.offsetParent !== null);
      const items = list ? [...list.querySelectorAll('li a')] : [];
      return {
        listings: items.length,
        withHref: items.filter((a) => a.getAttribute('href')).length,
        sample: items.slice(0, 4).map((a) => a.innerText.trim().replace(/\s+/g, ' ')),
        scrolls: list ? list.scrollHeight > list.clientHeight + 1 : false,
        brandsInRows: [...new Set(items.map((a) => (a.innerText.match(/(Kingston|Corsair|G\.Skill|Crucial|Patriot|Adata|TeamGroup|Lexar|Kingston Fury|Gigabyte|MSI|Asus|Sapphire|Palit|Zotac|PNY|XFX|PowerColor|Gainward|ASRock)/i) ?? [''])[0]))],
      };
    });
    R.details[`${width}-${cat}`].hoverOnly = (await hoverOnly(page)).slice(0, 12);
    await context.close();
  }
});

// ---------- 6. Phone filter sheet (case, el, light + dark) and applied filters on phones ----------
await scenario('filter sheet', async () => {
  R.sheet = {};
  for (const theme of ['light', 'dark']) {
    const { context, page } = await open(browser, { width: 360, theme });
    await go(page, 'case');
    await clickText(page, 'main button[aria-haspopup="dialog"]', /^\s*(Φίλτρα|Filters)/);
    await sleep(700);
    await shot(page, `${OUT}/ux-sheet-top-360-el-${theme}-case.jpg`);
    const body = '[role=dialog][aria-modal=true] .overflow-y-auto';
    R.sheet[theme] = await page.evaluate((body) => {
      const el = document.querySelector(body);
      return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, screens: Math.round((el.scrollHeight / el.clientHeight) * 10) / 10 };
    }, body);
    if (theme === 'light') {
      await scrollTo(page, 99999, body);
      await sleep(300);
      await shot(page, `${OUT}/ux-sheet-bottom-360-el-light-case.jpg`);
      // Maker dropdown: how many options in a native select?
      R.sheet.makerOptions = await page.evaluate(() => {
        const s = [...document.querySelectorAll('[role=dialog] select')].pop();
        return s instanceof HTMLSelectElement ? s.options.length - 1 : null;
      });
      R.sheet.tap = (await tapTargets(page)).filter((t) => !t.inline);
      // Apply two filters in the sheet, then "Show N results".
      await clickText(page, '[role=dialog] button[aria-pressed]', /^\s*(Μόνο προσφορές|On sale only)/);
      await page.evaluate(() => {
        const s = [...document.querySelectorAll('[role=dialog] select')].find((x) => /Πλαϊνό παράθυρο|Side window/.test(x.previousElementSibling?.textContent ?? ''));
        if (s instanceof HTMLSelectElement) {
          s.value = 'yes';
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await sleep(600);
      R.sheet.footer = await page.evaluate(() => document.querySelector('[role=dialog] .border-t:last-child')?.innerText?.trim());
      await clickText(page, '[role=dialog] button', /^\s*(Εμφάνιση|Show)/);
      await sleep(600);
      await scrollTo(page, 0);
      await shot(page, `${OUT}/ux-applied-360-el-light-case.jpg`);
      R.sheet.applied = { chips: await activeChips(page), count: await modelCount(page) };
    }
    await context.close();
  }
});

// ---------- 7. Tab bar: which tabs are visible at each width ----------
await scenario('tab bar', async () => {
  R.tabs = [];
  for (const lang of ['el', 'en']) {
    for (const width of [360, 768, 900, 1024, 1100, 1180, 1279, 1280, 1366, 1920]) {
      const { context, page } = await open(browser, { width, lang });
      await go(page, 'ram');
      const m = await page.evaluate(() => {
        const nav = document.querySelector('header nav');
        const nr = nav.getBoundingClientRect();
        const tabs = [...nav.querySelectorAll('a')].map((a) => {
          const r = a.getBoundingClientRect();
          return { text: a.innerText.trim(), state: r.left >= nr.left - 1 && r.right <= nr.right + 1 ? 'in' : r.left >= nr.right || r.right <= nr.left ? 'out' : 'cut' };
        });
        return {
          overflowPx: nav.scrollWidth - nav.clientWidth,
          hidden: tabs.filter((t) => t.state !== 'in').map((t) => `${t.text} (${t.state})`),
          scrollbar: getComputedStyle(nav).scrollbarWidth,
          tabHeight: Math.round(nav.querySelector('a').getBoundingClientRect().height),
        };
      });
      R.tabs.push({ lang, width, ...m });
      if (lang === 'el' && [768, 1024, 1180].includes(width)) {
        await shot(page, `${OUT}/ux-tabbar-${width}-el-light.jpg`, { clip: { x: 0, y: 0, width, height: 220 } });
      }
      await context.close();
    }
  }
});

// ---------- 8. Empty, loading and error states ----------
await scenario('empty state', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, 'gpu');
  await page.locator('main aside input[aria-label]').first().fill('zzqqxx');
  await sleep(800);
  await shot(page, `${OUT}/ux-empty-1366-el-light-gpu.jpg`);
  R.empty = await page.evaluate(() => document.querySelector('main .card.items-center')?.innerText?.trim());
  await context.close();
  const phone = await open(browser, { width: 360 });
  await go(phone.page, 'gpu');
  await clickText(phone.page, 'main button[aria-haspopup="dialog"]', /^\s*(Φίλτρα|Filters)/);
  await sleep(500);
  await phone.page.locator('[role=dialog] input[aria-label]').first().fill('zzqqxx');
  await sleep(800);
  R.emptySheetFooter = await phone.page.evaluate(() => document.querySelector('[role=dialog] .border-t:last-child')?.innerText?.trim());
  await clickText(phone.page, '[role=dialog] button', /^\s*(Εμφάνιση|Show)/);
  await sleep(600);
  await shot(phone.page, `${OUT}/ux-empty-360-el-light-gpu.jpg`);
  await phone.context.close();
});

await scenario('loading state', async () => {
  R.loading = {};
  for (const width of [1366, 360]) {
    const { context, page } = await open(browser, { width });
    await page.route('**/data/gpu/list.json*', async (route) => {
      await sleep(6000);
      await route.continue();
    });
    await page.goto(`${BASE}/#gpu`);
    await sleep(1500);
    await shot(page, `${OUT}/ux-loading-${width}-el-light-gpu.jpg`);
    R.loading[width] = await page.evaluate(() => ({
      skeleton: !!document.querySelector('main .skeleton'),
      busy: !!document.querySelector('[aria-busy="true"]'),
      text: document.querySelector('main')?.innerText.trim().slice(0, 80),
    }));
    await context.close();
  }
});

await scenario('error state', async () => {
  R.error = {};
  for (const [width, mode] of [
    [1366, 'http500'],
    [360, 'offline'],
  ]) {
    const { context, page } = await open(browser, { width });
    await page.route('**/data/gpu/list.json*', (route) => (mode === 'http500' ? route.fulfill({ status: 500, body: 'error' }) : route.abort('internetdisconnected')));
    await page.goto(`${BASE}/#gpu`);
    await sleep(2500);
    await shot(page, `${OUT}/ux-error-${mode}-${width}-el-light-gpu.jpg`);
    R.error[mode] = await page.evaluate(() => ({
      text: document.querySelector('main')?.innerText.trim().slice(0, 200),
      retryButton: [...document.querySelectorAll('main button')].some((b) => /Ξανά|Δοκιμ|Retry|again/i.test(b.textContent ?? '')),
    }));
    await context.close();
  }
});

await scenario('unknown route', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, '#this-page-does-not-exist');
  R.unknownRoute = await page.evaluate(() => ({ h1: document.querySelector('h1')?.innerText, hash: location.hash, title: document.title }));
  await context.close();
});

// ---------- 9. Status line, its popover and the sort help (price freshness) ----------
await scenario('status + sort help', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, 'gpu');
  const status = page.locator('main button[aria-haspopup="dialog"]', { hasText: /καταστήματα|stores/ }).first();
  R.status = { line: (await status.innerText()).trim() };
  await status.click();
  await sleep(400);
  const box = await page.locator('main [role=dialog]').first().boundingBox();
  await shot(page, `${OUT}/ux-status-popover-1366-el-light-gpu.jpg`, {
    clip: { x: Math.max(0, box.x - 380), y: Math.max(0, box.y - 70), width: Math.min(760, 1366 - Math.max(0, box.x - 380)), height: box.height + 90 },
  });
  R.status.popover = await page.locator('main [role=dialog]').first().innerText();
  await page.keyboard.press('Escape');
  await page.locator('main aside button[aria-label]').first().click();
  await sleep(300);
  await shot(page, `${OUT}/ux-sort-help-1366-el-light-gpu.jpg`, { clip: { x: 0, y: 150, width: 700, height: 560 } });
  R.sortHelp = await page.locator('main aside [role=dialog]').first().innerText();
  await context.close();
});

// ---------- 10. Keyboard: Tab from the top of the page to the first product row ----------
await scenario('keyboard focus', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, 'gpu');
  const steps = [];
  const want = { tab: false, chip: false, select: false, field: false, row: false };
  for (let i = 1; i <= 120; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
        shadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 80),
        kind: el.closest('header nav') ? 'tab' : el.matches('aside button[aria-pressed]') ? 'chip' : el.matches('select') ? 'select' : el.matches('input') ? 'field' : el.matches('tbody button[aria-expanded]') ? 'row' : 'other',
      };
    });
    steps.push(info);
    if (info && want[info.kind] === false) {
      want[info.kind] = true;
      await page.evaluate(() => document.activeElement?.scrollIntoView({ block: 'center' }));
      await shot(page, `${FULL}/focus-${info.kind}-1366-el-light-gpu.jpg`);
    }
    if (info?.kind === 'row') break;
  }
  R.focus = { pressesToFirstRow: steps.findIndex((s) => s?.kind === 'row') + 1, steps };
  // Dark theme: the same focus on a chip and a row.
  await context.close();
  const dark = await open(browser, { width: 1366, theme: 'dark' });
  await go(dark.page, 'gpu');
  for (let i = 0; i < R.focus.pressesToFirstRow; i++) await dark.page.keyboard.press('Tab');
  await dark.page.evaluate(() => document.activeElement?.scrollIntoView({ block: 'center' }));
  await shot(dark.page, `${FULL}/focus-row-1366-el-dark-gpu.jpg`);
  await dark.context.close();
});

// ---------- 11. Tap targets at 360 (and 768) ----------
await scenario('tap targets', async () => {
  R.tap = {};
  for (const width of [360, 768]) {
    const { context, page } = await open(browser, { width });
    for (const p of [...CATEGORY_PAGES, ...INFO_PAGES]) {
      await page.goto(`${BASE}/?ux=${p}#${p}`);
      await ready(page);
      const list = (await tapTargets(page)).filter((t) => !t.inline && !t.disabled);
      R.tap[`${width}-${p}`] = { under44: list.length, under24: list.filter((t) => t.under24).length, examples: list.slice(0, 15) };
    }
    // Opened details on a phone
    await go(page, 'gpu');
    await page.locator('main li.card > button[aria-expanded="false"]').first().click();
    await sleep(1500);
    const d = (await tapTargets(page)).filter((t) => !t.inline && !t.disabled);
    R.tap[`${width}-gpu-details`] = { under44: d.length, under24: d.filter((t) => t.under24).length, examples: d.slice(0, 15) };
    await context.close();
  }
});

// ---------- 12. Hover-only information (title attributes) on phones ----------
await scenario('hover-only', async () => {
  R.hover = {};
  for (const cat of ['gpu', 'storage', 'ram']) {
    const { context, page } = await open(browser, { width: 360 });
    await go(page, cat);
    const list = await hoverOnly(page);
    const kinds = {};
    for (const h of list) {
      const k = h.title.replace(/[\d.,]+/g, '#').slice(0, 60);
      kinds[k] = (kinds[k] ?? 0) + 1;
    }
    R.hover[cat] = { total: list.length, kinds, examples: list.slice(0, 6) };
    await context.close();
  }
});

// ---------- 13. Contrast screening (approximate; see ux-lib.mjs) ----------
await scenario('contrast', async () => {
  R.contrast = {};
  for (const theme of ['light', 'dark']) {
    for (const [width, p] of [
      [1366, 'gpu'],
      [1366, 'storage'],
      [360, 'case'],
      [1366, 'about'],
    ]) {
      const { context, page } = await open(browser, { width, theme });
      await go(page, p);
      const low = await contrastScan(page);
      R.contrast[`${theme}-${width}-${p}`] = { count: low.length, items: low.slice(0, 25) };
      await context.close();
    }
  }
});

await browser.close();
writeFileSync(`${FULL}/lists.json`, JSON.stringify({ base: BASE, errors, ...R }, null, 1));
console.log(`done; ${errors.length} failed scenarios`);
