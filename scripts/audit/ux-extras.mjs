// UX audit follow-up checks (v2 Phase 0, B4): focus rings measured after their transition, the PC
// builder tab in the tab bar, the URL when a product opens, where "Next" is after choosing a part,
// photo loading, the active tab on narrow screens, sort on phones, the shared-build notice on phones,
// and representative shots of the text pages. JPEGs to docs/audit/ux/, numbers to
// docs/audit/ux-full/extras.json.
// Usage: node scripts/audit/ux-extras.mjs   (BASE_URL overrides http://localhost:4180)
/* global document, window, location, getComputedStyle, HTMLElement */
import { writeFileSync } from 'node:fs';
import { BASE, FULL, INFO_PAGES, OUT, clickText, go, hoverOnly, launch, open, ready, scrollTo, shot, sleep } from './ux-lib.mjs';

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

const focusStyle = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30),
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
      shadow: cs.boxShadow,
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  });

// ---------- 1. Focus indicators after their 150 ms transition (search field, select, chip, row) ----------
await scenario('focus rings', async () => {
  R.focus = {};
  for (const theme of ['light', 'dark']) {
    const { context, page } = await open(browser, { width: 1366, theme });
    await go(page, 'gpu');
    const targets = { 15: 'search', 16: 'sort', 18: 'chip', 31: 'select', 37: 'row' };
    for (let i = 1; i <= 37; i++) {
      await page.keyboard.press('Tab');
      if (!targets[i]) continue;
      await sleep(800);
      const f = await focusStyle(page);
      R.focus[`${theme}-${targets[i]}`] = f;
      if (f) {
        const pad = 14;
        await shot(page, `${FULL}/focus2-${targets[i]}-1366-el-${theme}.jpg`, {
          clip: { x: Math.max(0, f.box.x - pad), y: Math.max(0, f.box.y - pad), width: Math.min(f.box.w + pad * 2, 700), height: f.box.h + pad * 2 },
        });
      }
    }
    await context.close();
  }
});

// ---------- 2. The PC builder tab at desktop widths (light vs dark) ----------
await scenario('builder tab', async () => {
  R.builderTab = [];
  for (const theme of ['light', 'dark']) {
    for (const width of [1366, 1920]) {
      const { context, page } = await open(browser, { width, theme });
      await go(page, 'gpu');
      const m = await page.evaluate(() => {
        const nav = document.querySelector('header nav');
        const a = [...nav.querySelectorAll('a')].pop();
        const nr = nav.getBoundingClientRect();
        const r = a.getBoundingClientRect();
        return { navRight: Math.round(nr.right), tabRight: Math.round(r.right), cutPx: Math.round(r.right - nr.right), weight: getComputedStyle(document.body).fontWeight };
      });
      R.builderTab.push({ theme, width, ...m });
      if (width === 1366) await shot(page, `${OUT}/ux-tabbar-builder-cut-1366-el-${theme}.jpg`, { clip: { x: 700, y: 80, width: 666, height: 60 } });
      await context.close();
    }
  }
});

// ---------- 3. Opening a product: does the URL change (a link to send)? ----------
await scenario('product url', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, 'gpu');
  const before = page.url();
  await page.locator('main tbody button[aria-expanded="false"]').first().click();
  await sleep(1000);
  R.productUrl = { before, after: page.url(), changed: before !== page.url() };
  await context.close();
});

// ---------- 4. Guided builder: where is "Next" after choosing a part? ----------
await scenario('next position', async () => {
  R.next = {};
  for (const width of [1366, 1920]) {
    const { context, page } = await open(browser, { width, build: { use: 'gaming', budget: 1000 } });
    await page.goto(`${BASE}/?ux=next#builder?step=cpu`);
    await ready(page);
    await page.waitForFunction(() => [...document.querySelectorAll('li.card button')].some((b) => /^(Επιλογή|Choose)$/.test(b.textContent?.trim() ?? '')));
    await scrollTo(page, 0);
    await clickText(page, 'li.card button', /^(Επιλογή|Choose)$/);
    await sleep(500);
    R.next[width] = await page.evaluate(() => {
      const next = [...document.querySelectorAll('section button')].find((b) => /^\s*(Επόμενο|Next)\s*$/.test(b.textContent ?? ''));
      const chosen = document.querySelector('li.card.ring-2');
      const r = next?.getBoundingClientRect();
      return {
        viewport: window.innerHeight,
        nextTop: r ? Math.round(r.top + window.scrollY) : null,
        chosenTop: chosen ? Math.round(chosen.getBoundingClientRect().top + window.scrollY) : null,
        cards: document.querySelectorAll('section li.card').length,
        pageHeight: document.documentElement.scrollHeight,
      };
    });
    await context.close();
  }
});

// ---------- 5. Product photos: loading state on the dark theme ----------
await scenario('photos', async () => {
  const { context, page } = await open(browser, { width: 1366, theme: 'dark' });
  await go(page, 'gpu');
  const count = () =>
    page.evaluate(() => {
      const imgs = [...document.querySelectorAll('main img')].filter((i) => i.getBoundingClientRect().top < window.innerHeight);
      return { inView: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, pending: imgs.filter((i) => !i.complete).length };
    });
  R.photos = { atReady: await count() };
  await sleep(6000);
  R.photos.after6s = await count();
  await shot(page, `${FULL}/photos-after-6s-1366-el-dark-gpu.jpg`);
  await context.close();
});

// ---------- 6. Narrow screens: is the active tab visible? Is a sort control visible outside the sheet? ----------
await scenario('active tab + sort on phones', async () => {
  R.activeTab = [];
  for (const width of [360, 768]) {
    const { context, page } = await open(browser, { width });
    for (const p of ['gpu', 'case', 'cooler', 'builder']) {
      await page.goto(`${BASE}/?ux=${p}#${p}`);
      await ready(page);
      const m = await page.evaluate(() => {
        const nav = document.querySelector('header nav');
        const a = nav.querySelector('a[aria-current="page"]');
        const nr = nav.getBoundingClientRect();
        const r = a.getBoundingClientRect();
        const sorts = [...document.querySelectorAll('main select')].filter((s) => s instanceof HTMLElement && s.offsetParent !== null && !s.closest('[role=dialog]'));
        return { active: a.innerText.trim(), visible: r.left >= nr.left - 1 && r.right <= nr.right + 1, sortVisible: sorts.length };
      });
      R.activeTab.push({ width, page: p, ...m });
    }
    await context.close();
  }
});

// ---------- 7. Clash review on a phone: reasons only in tooltips? Shared-build notice visible? ----------
await scenario('clash reasons + shared notice on phones', async () => {
  const build = { cpu: 'Core i5-14600KF|false', mobo: 'asrockb650mhm2' };
  const { context, page } = await open(browser, { width: 360, build });
  await page.goto(`${BASE}/?ux=clash#builder?step=review`);
  await ready(page);
  await sleep(2000);
  R.clashHover = (await hoverOnly(page)).filter((h) => /socket|Socket|ταιριάζ|LGA|AM5/.test(h.title));
  await context.close();
  const link = `${BASE}/#builder?cpu=${encodeURIComponent(build.cpu)}&mobo=${build.mobo}`;
  const phone = await open(browser, { width: 360 });
  await phone.page.goto(link);
  await ready(phone.page);
  await sleep(1500);
  R.sharedNotice360 = await phone.page.evaluate(() => {
    const el = [...document.querySelectorAll('.notice-warn')].find((n) => /σύνδεσμο|from a link/.test(n.textContent ?? ''));
    return { exists: !!el, visible: !!el && el instanceof HTMLElement && el.offsetParent !== null };
  });
  await phone.context.close();
});

// ---------- 8. Storage sidebar: the DRAM filter and its counts ----------
await scenario('storage sidebar', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, 'storage');
  await page.evaluate(() => {
    const aside = document.querySelector('main aside');
    aside.scrollTop = aside.scrollHeight;
  });
  await sleep(300);
  const box = await page.locator('main aside').boundingBox();
  await shot(page, `${OUT}/ux-storage-sidebar-specs-1366-el-light.jpg`, { clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 900 - box.y) } });
  await context.close();
});

// ---------- 9. Text pages at 360 and 1366 (el, light) ----------
await scenario('info pages', async () => {
  for (const width of [1366, 360]) {
    const { context, page } = await open(browser, { width });
    for (const p of INFO_PAGES) {
      await page.goto(`${BASE}/?ux=${p}#${p}`);
      await ready(page);
      await shot(page, `${OUT}/ux-info-${width}-el-light-${p}.jpg`);
    }
    await context.close();
  }
});

// ---------- 10. Unknown address ----------
await scenario('unknown address shot', async () => {
  const { context, page } = await open(browser, { width: 1366 });
  await go(page, '#this-page-does-not-exist');
  R.unknown = { url: page.url(), h1: await page.evaluate(() => document.querySelector('h1')?.innerText), hash: await page.evaluate(() => location.hash) };
  await context.close();
});

await browser.close();
writeFileSync(`${FULL}/extras.json`, JSON.stringify({ base: BASE, errors, ...R }, null, 1));
console.log(`done; ${errors.length} failed scenarios`);
