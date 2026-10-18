// Model addresses (step 4, task 5): /<cat>/<slug> shows the model, an unknown slug says "no longer available" with a
// link to the category, a path that isn't /<cat>/<slug> is still the 404 page. (The "moved" alias case needs an alias
// table entry, which the static build doesn't have: covered in tests/unit/modelAddress.test.ts.)
// Product page (task 6): header (lowest price, shop link, photo) and the shops table (first 20, "Show all N", ⚠ on
// prices older than 24 h).
// Fit with the saved build (task 8): no build, no section; a verdict against a preset build; add / replace without
// leaving the page, then /builder restores the part; graphics cards per offer; a stale saved part refreshed first.
import { expect, test, type Page } from '@playwright/test';

interface Listing {
  url: string;
  price: number;
  shipping?: number | null;
  total?: number | null;
}
interface Entry {
  key: string;
  slug: string;
  chip: string;
  photo: boolean;
  listings: Listing[];
  history: { d: string; min: number; i?: 1 }[];
  dips: string[];
  imported: { low?: number } | string | null;
}

/** The shops table shows this many offers before "Show all N" (lib/offers.FIRST_OFFERS). */
const FIRST = 20;

/** A real model of the build: the first entry (of the first gpu chunk that has one) that `wanted` accepts. */
async function aModel(page: Page, wanted: (m: Entry) => boolean = () => true): Promise<Entry> {
  const { builtAt } = await (await page.request.get('/data/manifest.json')).json();
  for (let n = 0; n < 256; n++) {
    const r = await page.request.get(`/data/gpu/model/${String(n).padStart(3, '0')}.json?v=${builtAt}`);
    const found = Object.values((await r.json()).models as Record<string, Entry>).find(wanted);
    if (found) return found;
  }
  throw new Error('no such gpu model in any chunk');
}

/**
 * The lowest amount the page should show, worked out here from the chunk: price + shipping when the offer's own total
 * is known (data.ownTotal: a total within 2% of price + shipping), else the price.
 */
const lowest = (ls: Listing[]) =>
  Math.min(
    ...ls.map((l) =>
      l.total != null && l.shipping != null && Math.abs(l.total - l.shipping - l.price) <= 0.02 * l.price ? l.price + l.shipping : l.price,
    ),
  );
/** Daily points in the 90 days up to the series' last day, and the days the whole history spans. */
const in90 = (h: Entry['history']) => {
  const last = h.reduce((m, p) => (p.d > m ? p.d : m), '');
  const from = new Date(Date.parse(`${last}T00:00:00Z`) - 89 * 864e5).toISOString().slice(0, 10);
  return h.filter((p) => p.d >= from).length;
};
const spanDays = (h: Entry['history']) => (Date.parse(h[h.length - 1].d) - Date.parse(h[0].d)) / 864e5;
/** The model's all-time low as the page works it out: lowest non-dip daily low, or a strictly lower Skroutz import. */
/** As data.historyLow: Skroutz's undated imported low, else the lowest day (a scraped one wins a tie), Skroutz's when imported. */
const lowOf = (m: Entry): { source: 'own' | 'skroutz'; date: string | null } => {
  const own = m.history
    .filter((p) => !m.dips.includes(p.d))
    .reduce((a, p) => (!a || p.min < a.min || (p.min === a.min && a.i === 1 && p.i !== 1) ? p : a), null as Entry['history'][number] | null);
  const imp = typeof m.imported === 'object' && m.imported ? m.imported.low : undefined;
  if (imp != null && (!own || imp < own.min)) return { source: 'skroutz', date: null };
  return { source: own?.i === 1 ? 'skroutz' : 'own', date: own?.d ?? '' };
};
const euro = (lang: string, n: number) => new Intl.NumberFormat(lang === 'el' ? 'el-GR' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const SHOW_ALL = /^(Δες και τις|Show all) /;
/** "1.234,56 €" (el) / "€1,234.56" (en) → 1234.56: the last "," or "." before two digits is the decimal mark. */
const cents = (text: string) => {
  const digits = text.replace(/[^\d.,]/g, '');
  const m = digits.match(/^(.*)[.,](\d{2})$/);
  return m ? Number(`${m[1].replace(/[.,]/g, '')}.${m[2]}`) : Number(digits.replace(/[.,]/g, ''));
};

// ---- Task 8: fit with the saved build -------------------------------------------------------------------------------
type Fields = Record<string, unknown>;
interface PartEntry extends Entry {
  key: string;
  parts: Record<string, Fields> | null;
  listings: (Listing & { id: string; title: string })[];
}
const manifestBuiltAt = async (page: Page) => ((await (await page.request.get('/data/manifest.json')).json()) as { builtAt: string }).builtAt;
const found = new Map<string, unknown>();
/** The first model entry of `cat` (scanning its 256 chunks) that `wanted` accepts; remembered per name. */
async function anEntry(page: Page, cat: string, name: string, wanted: (m: PartEntry) => boolean): Promise<PartEntry> {
  if (found.has(name)) return found.get(name) as PartEntry;
  const builtAt = await manifestBuiltAt(page);
  for (let n = 0; n < 256; n++) {
    const r = await page.request.get(`/data/${cat}/model/${String(n).padStart(3, '0')}.json?v=${builtAt}`);
    const hit = Object.values((await r.json()).models as Record<string, PartEntry>).find(wanted);
    if (hit) {
      found.set(name, hit);
      return hit;
    }
  }
  throw new Error(`no such ${cat} model`);
}
/** Every compat row of a slot (the builder's usable parts with their engine fields). */
async function compatRows(page: Page, slot: string): Promise<Record<string, Fields>> {
  const key = `compat:${slot}`;
  if (found.has(key)) return found.get(key) as Record<string, Fields>;
  const builtAt = await manifestBuiltAt(page);
  const rows: Record<string, Fields> = {};
  for (let n = 0; n < 64; n++) {
    const r = await page.request.get(`/data/compat/${slot}-${String(n).padStart(2, '0')}.json?v=${builtAt}`);
    Object.assign(rows, (await r.json()).rows);
  }
  found.set(key, rows);
  return rows;
}
/** Opens a light page, stores the build (and the language), then opens `url` in a fresh document (as pick.spec). */
async function withBuild(page: Page, build: object | null, url: string, lang: 'el' | 'en' = 'en') {
  await page.goto('/about');
  await page.evaluate(
    ([b, l]) => {
      localStorage.clear();
      localStorage.setItem('lang', l as string);
      if (b) localStorage.setItem('pcBuild', JSON.stringify(b));
    },
    [build, lang] as const,
  );
  await page.goto(url);
}
const savedBuild = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}') as Record<string, unknown>);
const mmText = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)} mm`;
const AM5_CPU = 'Ryzen 7 7700|true';
const AM5_FIELDS = { chip: 'Ryzen 7 7700', socket: 'AM5', igpu: true, coolerIncluded: true };
/** A case with a stated card limit (in the compat rows: one the builder offers) and a card longer than it. */
async function caseAndLongCard(page: Page) {
  const cases = await compatRows(page, 'case');
  const pc = await anEntry(page, 'case', 'case-with-limit', (m) => {
    const f = m.parts?.[m.key];
    return !!f && typeof f.gpuMaxMm === 'number' && (f.gpuMaxMm as number) < 330 && m.key in cases;
  });
  const max = pc.parts![pc.key].gpuMaxMm as number;
  const [cardKey, card] = Object.entries(await compatRows(page, 'gpu')).find(([, f]) => typeof f.lengthMm === 'number' && (f.lengthMm as number) > max + 5)!;
  return { pc, max, cardKey, card };
}
/** A graphics chip with 3 to 20 offers, every one a card the builder offers. */
async function offeredChip(page: Page) {
  const gpus = await compatRows(page, 'gpu');
  return anEntry(page, 'gpu', 'gpu-3-offered', (m) => m.listings.length >= 3 && m.listings.length <= 20 && m.listings.every((l) => l.id in gpus));
}

for (const [name, size] of [['360', { width: 360, height: 740 }], ['1366', { width: 1366, height: 800 }]] as const) {
  test.describe(`at ${name} px`, () => {
    test.use({ viewport: size });
    const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

    test('a current slug shows the model name', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const m = await aModel(page);
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      await expect(page.locator('nav[aria-label] a[href="/gpu"]').first()).toBeAttached();
      expect(await noOverflow(page)).toBe(true);
      expect(errors).toEqual([]);
    });

    test('the header shows the lowest price and links the cheapest offer; the table lists the offers', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const m = await aModel(page, (x) => x.listings.length >= 3);
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      await expect(page).toHaveTitle(`${m.chip} — BuildDraft.gr`);
      const lang = await page.evaluate(() => document.documentElement.lang);
      const header = page.locator('[data-product-header]');
      await expect(header.locator('[data-lowest]')).toHaveText(euro(lang, lowest(m.listings)));
      const shop = header.getByRole('link', { name: /^(Στο κατάστημα|To the shop)/ });
      const rel = (await shop.getAttribute('rel')) ?? '';
      expect(rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'nofollow']));
      expect(await shop.getAttribute('target')).toBe('_blank');
      expect(m.listings.map((l) => l.url)).toContain(await shop.getAttribute('href'));
      const shown = Math.min(m.listings.length, FIRST);
      await expect(page.locator('[data-offer]')).toHaveCount(shown);
      // The first offer is the header's one: same link.
      expect(await page.locator('[data-offer]').first().getByRole('link').getAttribute('href')).toBe(await shop.getAttribute('href'));
      // Every row adds up: price + shipping = total (to the cent), and a row with unknown shipping has no total.
      const rows = await page.locator('[data-offer]').evaluateAll((els) =>
        els.map((e) => ['price', 'shipping', 'total'].map((c) => e.querySelector(`[data-cell="${c}"]`)!.textContent ?? '')),
      );
      for (const [p, s, t] of rows) {
        if (s.includes('—')) expect(t).toContain('—');
        else expect(Math.round((cents(p) + cents(s)) * 100) / 100).toBe(cents(t));
      }
      expect(rows[0][2].includes('—') ? rows[0][0] : rows[0][2]).toBe(await header.locator('[data-lowest]').textContent());
      if (m.photo) expect(await header.locator('img').getAttribute('loading')).toBe('eager'); // the LCP element
      if (size.width < 1024) {
        await expect(page.locator('table [data-offer]')).toHaveCount(0); // cards on phones
        expect((await shop.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      } else await expect(page.locator('table [data-offer]')).toHaveCount(shown);
      expect(await noOverflow(page)).toBe(true);
      expect(errors).toEqual([]);
    });

    test('a long offer list shows 20, then "Show all N" shows every offer and moves focus to the first new one', async ({ page }) => {
      const m = await aModel(page, (x) => x.listings.length > FIRST);
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      await expect(page.locator('[data-offer]')).toHaveCount(FIRST);
      const more = page.getByRole('button', { name: SHOW_ALL });
      await expect(more).toHaveCount(1);
      await expect(more).toHaveText(new RegExp(`${m.listings.length}$`));
      if (size.width < 1024) expect((await more.boundingBox())!.height).toBeGreaterThanOrEqual(44); // `tap` on touch sizes
      await more.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-offer]')).toHaveCount(m.listings.length);
      await expect(more).toHaveCount(0);
      await expect(page.locator('[data-offer]').nth(FIRST)).toBeFocused();
      expect(await noOverflow(page)).toBe(true);
    });

    test('a one-listing model: one offer, no "Show all"; no photo request when the model has none', async ({ page }) => {
      const img: string[] = [];
      page.on('request', (r) => {
        if (new URL(r.url()).pathname.startsWith('/img/')) img.push(r.url());
      });
      const m = await aModel(page, (x) => x.listings.length === 1 && !x.photo);
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      const header = page.locator('[data-product-header]');
      await expect(header.locator('img')).toHaveCount(0);
      await expect(header.locator('span[aria-hidden="true"] svg').first()).toBeVisible();
      await expect(page.locator('[data-offer]')).toHaveCount(1);
      await expect(page.getByRole('button', { name: SHOW_ALL })).toHaveCount(0);
      expect(img).toEqual([]);
      expect(await noOverflow(page)).toBe(true);
    });

    test('a photo that fails to load shows the category icon', async ({ page }) => {
      await page.route('**/img/**', (r) => r.abort());
      const m = await aModel(page, (x) => x.photo);
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      const header = page.locator('[data-product-header]');
      await expect(header.locator('img')).toHaveCount(0);
      await expect(header.locator('span[aria-hidden="true"] svg').first()).toBeVisible();
    });

    test('prices read more than 24 h ago are marked', async ({ page }) => {
      const m = await aModel(page, (x) => x.listings.length >= 2 && x.listings.length <= FIRST);
      // The chunk as built, with every source last read three days ago.
      const old = new Date(Date.now() - 3 * 86_400_000).toISOString();
      await page.route('**/data/gpu/model/*.json*', async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        for (const s of Object.values(json.sources as Record<string, { updatedAt: string | null }>)) s.updatedAt = old;
        await route.fulfill({ response, json });
      });
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      const rows = page.locator('[data-offer]');
      await expect(rows).toHaveCount(m.listings.length);
      await expect(page.locator('[data-offer] [data-checked="stale"]')).toHaveCount(m.listings.length);
      await expect(rows.first().locator('[data-checked="stale"]')).toContainText(/μπορεί να έχει αλλάξει|may have changed/);
      await expect(rows.first().locator('[data-checked="stale"] svg')).toBeVisible();
      expect(await noOverflow(page)).toBe(true);
    });

    test('price history: the median sentence, and the range buttons change the chart x-axis', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const m = await aModel(page, (x) => in90(x.history) >= 30 && spanDays(x.history) > 200);
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      const section = page.locator('[data-price-history]');
      await expect(section.locator('[data-median]')).toHaveText(/(κάτω από|πάνω από|ίση με) τη διάμεσο 90 ημερών|(below|above|equal to) the 90-day median/);
      const ranges = section.locator('[data-range]');
      await expect(ranges).toHaveCount(4);
      await expect(section.locator('[data-range="90"]')).toHaveAttribute('aria-pressed', 'true'); // default
      if (size.width < 1024) for (const r of await ranges.all()) expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      // The chart's date labels: first one (left edge) per range.
      const firstLabel = async () => section.locator('svg text').filter({ hasText: /^\d\d\/\d\d(\/\d\d)?$/ }).first().textContent();
      await expect(section.locator('svg')).toBeVisible();
      const l90 = await firstLabel();
      await section.locator('[data-range="30"]').click();
      await expect(section.locator('[data-range="30"]')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(firstLabel).not.toBe(l90);
      const l30 = await firstLabel();
      await section.locator('[data-range="all"]').focus();
      await page.keyboard.press('Enter'); // keyboard works
      await expect(section.locator('[data-range="all"]')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(firstLabel).not.toBe(l30);
      expect(await noOverflow(page)).toBe(true);
      expect(errors).toEqual([]);
    });

    test('price history: the low line says where the record comes from; a low outside the drawn range says so', async ({ page }) => {
      const sk = await aModel(page, (x) => spanDays(x.history) > 200 && lowOf(x).source === 'skroutz' && lowOf(x).date === null);
      await page.goto(`/gpu/${sk.slug}`);
      const note = page.locator('[data-price-history] [data-all-time-low]');
      await expect(note).toHaveAttribute('data-all-time-low', 'skroutz', { timeout: 20_000 });
      await expect(note).toHaveText(/στο Skroutz, πριν ξεκινήσουμε την καταγραφή|on Skroutz, before our own tracking began/);
      await page.locator('[data-price-history] [data-range="all"]').click();
      await expect(note).toHaveText(/Skroutz/); // still said under All, whether or not the line is drawn
      const old = await aModel(page, (x) => {
        const l = lowOf(x);
        const last = x.history.reduce((m, p) => (p.d > m ? p.d : m), '');
        const from = new Date(Date.parse(`${last}T00:00:00Z`) - 29 * 864e5).toISOString().slice(0, 10);
        // A dated low (ours, or an imported Skroutz day: in v2's data every graphics card's own scrape is younger than 30
        // days, so this is a Skroutz day) older than the 30-day range.
        return l.date !== null && l.date < from;
      });
      await page.goto(`/gpu/${old.slug}`);
      const note2 = page.locator('[data-price-history] [data-all-time-low]');
      await expect(note2).toHaveAttribute('data-all-time-low', lowOf(old).source, { timeout: 20_000 });
      await page.locator('[data-price-history] [data-range="30"]').click();
      await expect(note2).toHaveText(/before this chart|πριν από αυτό το διάγραμμα/);
    });

    test('price history: a Skroutz low that 3+ models share (import glitch, task 7b) is not shown; an imported low day says Skroutz', async ({ page }) => {
      const m = await aModel(page, (x) => x.key === 'RTX 3050 6GB'); // Skroutz's 115.43, shared by six cards
      const low = lowOf(m);
      await page.goto(`/gpu/${m.slug}`);
      const note = page.locator('[data-price-history] [data-all-time-low]');
      // Its lowest day is an imported Skroutz point (owner, 18/10): Skroutz's, with the day, never "from our 5 shops".
      expect(low).toMatchObject({ source: 'skroutz' });
      expect(low.date).not.toBeNull();
      await expect(note).toHaveAttribute('data-all-time-low', 'skroutz', { timeout: 20_000 });
      const date = low.date!.split('-').reverse().join('/');
      await expect(note).toHaveText(new RegExp(`(στο Skroutz, στις|on Skroutz on) ${date}`));
      await expect(note).not.toHaveText(/115[,.]43|5 (πηγές|shops)/);
    });

    test('price history: a model with little history says so, no sentence', async ({ page }) => {
      const m = await aModel(page, (x) => in90(x.history) < 30);
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      await expect(page.locator('[data-price-history] [data-median]')).toHaveText(/Δεν υπάρχει ακόμα αρκετό ιστορικό|Not enough history yet/);
      expect(await noOverflow(page)).toBe(true);
    });

    test('an unknown slug says no longer available, with a link to the category', async ({ page }) => {
      await page.goto('/gpu/no-such-card-1234gb');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/δεν είναι πια διαθέσιμο|no longer available/, { timeout: 20_000 });
      const link = page.locator('main a[href="/gpu"]').last();
      await expect(link).toBeVisible();
      if (size.width < 1024) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44); // tap targets on touch sizes
      expect(await noOverflow(page)).toBe(true);
      await link.click();
      await expect(page).toHaveURL(/\/gpu$/);
    });

    test('a path that is not /<category>/<slug> is still the 404 page', async ({ page }) => {
      await page.goto('/gpu/a/b');
      await expect(page.getByText('404', { exact: true })).toBeVisible();
      await page.goto('/nonsense/page');
      await expect(page.getByText('404', { exact: true })).toBeVisible();
    });

    test('fit: no saved build, no section and no check; "Add to build" adds at once and stays on the page', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const requests: string[] = [];
      page.on('request', (r) => requests.push(new URL(r.url()).pathname));
      const { pc } = await caseAndLongCard(page);
      await withBuild(page, null, `/case/${pc.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(pc.chip, { timeout: 20_000 });
      const add = page.locator('[data-product-header] [data-fit-header=add]');
      await expect(add).toHaveText('Add to build');
      await expect.poll(() => requests.some((p) => /\/assets\/BuildFit-/.test(p))).toBe(true); // after the first paint
      await expect(page.locator('[data-build-fit]')).toHaveCount(0);
      expect(requests.filter((p) => p.startsWith('/data/compat/') || /pick\.worker|pickCheck/.test(p))).toEqual([]);
      if (size.width < 1024) expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(44);

      await add.click();
      await expect(page).toHaveURL(new RegExp(`/case/${pc.slug}$`)); // stays
      await expect(page.locator('[data-build-fit] [data-in-build]')).toContainText('Added to your build.');
      await expect(page.locator('[data-product-header] [data-fit-header=in-build]')).toHaveText("It's in your build");
      // The focus moves to what replaced the clicked button, and screen readers hear which part was added.
      await expect(page.locator('[data-product-header] [data-fit-header=in-build]')).toBeFocused();
      await expect(page.locator('[data-product-header] [role=status]')).toHaveText(`Added to your build: ${pc.chip}.`);
      const saved = await savedBuild(page);
      expect(saved.case).toBe(pc.key);
      expect((saved.compat as Record<string, unknown>).case).toEqual({ fields: pc.parts![pc.key], builtAt: await manifestBuiltAt(page) });
      expect(await noOverflow(page)).toBe(true);
      expect(errors).toEqual([]);
    });

    test("fit: a case page with a longer card in the build says it doesn't fit, with both lengths, and offers no add", async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const { pc, max, cardKey, card } = await caseAndLongCard(page);
      const builtAt = await manifestBuiltAt(page);
      await withBuild(page, { gpu: cardKey, compat: { gpu: { fields: card, builtAt } } }, `/case/${pc.slug}`);
      const section = page.locator('[data-build-fit]');
      await expect(section.locator('[data-fit=blocked]')).toBeVisible({ timeout: 20_000 });
      await expect(section.locator('[data-fit-status]')).toHaveText(/Checked against your build: 1\spart/);
      await expect(section).toContainText("Doesn't fit");
      await expect(section.locator('[data-finding="6"]').first()).toContainText(
        `The card is ${mmText(card.lengthMm as number)}; the case takes up to ${mmText(max)}.`,
      );
      await expect(section.locator('[data-fit-action]')).toBeDisabled();
      // The header goes to the section (there is a build to check against), it doesn't add.
      await page.locator('[data-product-header] [data-fit-header=add]').click();
      await expect(page.locator('#build-fit-title')).toBeFocused();
      expect((await savedBuild(page)).case).toBeUndefined();
      expect(await noOverflow(page)).toBe(true);
      expect(errors).toEqual([]);
    });

    test('fit: Add on the section saves the part as pick mode does, then /builder restores it', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const { pc } = await caseAndLongCard(page);
      const builtAt = await manifestBuiltAt(page);
      await withBuild(page, { cpu: AM5_CPU, compat: { cpu: { fields: AM5_FIELDS, builtAt } } }, `/case/${pc.slug}`);
      const section = page.locator('[data-build-fit]');
      // A CPU alone: nothing the case's rules check against.
      await expect(section.locator('[data-fit-status]')).toHaveText('Nothing in your build is checked against it.', { timeout: 20_000 });
      await section.locator('[data-fit-action=add]').click();
      await expect(section.locator('[data-in-build]')).toContainText('Added to your build.');
      await expect(section.getByRole('link', { name: 'Open the build' })).toBeFocused();
      const saved = await savedBuild(page);
      expect(saved.cpu).toBe(AM5_CPU);
      expect(saved.case).toBe(pc.key);
      await section.getByRole('link', { name: 'Open the build' }).click();
      await expect(page).toHaveURL(/\/builder/);
      // The builder lists the parts beside the steps from 1024 px (phones: a summary bar, closed).
      if (size.width >= 1024) {
        await expect(page.locator('main').getByText(pc.chip, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
        await page.reload();
        await expect(page.locator('main').getByText(pc.chip, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('main').getByText('Ryzen 7 7700').filter({ visible: true }).first()).toBeVisible();
      }
      expect(Object.keys((await savedBuild(page)).compat as object).sort()).toEqual(['case', 'cpu']);
      expect(errors).toEqual([]);
    });

    test('fit: a graphics card page checks and adds per offer (the card key), replacing the saved card', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const { pc } = await caseAndLongCard(page);
      const gpus = await compatRows(page, 'gpu');
      const chip = await offeredChip(page);
      const other = Object.keys(gpus).find((k) => !chip.listings.some((l) => l.id === k))!;
      const builtAt = await manifestBuiltAt(page);
      const build = {
        case: pc.key,
        gpu: other,
        compat: { case: { fields: pc.parts![pc.key], builtAt }, gpu: { fields: gpus[other], builtAt } },
      };
      await withBuild(page, build, `/gpu/${chip.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(chip.chip, { timeout: 20_000 });
      await expect(page.locator('[data-offer]:visible [data-offer-fit]')).toHaveCount(chip.listings.length);
      await expect(page.locator('[data-offer]:visible [data-offer-fit=checking]')).toHaveCount(0, { timeout: 20_000 });
      // The header points to the offers.
      await page.locator('[data-product-header] [data-fit-header=cards]').click();
      await expect(page.locator('#offers-title')).toBeFocused();
      // The first offer with a working "Replace" (pinned by position: after the click it has none).
      const offers = page.locator('[data-offer]:visible');
      let at = -1;
      for (let i = 0; i < (await offers.count()) && at < 0; i++) if (await offers.nth(i).locator('[data-fit-action=replace]:enabled').count()) at = i;
      expect(at).toBeGreaterThanOrEqual(0);
      const row = offers.nth(at);
      const replace = row.locator('[data-fit-action=replace]');
      if (size.width < 1024) expect((await replace.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await replace.click();
      await expect(row.locator('[data-fit-action]')).toHaveCount(0);
      // The focus stays in the row: its "In build" (table) / "Open the build" (phone card) link.
      await expect(row.locator('a[href="/builder"]')).toBeFocused();
      const saved = await savedBuild(page);
      expect(saved.gpu).toMatch(/^[a-z]+:/); // a listing id: one card, not the chip
      expect(chip.listings.map((l) => l.id)).toContain(saved.gpu);
      expect(saved.case).toBe(pc.key);
      await expect(page.locator('[data-build-fit] [data-in-build]')).toContainText('It took the previous one’s place in your build.');
      expect(await noOverflow(page)).toBe(true);
      expect(errors).toEqual([]);
    });

    test('fit: a saved part from older data is refreshed from its compat chunk first (A7) and saved back', async ({ page }) => {
      const requests: string[] = [];
      page.on('request', (r) => requests.push(new URL(r.url()).pathname));
      const { pc, max } = await caseAndLongCard(page);
      const chip = await offeredChip(page);
      const stale = { ...pc.parts![pc.key], gpuMaxMm: 999 };
      await withBuild(page, { case: pc.key, compat: { case: { fields: stale, builtAt: '2020-01-01T00:00:00.000Z' } } }, `/gpu/${chip.slug}`);
      await expect(page.locator('[data-build-fit] [data-fit-status]')).toHaveText(/Checked against your build: 1\spart/, { timeout: 20_000 });
      expect(requests.some((p) => p.startsWith('/data/compat/case-'))).toBe(true);
      const compat = (await savedBuild(page)).compat as Record<string, { fields: Fields; builtAt: string }>;
      expect(compat.case.builtAt).toBe(await manifestBuiltAt(page));
      expect(compat.case.fields.gpuMaxMm).toBe(max);
    });

    test('fit: a saved part the data no longer has is never checked as "fits": rows and section say so', async ({ page }) => {
      const chip = await offeredChip(page);
      await withBuild(page, { case: 'nosuchcase12345' }, `/gpu/${chip.slug}`);
      const section = page.locator('[data-build-fit]');
      await expect(section.locator('[data-fit-status]')).toHaveText("None of your build's parts could be checked against it.", { timeout: 20_000 });
      await expect(section).toContainText('no longer available');
      await expect(page.locator('[data-offer]:visible [data-offer-fit=unchecked]')).toHaveCount(chip.listings.length);
      await expect(page.locator('[data-offer]:visible [data-offer-fit=fits], [data-offer]:visible [data-offer-fit=alone]')).toHaveCount(0);
    });

    test('fit: a CPU page adds the Box/Tray key of its cheapest offer', async ({ page }) => {
      const cpu = await anEntry(page, 'cpu', 'cpu-desktop', (m) => !!m.parts && Object.keys(m.parts).some((k) => /\|(true|false)$/.test(k)) && /Ryzen|Core/.test(m.chip));
      await withBuild(page, null, `/cpu/${cpu.slug}`);
      const add = page.locator('[data-product-header] [data-fit-header=add]');
      await expect(add).toBeVisible({ timeout: 20_000 });
      await add.click();
      await expect(page.locator('[data-build-fit] [data-in-build]')).toContainText('Added to your build.');
      await expect(page.locator('[data-product-header] [data-fit-header=in-build]')).toBeFocused();
      const saved = await savedBuild(page);
      expect(Object.keys(cpu.parts!)).toContain(saved.cpu);
      expect(saved.cpu).toMatch(/\|(true|false|\?)$/);
    });

    test('fit: a CPU saved as either version of the same chip is "in your build", not "replace it with itself"', async ({ page }) => {
      const both = await anEntry(page, 'cpu', 'cpu-box-and-tray', (m) => {
        const keys = Object.keys(m.parts ?? {});
        return keys.some((k) => k.endsWith('|true')) && keys.some((k) => k.endsWith('|false')) && /Ryzen|Core/.test(m.chip);
      });
      const builtAt = await manifestBuiltAt(page);
      for (const key of Object.keys(both.parts!).filter((k) => /\|(true|false)$/.test(k))) {
        await withBuild(page, { cpu: key, compat: { cpu: { fields: both.parts![key], builtAt } } }, `/cpu/${both.slug}`);
        await expect(page.locator('[data-product-header] [data-fit-header=in-build]')).toHaveText("It's in your build", { timeout: 20_000 });
        const section = page.locator('[data-build-fit]');
        await expect(section.locator('[data-in-build]')).toContainText("It's in your build");
        await expect(section.locator('[data-fit-action]')).toHaveCount(0);
        await expect(section).toContainText(key.endsWith('|true') ? 'Box version (cooler in the box)' : 'Tray version (no cooler)');
      }
    });
  });
}
