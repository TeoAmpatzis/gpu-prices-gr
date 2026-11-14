// Mousepads (peripherals). While the category is hidden (registry `visible: false`) only the first test runs: the
// address must not exist. The rest guard the day it is published; they read the built mousepad data.
import { expect, test, type Page } from '@playwright/test';
import { PUBLISHED } from './published';

const published = PUBLISHED.includes('mousepad');
const rows = '[data-product-key]';
const errors = (page: Page): string[] => {
  const list: string[] = [];
  page.on('pageerror', (e) => list.push(e.message));
  return list;
};
const count = async (page: Page) => Number(((await page.locator('main').innerText()).match(/([\d.,]+)\s+(?:products|προϊόντα)/)?.[1] ?? '').replace(/\D/g, ''));
const open = async (page: Page, url: string) => {
  await page.goto(url);
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
};

test('while mousepads are hidden, /mousepad is the 404 page and no menu links to it', async ({ page }) => {
  test.skip(published, 'mousepads are published');
  await page.goto('/mousepad');
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('a[href="/mousepad"]')).toHaveCount(0);
});

test.describe('published mousepads', () => {
  test.skip(!published, 'mousepads are not published yet');

  test('/mousepad lists models with a Compare button on every row, in both languages, without overflow at 360 px', async ({ page }) => {
    const errs = errors(page);
    await open(page, '/mousepad?per=20');
    await expect(page.locator(`${rows} [data-compare-ref]`)).toHaveCount(await page.locator(rows).count());
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/mousepad$/);
    expect(await page.title()).toMatch(/Mouse ?pads|Mousepads|Επιφάνειες|Πατάκια/i);
    await page.setViewportSize({ width: 360, height: 700 });
    await open(page, '/mousepad?per=20&lang=el');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errs).toEqual([]);
  });

  test('size pills and stated-only filters narrow the list and survive a reload and back', async ({ page }) => {
    await open(page, '/mousepad?per=20');
    const all = await count(page);
    await open(page, '/mousepad?size=xxl&per=20');
    const xxl = await count(page);
    await open(page, '/mousepad?size=medium&per=20');
    const medium = await count(page);
    expect(xxl).toBeGreaterThan(0);
    expect(xxl).toBeLessThan(all);
    expect(medium).toBeLessThan(all);
    // A spec filter keeps only the models that state the value: fewer than all, and fewer still with a second filter.
    await open(page, '/mousepad?rgb=yes&per=20');
    const rgb = await count(page);
    expect(rgb).toBeLessThan(all);
    await open(page, '/mousepad?rgb=yes&size=xxl&per=20');
    const narrowed = await count(page);
    expect(narrowed).toBeLessThan(rgb);
    await page.reload();
    await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
    expect(await count(page)).toBe(narrowed);
    await page.goBack();
    await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
    expect(await count(page)).toBe(rgb);
  });

  test('a model page shows its specs, its offers and no PC-builder block', async ({ page }) => {
    const errs = errors(page);
    await open(page, '/mousepad?per=20');
    await page.locator(`${rows} a[data-product-link]`).first().click();
    await expect(page).toHaveURL(/\/mousepad\/[^/?]+/);
    await expect(page.locator('main h1:visible').first()).toBeVisible();
    await expect(page.locator('[data-offer]').first()).toBeVisible();
    await expect(page.locator('[data-fit], [data-build-fit]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/mousepad\/[^/?]+$/);
    expect(errs).toEqual([]);
  });

  test('global search finds a mousepad model, and the PC Builder never offers mousepads', async ({ page }) => {
    await page.goto('/search?q=gigantus');
    await expect(page.locator('a[href^="/mousepad/"]').first()).toBeVisible({ timeout: 20_000 });
    await page.goto('/builder');
    await expect(page.locator('a[href^="/mousepad"]')).toHaveCount(0);
  });
});
