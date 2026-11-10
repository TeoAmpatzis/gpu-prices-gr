// Smoke test of the production preview (`npm run e2e`): every category page shows product rows, the
// builder's two modes show their first step, the text pages render, the home and 404 pages show — all at
// their real addresses (Phase 1), with no uncaught page errors. It checks that pages load, not what they
// say; other tests cover behaviour.
import { expect, test, type Page } from '@playwright/test';

import { REGISTRY } from '../../src/lib/registry';

// The published categories (the registry's `visible`), so a newly launched one is covered without editing this list.
const CATEGORIES = Object.entries(REGISTRY).filter(([, c]) => c.visible).map(([id]) => id);

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** The visible category table (visited categories stay mounted, hidden). */
const rows = (page: Page) => page.locator('main [data-product-key]:visible');

for (const cat of CATEGORIES) {
  test(`/${cat} lists products`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/${cat}`);
    // Desktop width (1280 px) renders the table; each model row's name is a button.
    await expect(rows(page).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('main .skeleton:visible')).toHaveCount(0);
    await expect(page.locator('main [role=alert]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('individual product details open from the list', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/gpu');
  await rows(page).first().waitFor({ timeout: 20_000 });
  await page.locator('main a[data-product-link]:visible').first().click();
  await expect(page.locator('main h1:visible').first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(page).toHaveURL(/source=.+&offer=.+/);
  expect(errors).toEqual([]);
});

test('guided builder shows product cards', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/builder?step=cpu');
  await expect(page.locator('main li.card').first()).toBeVisible({
    timeout: 20_000,
  });
  expect(errors).toEqual([]);
});

test('quick list builder opens a picker', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/builder?mode=quick');
  const choose = page
    .locator('main button')
    .filter({ hasText: /^(Επιλογή|Choose)$/ })
    .first();
  await choose.click({ timeout: 20_000 });
  await expect(page.locator('main li.card').first()).toBeVisible({
    timeout: 10_000,
  });
  expect(errors).toEqual([]);
});

for (const pageId of ['about', 'contact', 'privacy', 'how-prices']) {
  test(`/${pageId} renders`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/${pageId}`);
    await expect(page.locator('main article h2').first()).toBeVisible({
      timeout: 10_000,
    });
    expect(errors).toEqual([]);
  });
}

test('home shows search, PC Builder and the category tiles', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('main input[role=combobox]')).toBeVisible();
  await expect(page.locator('main a[href="/builder"]')).toBeVisible();
  await expect(page.locator('main [data-home-category]')).toHaveCount(9);
  expect(errors).toEqual([]);
});

test('sort control options are readable', async ({ page }) => {
  await page.goto('/gpu');
  const colours = await page.locator('select.catalogue-sort').first().evaluate((select) => {
    const option = select.querySelector('option')!;
    const s = getComputedStyle(option);
    const lum = (css: string) => {
      const [r, g, b] = (css.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map(Number).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [a, b] = [lum(s.backgroundColor), lum(s.color)].sort((x, y) => y - x);
    return { bg: s.backgroundColor, fg: s.color, ratio: (a + 0.05) / (b + 0.05) };
  });
  // Opaque: a transparent option lets the browser paint its own white pop-up behind light text.
  expect(colours.bg).toMatch(/^rgb\(/);
  expect(colours.bg).not.toBe('rgb(255, 255, 255)');
  expect(colours.ratio).toBeGreaterThanOrEqual(4.5);
});

test('product title links are at least 24px tall on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/psu');
  const box = await page.locator('a[data-product-link]:visible').first().boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(24);
});

test('an unknown address shows the 404 page', async ({ page }) => {
  await page.goto('/gpus');
  await expect(page.locator('main h1')).toHaveText(/Η σελίδα δεν βρέθηκε|Page not found/);
  await expect(page).toHaveTitle(/Η σελίδα δεν βρέθηκε|Page not found/);
});

test('a selected product draws its history from a model chunk, never category history.json', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(new URL(r.url()).pathname));
  await page.goto('/gpu');
  await rows(page).first().waitFor({ timeout: 20_000 });
  await page.locator('main a[data-product-link]:visible').first().click();
  await expect(page.locator('main h1:visible').first()).toBeVisible({
    timeout: 10_000,
  });
  await expect.poll(() => requests.some((p) => /^\/data\/gpu\/model\/\d{3}\.json$/.test(p))).toBe(true);
  expect(requests.filter((p) => /\/data\/[a-z]+\/history\.json$/.test(p))).toEqual([]);
});
