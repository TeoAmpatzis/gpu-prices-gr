// Monitors (peripherals): runs only once the category is published (registry `visible`), so it is skipped while
// monitors are hidden and starts guarding the day they launch. Needs monitor data in public/data at build time.
import { expect, test, type Page } from '@playwright/test';
import { PUBLISHED } from './published';

test.skip(!PUBLISHED.includes('monitor'), 'monitors are not published yet');

const rows = '[data-product-key]';
const errors = (page: Page): string[] => {
  const list: string[] = [];
  page.on('pageerror', (e) => list.push(e.message));
  return list;
};

test('/monitor lists monitors with their title-derived specs and a Compare button on every row', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/monitor?per=20');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(`${rows} [data-compare-ref]`)).toHaveCount(await page.locator(rows).count());
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errs).toEqual([]);
});

test('a brand filter in the URL narrows the list and survives a reload', async ({ page }) => {
  await page.goto('/monitor?per=20');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  const all = (await page.locator('main').innerText()).match(/([\d.,]+)\s+products/)?.[1];
  await page.goto('/monitor?brand=samsung&per=20');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  const some = (await page.locator('main').innerText()).match(/([\d.,]+)\s+products/)?.[1];
  expect(Number(some?.replace(/\D/g, ''))).toBeLessThan(Number(all?.replace(/\D/g, '')));
  await page.reload();
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  expect((await page.locator('main').innerText()).match(/([\d.,]+)\s+products/)?.[1]).toBe(some);
});

test('a monitor page opens from the list, shows its spec group and no PC-builder fit block', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/monitor?per=20');
  await page.locator(`${rows} a[data-product-link]`).first().click();
  await expect(page).toHaveURL(/\/monitor\/[^/?]+/);
  await expect(page.locator('main h1:visible').first()).toBeVisible();
  await expect(page.locator('text=Diagonal >> visible=true').first()).toBeVisible();
  await expect(page.locator('[data-fit], [data-build-fit]')).toHaveCount(0);
  expect(errs).toEqual([]);
});

test('compare works for monitors: add two, the table has two columns, a reload keeps them', async ({ page }) => {
  await page.goto('/monitor?per=20');
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
  const add = page.locator(`${rows} [data-compare-ref]`);
  await add.nth(0).click();
  await add.nth(2).click();
  await expect(page.locator('[data-compare-tray]')).toBeVisible();
  await page.locator('[data-compare-open]').click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
  await expect(page.locator('[data-compare-row="price:price"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
});

test('the monitor page is a real address with its own title and canonical', async ({ page }) => {
  await page.goto('/monitor');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/monitor$/);
  expect(await page.title()).toMatch(/Monitor|Οθόν/i);
});
