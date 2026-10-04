// Smoke test of the production preview (`npm run e2e`): every category tab shows product rows, the
// builder's two modes show their first step, and the info pages render — with no uncaught page errors.
// It checks that pages load, not what they say; the v1 audit (docs/audit-v1.md) covers behaviour.
import { expect, test, type Page } from '@playwright/test';

const CATEGORIES = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'];

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

for (const cat of CATEGORIES) {
  test(`#${cat} lists products`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/#${cat}`);
    // Desktop width (1280 px) renders the table; each model row's name is a button.
    await expect(page.locator('main tbody tr button[aria-expanded]').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('main .skeleton')).toHaveCount(0);
    await expect(page.locator('main .notice-danger')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('product details open inside the list', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/#gpu');
  const row = page.locator('main tbody tr button[aria-expanded="false"]').first();
  await row.click();
  await expect(page.locator('main tbody ul a[href]').first()).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('guided builder shows product cards', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/#builder?step=cpu');
  await expect(page.locator('main li.card').first()).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('quick list builder opens a picker', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/#builder?mode=quick');
  const choose = page.locator('main button').filter({ hasText: /^(Επιλογή|Choose)$/ }).first();
  await choose.click({ timeout: 20_000 });
  await expect(page.locator('main ul.max-h-80 li').first()).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

for (const pageId of ['about', 'contact', 'privacy']) {
  test(`#${pageId} renders`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/#${pageId}`);
    await expect(page.locator('main article h2').first()).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });
}
