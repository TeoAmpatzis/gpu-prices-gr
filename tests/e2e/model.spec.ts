// Model addresses (step 4, task 5): /<cat>/<slug> shows the model, an unknown slug says "no longer available" with a
// link to the category, a path that isn't /<cat>/<slug> is still the 404 page. (The "moved" alias case needs an alias
// table entry, which the static build doesn't have: covered in tests/unit/modelAddress.test.ts.)
// Product page (task 6): header (lowest price, shop link, photo) and the shops table (first 20, "Show all N", ⚠ on
// prices older than 24 h).
import { expect, test, type Page } from '@playwright/test';

interface Listing {
  url: string;
  price: number;
  shipping?: number | null;
  total?: number | null;
}
interface Entry {
  slug: string;
  chip: string;
  photo: boolean;
  listings: Listing[];
  history: { d: string; min: number }[];
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
const lowOf = (m: Entry) => {
  const own = m.history.filter((p) => !m.dips.includes(p.d)).reduce((a, p) => (!a || p.min < a.min ? p : a), null as Entry['history'][number] | null);
  const imp = typeof m.imported === 'object' && m.imported ? m.imported.low : undefined;
  return imp != null && (!own || imp < own.min) ? ({ source: 'skroutz' } as const) : { source: 'own', date: own?.d ?? '' };
};
const euro = (lang: string, n: number) => new Intl.NumberFormat(lang === 'el' ? 'el-GR' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const SHOW_ALL = /^(Δες και τις|Show all) /;
/** "1.234,56 €" (el) / "€1,234.56" (en) → 1234.56: the last "," or "." before two digits is the decimal mark. */
const cents = (text: string) => {
  const digits = text.replace(/[^\d.,]/g, '');
  const m = digits.match(/^(.*)[.,](\d{2})$/);
  return m ? Number(`${m[1].replace(/[.,]/g, '')}.${m[2]}`) : Number(digits.replace(/[.,]/g, ''));
};

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
      const sk = await aModel(page, (x) => spanDays(x.history) > 200 && lowOf(x).source === 'skroutz');
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
        return l.source === 'own' && l.date! < from;
      });
      await page.goto(`/gpu/${old.slug}`);
      const note2 = page.locator('[data-price-history] [data-all-time-low]');
      await expect(note2).toHaveAttribute('data-all-time-low', 'own', { timeout: 20_000 });
      await page.locator('[data-price-history] [data-range="30"]').click();
      await expect(note2).toHaveText(/before this chart|πριν από αυτό το διάγραμμα/);
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
  });
}
