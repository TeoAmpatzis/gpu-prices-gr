import { expect, test, type Page } from '@playwright/test';

const rows = '[data-product-key]';
const tray = '[data-compare-tray]';
const add = (page: Page, n: number) => page.locator(`${rows} [data-compare-ref]`).nth(n).click();
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('bdCompare:v1'));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
});

test('add from the list, the tray counts, /compare shows a table, reload keeps it, remove empties it', async ({ page }) => {
  await page.goto('/gpu');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  await add(page, 0);
  await add(page, 1);
  await expect(page.locator(tray)).toContainText('(2)');
  await page.locator('[data-compare-open]').click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
  await expect(page.locator('[data-compare-row="price:price"]')).toBeVisible();
  await expect(page.locator(tray)).toHaveCount(0); // the page itself is the tray here
  await page.reload();
  await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Remove' }).first().click();
  await page.getByRole('button', { name: 'Remove' }).first().click();
  await expect(page.getByText('Nothing to compare yet')).toBeVisible();
  expect(JSON.parse((await stored(page))!).groups).toEqual({});
});

test('a fifth product is refused with a message, nothing is dropped', async ({ page }) => {
  await page.goto('/gpu');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 5; i++) await add(page, i);
  await expect(page.locator('[data-compare-notice]')).toContainText('already has 4');
  expect(JSON.parse((await stored(page))!).groups.gpu).toHaveLength(4);
});

test('the model page has a Compare button that adds the family', async ({ page }) => {
  await page.goto('/gpu');
  const href = await page.locator(`${rows} a[data-product-link]`).first().getAttribute('href');
  await page.goto(href!);
  const button = page.locator('[data-product-header] [data-compare-ref]');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(tray)).toContainText('(1)');
});

test('a share link shows its group and never overwrites the saved one', async ({ page }) => {
  await page.goto('/gpu');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  await add(page, 0);
  await add(page, 1);
  const before = await stored(page);
  const refs = await page.locator(`${rows} [data-compare-ref]`).evaluateAll((els) => els.slice(2, 4).map((e) => e.getAttribute('data-compare-ref')));
  await page.goto(`/compare?v=1&cat=gpu&items=${encodeURIComponent(refs.join(','))}`);
  await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
  await expect(page.getByText('Shared comparison')).toBeVisible();
  expect(await stored(page)).toBe(before);
  await page.goto('/compare?v=1&cat=gpu&items=nonsense');
  await expect(page.getByText('not valid')).toBeVisible();
});

test('the tray is not shown in the PC builder', async ({ page }) => {
  await page.goto('/gpu');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  await add(page, 0);
  await expect(page.locator(tray)).toBeVisible();
  await page.goto('/builder');
  await expect(page.locator(tray)).toHaveCount(0);
});

test('phone: /compare has two columns at a time and no sideways page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/gpu');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 3; i++) await add(page, i);
  await page.locator('[data-compare-open]').click();
  await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('works with blocked storage (this tab only)', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === 'bdCompare:v1') throw new Error('blocked');
      return Object.getPrototypeOf(this).setItem?.call(this, k, v);
    };
  });
  await page.goto('/gpu');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  await add(page, 0);
  await expect(page.locator(tray)).toContainText('(1)');
});
