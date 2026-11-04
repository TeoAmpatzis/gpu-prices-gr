import { expect, test } from '@playwright/test';

const listings = [
  { id: 'same', source: 'skroutz', title: 'Board AM5 cheaper sibling', url: 'https://example.com/am5', price: 99, shipping: 3, total: 102, merchant: null, chip: 'Board', brand: 'ASUS', socket: 'AM5', memory: 'DDR5', formFactor: 'ATX', chipset: 'B650', shopCount: 1, scrapedAt: '', ramSlots: 4 },
  { id: 'same', source: 'bestprice', title: 'Board AM4 exact selected product with a long descriptive title', url: 'https://example.com/am4', price: 149, shipping: null, total: null, merchant: null, chip: 'Board', brand: 'ASUS', socket: 'AM4', memory: 'DDR4', formFactor: 'ATX', chipset: 'B550', shopCount: 1, scrapedAt: '', ramSlots: 4 },
];

for (const lang of ['en', 'el']) {
  for (const width of [360, 820, 1440]) {
    test(`selected source and family evidence ${lang} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const manifest = await (await page.request.get('/data/manifest.json')).json();
      const entry = { key: 'board', chip: 'Board', slug: 'board', photo: false, listings, history: [], dips: [], imported: null, parts: { board: { socket: 'AM5', memory: 'DDR5' } }, variants: [], variantLabel: null, variantOrder: null, alternatives: [] };
      await page.route(/\/data\/mobo\/model\/\d+\.json/, (route) => route.fulfill({ json: { builtAt: manifest.builtAt, sources: {}, models: { board: entry } } }));
      await page.addInitScript((lang) => { localStorage.clear(); localStorage.setItem('lang', lang); }, lang);
      await page.goto('/mobo/board?source=bestprice&offer=same');
      const header = page.locator('[data-product-header]');
      await expect(header.getByRole('heading', { level: 1 })).toHaveText(listings[1].title);
      await expect(header).toContainText('DDR4');
      await expect(header).not.toContainText('DDR5');
      await expect(header.locator('[data-lowest]')).toContainText('149');
      await expect(header.locator('a[target=_blank]')).toHaveAttribute('href', listings[1].url);
      const source = page.locator('[data-selected-source]');
      await expect(source.locator('[data-offer]')).toHaveCount(1);
      await expect(source).toContainText(listings[1].title);
      const siblings = page.locator('[data-family-listings]');
      await expect(siblings.locator('[data-offer]')).toHaveCount(1);
      await expect(siblings).toContainText(listings[0].title);
      await expect(siblings).not.toContainText(listings[1].title);
      await expect(siblings.locator('a[href*="source=skroutz"]')).toHaveCount(1);
      await expect(page.locator('[data-price-history]')).toContainText(lang === 'en' ? 'Family price history' : 'Ιστορικό τιμών οικογένειας');
      await page.locator('[data-range="30"]').click();
      await expect(page.locator('[data-range="30"]')).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `.superpowers/sdd/2026-11-03-claude-design-website/task4-${lang}-${width}.png`, fullPage: true });
      await siblings.locator('a[href*="source=skroutz"]').click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(listings[0].title);
      await page.goBack();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(listings[1].title);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(listings[1].title);
    });
  }
}
