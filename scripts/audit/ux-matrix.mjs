// UX audit matrix (v2 Phase 0, B4): every page × width × language in the DARK theme (the layout audit,
// scripts/checks/layout-audit.mjs with SHOTS=1, already saves the light theme at every width), as
// viewport JPEGs in docs/audit/ux-full/matrix/, plus the page's sideways overflow.
// Usage: node scripts/audit/ux-matrix.mjs   (BASE_URL overrides http://localhost:4180)
/* global document */
import { writeFileSync, mkdirSync } from 'node:fs';
import { BASE, CATEGORY_PAGES, FULL, INFO_PAGES, launch, open, pageOverflow, ready, shot, sleep } from './ux-lib.mjs';

const PAGES = [...CATEGORY_PAGES, 'builder', 'builder?mode=quick', ...INFO_PAGES];
const WIDTHS = [360, 768, 1366, 1920];
const LANGS = ['el', 'en'];
const THEME = process.env.THEME ?? 'dark';
const dir = `${FULL}/matrix`;
mkdirSync(dir, { recursive: true });

const browser = await launch();
const rows = [];
for (const width of WIDTHS) {
  for (const lang of LANGS) {
    const { context, page } = await open(browser, { width, lang, theme: THEME });
    for (const p of PAGES) {
      // A query string per page forces a full load, like the layout audit.
      await page.goto(`${BASE}/?ux=${encodeURIComponent(p)}#${p}`);
      let ok = true;
      try {
        await ready(page);
        if (p.startsWith('builder?mode=quick')) {
          await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /^(Επιλογή|Choose)$/.test(b.textContent ?? '')));
        }
        await sleep(300);
      } catch {
        ok = false;
      }
      const name = `${width}-${lang}-${THEME}-${p.replace(/[^a-z0-9]+/gi, '_')}`;
      await shot(page, `${dir}/${name}.jpg`);
      rows.push({ width, lang, theme: THEME, page: p, loaded: ok, overflowPx: await pageOverflow(page), title: await page.title() });
      process.stdout.write('.');
    }
    await context.close();
  }
}
await browser.close();
writeFileSync(`${dir}/matrix-${THEME}.json`, JSON.stringify(rows, null, 1));
console.log(`\n${rows.length} views; not loaded: ${rows.filter((r) => !r.loaded).length}; with sideways overflow: ${rows.filter((r) => r.overflowPx > 1).length}`);
